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
};
