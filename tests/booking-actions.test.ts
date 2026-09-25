import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, RedirectError } from "@/test/fake-db";

const fake = vi.hoisted(() => ({}) as { current: ReturnType<typeof import("@/test/fake-db").createFakeDb> });
const notify = vi.hoisted(() => ({ vendor: vi.fn(), traveller: vi.fn() }));

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
}));
vi.mock("@/lib/data/traveller", () => ({
  getTravellerProfileByUserId: vi.fn(async () => ({ id: "traveller-1", displayName: "Amina" })),
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
