import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, RedirectError } from "@/test/fake-db";

const fake = vi.hoisted(() => ({}) as { current: ReturnType<typeof import("@/test/fake-db").createFakeDb> });
const notify = vi.hoisted(() => ({
  vendor: vi.fn(),
  traveller: vi.fn(),
  vendorInstant: vi.fn(),
  travellerStatus: vi.fn(),
}));
const slotBooking = vi.hoisted(() => ({
  reserveSlotHold: vi.fn(),
  confirmHeldBookingWithoutPayment: vi.fn(),
  releaseHeldBooking: vi.fn(),
  cancelBooking: vi.fn(),
}));
const flutterwave = vi.hoisted(() => ({ createFlutterwavePayment: vi.fn() }));

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
vi.mock("@/lib/analytics", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/booking-notifications", () => ({
  notifyVendorOfNewBooking: notify.vendor,
  notifyTravellerOfNewBooking: notify.traveller,
  notifyVendorOfInstantBooking: notify.vendorInstant,
  notifyTravellerOfBookingStatus: notify.travellerStatus,
}));
vi.mock("@/lib/data/traveller", () => ({
  getTravellerProfileByUserId: vi.fn(async () => ({ id: "traveller-1", displayName: "Amina" })),
}));
vi.mock("@/lib/slot-booking", () => slotBooking);
vi.mock("@/lib/flutterwave", async (importOriginal) => ({
  // isFlutterwaveConfigured/missingFlutterwaveEnv stay real so tests drive them via env vars.
  ...(await importOriginal<typeof import("@/lib/flutterwave")>()),
  ...flutterwave,
}));

import { bookListingFormAction } from "@/lib/actions/booking-actions";

const listing = { id: "listing-1", active: true, type: "restaurant", priceMinor: 30_000 };

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function redirectOf(promise: Promise<unknown>) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(err instanceof RedirectError)) throw err ?? new Error("expected a redirect");
  return err.url;
}

describe("bookListingFormAction (request-to-book)", () => {
  beforeEach(() => {
    fake.current = createFakeDb();
    notify.vendor.mockReset();
    notify.traveller.mockReset();
  });

  it("creates a pending booking for the partner to confirm and notifies both sides", async () => {
    fake.current.queue("select", [listing]); // listing lookup
    fake.current.queue("select", []); // listing items

    const url = await redirectOf(
      bookListingFormAction(form({ listingId: "listing-1", visitDate: "2027-01-10", partySize: "4", notes: "Window seat" })),
    );

    expect(fake.current.inserted).toHaveLength(1);
    const values = fake.current.inserted[0].values as Record<string, unknown>;
    expect(values).toMatchObject({
      travellerId: "traveller-1",
      listingId: "listing-1",
      status: "pending",
      visitDate: "2027-01-10",
      partySize: 4,
      bookingName: "Amina",
      subtotalMinor: 30_000,
      totalMinor: 30_000,
    });
    expect(values.bookingRef).toMatch(/^PAM-[A-Z0-9]{6}$/);
    expect(url).toBe(`/bookings/${values.bookingRef}`);
    expect(notify.vendor).toHaveBeenCalledOnce();
    expect(notify.traveller).toHaveBeenCalledOnce();
  });

  it("refuses to book an inactive listing", async () => {
    fake.current.queue("select", [{ ...listing, active: false }]);
    await expect(bookListingFormAction(form({ listingId: "listing-1" }))).rejects.toThrow("This listing is not available.");
    expect(fake.current.inserted).toHaveLength(0);
    expect(notify.vendor).not.toHaveBeenCalled();
  });
});

const instantListing = { id: "listing-2", active: true, type: "restaurant", priceMinor: 30_000, bookingMode: "instant" };

function instantForm() {
  return form({ listingId: "listing-2", slotId: "slot-1", partySize: "2" });
}

describe("bookListingFormAction (instant mode, paid)", () => {
  beforeEach(() => {
    fake.current = createFakeDb();
    for (const fn of [...Object.values(notify), ...Object.values(slotBooking), ...Object.values(flutterwave)]) fn.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refuses a paid instant booking outside local dev when Flutterwave isn't configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "");
    vi.stubEnv("FLUTTERWAVE_WEBHOOK_SECRET_HASH", "");
    fake.current.queue("select", [instantListing]); // listing lookup
    fake.current.queue("select", []); // listing items

    await expect(bookListingFormAction(instantForm())).rejects.toThrow(
      "Paid bookings aren't available right now — please try again later.",
    );
    expect(slotBooking.reserveSlotHold).not.toHaveBeenCalled();
  });

  it("confirms instantly with no payment when Flutterwave isn't configured (local dev)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "");
    fake.current.queue("select", [instantListing]);
    fake.current.queue("select", []);
    slotBooking.reserveSlotHold.mockResolvedValue({
      booking: { id: "booking-1", bookingRef: "PAM-ABC123", totalMinor: 30_000 },
    });

    const url = await redirectOf(bookListingFormAction(instantForm()));

    expect(url).toBe("/bookings/PAM-ABC123");
    expect(slotBooking.confirmHeldBookingWithoutPayment).toHaveBeenCalledWith("booking-1");
    expect(flutterwave.createFlutterwavePayment).not.toHaveBeenCalled();
    expect(notify.vendorInstant).toHaveBeenCalledOnce();
    expect(notify.travellerStatus).toHaveBeenCalledWith("booking-1", "confirmed");
  });

  it("sends the traveller to checkout when Flutterwave is configured", async () => {
    vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "FLWSECK_TEST-123");
    vi.stubEnv("FLUTTERWAVE_WEBHOOK_SECRET_HASH", "test-webhook-hash");
    fake.current.queue("select", [instantListing]);
    fake.current.queue("select", []);
    slotBooking.reserveSlotHold.mockResolvedValue({
      booking: { id: "booking-2", bookingRef: "PAM-DEF456", totalMinor: 30_000 },
    });
    flutterwave.createFlutterwavePayment.mockResolvedValue("https://checkout.flutterwave.test/pay/xyz");

    const err = await bookListingFormAction(instantForm()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RedirectError);
    expect((err as RedirectError).url).toBe("https://checkout.flutterwave.test/pay/xyz");
    expect(slotBooking.confirmHeldBookingWithoutPayment).not.toHaveBeenCalled();
  });
});
