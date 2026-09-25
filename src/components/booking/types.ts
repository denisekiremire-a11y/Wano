import type { ListingItem } from "@/lib/data/listing-items";
import type { ListingType } from "@/lib/listing-type";

export type ClaimedRewardRow = {
  userReward: { id: string; expiresAt: Date };
  reward: { title: string; discountType: "percent" | "fixed" | "freebie"; discountValue: string | null };
};

export type BookingFormProps = {
  listingId: string;
  journeyId?: string | null;
  items: ListingItem[];
  itemImageIds: Map<string, string[]>;
  listingType: ListingType;
  preselectedItemId?: string;
  travellerDisplayName: string;
  myClaimedRewards: ClaimedRewardRow[];
  birthdayPerks: { title: string }[];
  hasBirthdaySet: boolean;
  allowsPreorder?: boolean;
  // Set only for an instant-mode listing with upcoming slots — replaces
  // this form's own visitDate/visitTime fields when present (see
  // SlotPicker). null/undefined means "request mode or no slots yet",
  // every type form falls back to its normal free-text date/time inputs.
  slotPicker?: React.ReactNode;
};
