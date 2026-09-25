import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, RedirectError } from "@/test/fake-db";

const fake = vi.hoisted(() => ({}) as { current: ReturnType<typeof import("@/test/fake-db").createFakeDb> });
const flutterwave = vi.hoisted(() => ({
  createFlutterwavePayment: vi.fn(),
  verifyFlutterwaveTransaction: vi.fn(),
  refundFlutterwaveTransaction: vi.fn(),
}));
const notify = vi.hoisted(() => ({ notifyUser: vi.fn(), notifyAdmin: vi.fn() }));

vi.mock("@/db", () => ({
  get db() {
    return fake.current.db;
  },
}));
vi.mock("next/navigation", async () => {
  const { RedirectError } = await import("@/test/fake-db");
  return {
    redirect: (url: string) => {
      throw new RedirectError(url);
    },
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => ({ userId: "user-1", role: "traveller", email: "amina@example.com" })),
}));
vi.mock("@/lib/flutterwave", async (importOriginal) => ({
  // isFlutterwaveConfigured stays real so tests drive it via the env var.
  ...(await importOriginal<typeof import("@/lib/flutterwave")>()),
  ...flutterwave,
}));
vi.mock("@/lib/notify", () => notify);
vi.mock("@/lib/actions/reward-actions", () => ({ mintUserReward: vi.fn() }));
vi.mock("@/lib/data/xp", () => ({
  getMatchById: vi.fn(async (id: string) => ({
    id,
    title: "Uganda vs Kenya",
    startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })),
}));
vi.mock("@/lib/data/traveller", () => ({
  getTravellerProfileByUserId: vi.fn(async () => ({ id: "traveller-1", displayName: "Amina" })),
  getTravellerProfileById: vi.fn(),
}));

import { confirmXpPayment, createXpBookingAction } from "@/lib/actions/xp-actions";
import { WANO_XP_PRICE_PER_SEAT_UGX, WANO_XP_SEAT_CAP } from "@/lib/xp-config";

const MATCH_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

function seatsForm(seats: number) {
  const fd = new FormData();
  fd.set("matchId", MATCH_ID);
  fd.set("seats", String(seats));
  return fd;
}

beforeEach(() => {
  fake.current = createFakeDb();
  for (const fn of [...Object.values(flutterwave), ...Object.values(notify)]) fn.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createXpBookingAction", () => {
  it("confirms instantly with no payment when Flutterwave isn't configured (local dev)", async () => {
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "");
    fake.current.queue("select", []); // no seats taken yet

    const result = await createXpBookingAction({}, seatsForm(2));

    expect(result).toEqual({});
    expect(fake.current.inserted[0].values).toMatchObject({
      travellerId: "traveller-1",
      matchId: MATCH_ID,
      seats: 2,
      amountUgx: 2 * WANO_XP_PRICE_PER_SEAT_UGX,
      status: "confirmed",
    });
    expect(flutterwave.createFlutterwavePayment).not.toHaveBeenCalled();
    expect(notify.notifyUser).toHaveBeenCalledOnce();
  });

  it("holds the booking as pending and sends the traveller to checkout when Flutterwave is configured", async () => {
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "FLWSECK_TEST-123");
    fake.current.queue("select", []);
    fake.current.queue("insert", [{ id: "xp-booking-1" }]);
    flutterwave.createFlutterwavePayment.mockResolvedValue("https://checkout.flutterwave.test/pay/abc");

    const err = await createXpBookingAction({}, seatsForm(3)).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RedirectError);
    expect((err as RedirectError).url).toBe("https://checkout.flutterwave.test/pay/abc");
    expect(fake.current.inserted[0].values).toMatchObject({ status: "pending", seats: 3 });
    expect(flutterwave.createFlutterwavePayment).toHaveBeenCalledWith(
      expect.objectContaining({ txRef: "xp-booking-1", amountUgx: 3 * WANO_XP_PRICE_PER_SEAT_UGX }),
    );
    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it("deletes the pending booking if checkout can't be started", async () => {
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "FLWSECK_TEST-123");
    fake.current.queue("select", []);
    fake.current.queue("insert", [{ id: "xp-booking-1" }]);
    flutterwave.createFlutterwavePayment.mockRejectedValue(new Error("Flutterwave down"));

    const result = await createXpBookingAction({}, seatsForm(1));

    expect(result).toEqual({ error: "Couldn't start payment — try again." });
    expect(fake.current.deleted).toHaveLength(1);
  });

  it("refuses more seats than remain", async () => {
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "");
    fake.current.queue("select", [{ seats: WANO_XP_SEAT_CAP - 1 }]);

    const result = await createXpBookingAction({}, seatsForm(2));

    expect(result).toEqual({ error: "Only 1 seat(s) left." });
    expect(fake.current.inserted).toHaveLength(0);
  });
});

describe("confirmXpPayment", () => {
  const pending = { id: "xp-booking-1", status: "pending", amountUgx: 100_000, matchId: MATCH_ID, seats: 2, travellerId: "traveller-1" };
  const verified = { id: "987654", txRef: "xp-booking-1", amount: 100_000, currency: "UGX", status: "successful" };

  it("confirms a pending booking once Flutterwave verifies the payment", async () => {
    fake.current.queue("select", [pending]);
    fake.current.queue("update", [{ ...pending, status: "confirmed" }]);
    fake.current.queue("select", [{ displayName: "Amina", email: "amina@example.com" }]);
    flutterwave.verifyFlutterwaveTransaction.mockResolvedValue(verified);

    await confirmXpPayment("xp-booking-1", "987654");

    expect(flutterwave.verifyFlutterwaveTransaction).toHaveBeenCalledWith("987654");
    expect(fake.current.updated[0].set).toEqual({ status: "confirmed", paymentRef: "987654" });
    expect(notify.notifyUser).toHaveBeenCalledOnce();
  });

  it.each([
    ["an underpayment", { amount: 50_000 }],
    ["another booking's tx_ref", { txRef: "someone-else" }],
    ["the wrong currency", { currency: "USD" }],
    ["a failed charge", { status: "failed" }],
  ])("does not confirm on %s", async (_label, override) => {
    fake.current.queue("select", [pending]);
    flutterwave.verifyFlutterwaveTransaction.mockResolvedValue({ ...verified, ...override });

    await confirmXpPayment("xp-booking-1", "987654");

    expect(fake.current.updated).toHaveLength(0);
    expect(notify.notifyUser).not.toHaveBeenCalled();
  });

  it("is a no-op for a booking that is already confirmed (webhook and redirect both fire)", async () => {
    fake.current.queue("select", [{ ...pending, status: "confirmed" }]);

    await confirmXpPayment("xp-booking-1", "987654");

    expect(flutterwave.verifyFlutterwaveTransaction).not.toHaveBeenCalled();
    expect(fake.current.updated).toHaveLength(0);
  });
});
