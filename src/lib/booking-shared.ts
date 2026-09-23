import type { ListingItem } from "@/lib/data/listing-items";
import type { ListingType } from "@/lib/listing-type";

export type BookingItemSelection = { itemId: string; quantity: number };

export const bookingActionLabel: Record<ListingType, string> = {
  restaurant: "Reserve table",
  hotel: "Reserve room",
  experience: "Book experience",
  transport: "Book transfer",
  spa_salon: "Book appointment",
  attraction: "Book visit",
  event: "Get tickets",
  rental: "Reserve vehicle",
};

export type BookingDraft = {
  bookingName: string | null;
  visitDate: string | null;
  visitTime: string | null;
  endDate: string | null;
  partySize: number | null;
  childrenCount: number | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  notes: string | null;
  userRewardId: string | null;
  journeyId: string | null;
  details: Record<string, string>;
  items: BookingItemSelection[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function date(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v && DATE_RE.test(v) ? v : null;
}

function time(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v && TIME_RE.test(v) ? v : null;
}

const DETAIL_KEYS = [
  "seatingPreference",
  "occasion",
  "transferType",
  "flightNumber",
  "meetingPoint",
  "language",
  "roomsCount",
  "luggage",
  "returnTime",
  "pickupOption",
] as const;

function parseItems(formData: FormData, type: ListingType, allowsPreorder: boolean): BookingItemSelection[] {
  if (type === "restaurant") {
    if (!allowsPreorder) return [];
    return formData
      .getAll("preorderItemIds")
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .map((itemId) => ({
        itemId,
        quantity: Math.max(1, num(formData, `qty_${itemId}`) ?? 1),
      }));
  }
  const selectedItemId = str(formData, "selectedItemId");
  if (!selectedItemId) return [];
  return [{ itemId: selectedItemId, quantity: Math.max(1, num(formData, "itemQuantity") ?? 1) }];
}

/** Parses the fields every type-specific booking form might submit, and
 * applies the one validation rule that actually differs by type: whether an
 * item selection (room/vehicle/service/ticket/package) is required. */
export function parseBookingDraft(
  formData: FormData,
  type: ListingType,
  listingItems: ListingItem[],
  allowsPreorder: boolean,
): { data: BookingDraft } | { error: string } {
  const items = parseItems(formData, type, allowsPreorder);

  const requiresItem = ["hotel", "transport", "rental", "spa_salon", "event"].includes(type) && listingItems.length > 0;
  if (requiresItem && items.length === 0) {
    return { error: "Please make a selection before continuing." };
  }
  for (const sel of items) {
    if (!listingItems.some((i) => i.id === sel.itemId)) {
      return { error: "That selection is no longer available." };
    }
  }

  if (type !== "event" && type !== "rental" && !date(formData, "visitDate")) {
    return { error: "Please choose a date." };
  }

  const details: Record<string, string> = {};
  for (const key of DETAIL_KEYS) {
    const v = str(formData, key);
    if (v) details[key] = v;
  }

  return {
    data: {
      bookingName: str(formData, "bookingName"),
      visitDate: date(formData, "visitDate"),
      visitTime: time(formData, "visitTime"),
      endDate: date(formData, "endDate"),
      partySize: num(formData, "partySize"),
      childrenCount: num(formData, "childrenCount"),
      pickupLocation: str(formData, "pickupLocation"),
      dropoffLocation: str(formData, "dropoffLocation"),
      notes: str(formData, "notes"),
      userRewardId: str(formData, "userRewardId"),
      journeyId: str(formData, "journeyId"),
      details,
      items,
    },
  };
}

/** A standalone event's booking form is looser than a listing's: no date
 * to collect (the event has a fixed startAt), and ticket-tier selection is
 * an optional add-on rather than a requirement — party size, a name, and
 * notes are the only things every event needs from a booker. Kept separate
 * from parseBookingDraft since the "event" *listing* type (a vendor's own
 * ticketed product line) still requires a tier selection. */
export function parseEventBookingDraft(
  formData: FormData,
  eventItems: ListingItem[],
): { data: BookingDraft } | { error: string } {
  const selectedItemId = str(formData, "selectedItemId");
  const items: BookingItemSelection[] = selectedItemId
    ? [{ itemId: selectedItemId, quantity: Math.max(1, num(formData, "itemQuantity") ?? 1) }]
    : [];
  for (const sel of items) {
    if (!eventItems.some((i) => i.id === sel.itemId)) {
      return { error: "That ticket type is no longer available." };
    }
  }

  return {
    data: {
      bookingName: str(formData, "bookingName"),
      visitDate: null,
      visitTime: null,
      endDate: null,
      partySize: num(formData, "partySize"),
      childrenCount: num(formData, "childrenCount"),
      pickupLocation: null,
      dropoffLocation: null,
      notes: str(formData, "notes"),
      userRewardId: str(formData, "userRewardId"),
      journeyId: null,
      details: {},
      items,
    },
  };
}

export function encodeBookingDraft(draft: BookingDraft): URLSearchParams {
  const p = new URLSearchParams();
  p.set("tab", "review");
  if (draft.bookingName) p.set("bookingName", draft.bookingName);
  if (draft.visitDate) p.set("visitDate", draft.visitDate);
  if (draft.visitTime) p.set("visitTime", draft.visitTime);
  if (draft.endDate) p.set("endDate", draft.endDate);
  if (draft.partySize != null) p.set("partySize", String(draft.partySize));
  if (draft.childrenCount != null) p.set("childrenCount", String(draft.childrenCount));
  if (draft.pickupLocation) p.set("pickupLocation", draft.pickupLocation);
  if (draft.dropoffLocation) p.set("dropoffLocation", draft.dropoffLocation);
  if (draft.notes) p.set("notes", draft.notes);
  if (draft.userRewardId) p.set("userRewardId", draft.userRewardId);
  if (draft.journeyId) p.set("journeyId", draft.journeyId);
  if (Object.keys(draft.details).length > 0) p.set("details", JSON.stringify(draft.details));
  if (draft.items.length > 0) {
    p.set("items", draft.items.map((i) => `${i.itemId}:${i.quantity}`).join(","));
  }
  return p;
}

export function decodeBookingDraft(sp: Record<string, string | undefined>): BookingDraft {
  let details: Record<string, string> = {};
  if (sp.details) {
    try {
      details = JSON.parse(sp.details);
    } catch {
      details = {};
    }
  }
  const items: BookingItemSelection[] = sp.items
    ? sp.items
        .split(",")
        .map((pair) => {
          const [itemId, qty] = pair.split(":");
          return { itemId, quantity: Math.max(1, Number(qty) || 1) };
        })
        .filter((i) => i.itemId)
    : [];

  return {
    bookingName: sp.bookingName ?? null,
    visitDate: sp.visitDate ?? null,
    visitTime: sp.visitTime ?? null,
    endDate: sp.endDate ?? null,
    partySize: sp.partySize ? Number(sp.partySize) : null,
    childrenCount: sp.childrenCount ? Number(sp.childrenCount) : null,
    pickupLocation: sp.pickupLocation ?? null,
    dropoffLocation: sp.dropoffLocation ?? null,
    notes: sp.notes ?? null,
    userRewardId: sp.userRewardId ?? null,
    journeyId: sp.journeyId ?? null,
    details,
    items,
  };
}

function discountMinorFor(
  subtotalMinor: number,
  discountType: "percent" | "fixed" | "freebie",
  discountValue: string | null,
) {
  if (discountType === "freebie") return 0;
  const value = discountValue ? Number.parseFloat(discountValue) : 0;
  if (discountType === "percent") return Math.round((subtotalMinor * value) / 100);
  return Math.round(value);
}

export function computeBookingTotals(
  draft: Pick<BookingDraft, "items">,
  listingItems: ListingItem[],
  fallbackPriceMinor: number | null,
  reward?: { discountType: "percent" | "fixed" | "freebie"; discountValue: string | null } | null,
) {
  let subtotalMinor = 0;
  let hasPricedSelection = false;
  const lineItems = draft.items.map((sel) => {
    const item = listingItems.find((i) => i.id === sel.itemId);
    if (item?.priceMinor != null) {
      subtotalMinor += item.priceMinor * sel.quantity;
      hasPricedSelection = true;
    }
    return { item, quantity: sel.quantity };
  });
  if (!hasPricedSelection && fallbackPriceMinor != null) {
    subtotalMinor = fallbackPriceMinor;
  }
  const discountMinor = reward ? discountMinorFor(subtotalMinor, reward.discountType, reward.discountValue) : 0;
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  return { subtotalMinor, discountMinor, totalMinor, lineItems };
}
