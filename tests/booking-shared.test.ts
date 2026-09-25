import { describe, expect, it } from "vitest";
import { computeBookingTotals, decodeBookingDraft, encodeBookingDraft, parseBookingDraft } from "@/lib/booking-shared";
import type { ListingItem } from "@/lib/data/listing-items";

const room = { id: "room-1", name: "Deluxe", priceMinor: 200_000 } as ListingItem;

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseBookingDraft", () => {
  it("requires a room selection for a hotel that has rooms", () => {
    expect(parseBookingDraft(form({ visitDate: "2027-01-10" }), "hotel", [room], false)).toEqual({
      error: "Please make a selection before continuing.",
    });
  });

  it("rejects a selection that isn't one of the listing's items", () => {
    const result = parseBookingDraft(form({ visitDate: "2027-01-10", selectedItemId: "gone" }), "hotel", [room], false);
    expect(result).toEqual({ error: "That selection is no longer available." });
  });

  it("requires a date for date-based types", () => {
    expect(parseBookingDraft(form({}), "restaurant", [], false)).toEqual({ error: "Please choose a date." });
    expect(parseBookingDraft(form({ visitDate: "10/01/2027" }), "experience", [], false)).toEqual({
      error: "Please choose a date.",
    });
  });

  it("round-trips a valid draft through the review-screen URL", () => {
    const result = parseBookingDraft(
      form({ visitDate: "2027-01-10", selectedItemId: "room-1", itemQuantity: "2", partySize: "3", occasion: "Birthday" }),
      "hotel",
      [room],
      false,
    );
    if (!("data" in result)) throw new Error(result.error);
    const decoded = decodeBookingDraft(Object.fromEntries(encodeBookingDraft(result.data)));
    expect(decoded).toEqual(result.data);
  });
});

describe("computeBookingTotals", () => {
  it("prices selected items and applies a percent reward", () => {
    const totals = computeBookingTotals({ items: [{ itemId: "room-1", quantity: 2 }] }, [room], null, {
      discountType: "percent",
      discountValue: "10",
    });
    expect(totals.subtotalMinor).toBe(400_000);
    expect(totals.discountMinor).toBe(40_000);
    expect(totals.totalMinor).toBe(360_000);
  });

  it("falls back to the listing price and never goes below zero", () => {
    const totals = computeBookingTotals({ items: [] }, [], 50_000, { discountType: "fixed", discountValue: "80000" });
    expect(totals.subtotalMinor).toBe(50_000);
    expect(totals.totalMinor).toBe(0);
  });
});
