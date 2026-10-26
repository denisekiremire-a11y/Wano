import type { listingTypeEnum } from "@/db/schema";
import { POINT_VALUE_MINOR, TIER_THRESHOLDS } from "@/lib/data/points";

type ListingType = (typeof listingTypeEnum.enumValues)[number];

// Single source of truth for every rewards/commission number the Wano
// additions plan specifies. POINT_VALUE_UGX and TIER_THRESHOLDS are
// re-exported from points.ts (their canonical owner) rather than
// redefined here, to avoid a circular import and keep one literal each.
export const POINT_VALUE_UGX = POINT_VALUE_MINOR;
export { TIER_THRESHOLDS };

// Referral: 150 points to the referrer, 50 welcome points to the new
// user, both paid only once the new user's first booking completes (see
// awardReferralCreditOnFirstBooking in data/traveller.ts).
export const REFERRAL_POINTS = 150;
export const WELCOME_POINTS = 50;

// XP awarded for each completed booking (live-counted, not ledger-backed
// — see getXpEarnedLast12Months in data/rewards.ts, same style as every
// other XP source).
export const BOOKING_COMPLETION_XP = 100;

// XP for each Daily Drop voucher used at the venue (live-counted the same
// way, from redeemed user_rewards whose reward is a Drop).
export const DROP_REDEMPTION_XP = 50;

// Commission per listing type. Used only by Part B (paid bookings, behind
// NEXT_PUBLIC_PAID_BOOKINGS_ENABLED) — 0 while every booking is pay-at-venue.
// Events charge no commission but a 5% customer-paid booking fee instead.
export const COMMISSION_BY_LISTING_TYPE: Record<ListingType, number> = {
  experience: 0.12,
  attraction: 0.12,
  hotel: 0.1,
  spa_salon: 0.1,
  transport: 0.1,
  rental: 0.1,
  event: 0,
  restaurant: 0,
};
export const EVENT_BOOKING_FEE_PCT = 0.05;

// Points earned back per UGX of cash paid, by listing type. Used only by
// Part B. NOTE: these rates still need final business approval before the
// pilot goes live — treat as provisional.
export const EARN_RATE_BY_LISTING_TYPE: Record<ListingType, number> = {
  experience: 0.04,
  attraction: 0.04,
  hotel: 0.03,
  spa_salon: 0.03,
  transport: 0.03,
  rental: 0.03,
  event: 0.01,
  restaurant: 0,
};

// Rewards liability (UGX value of unspent points) as a share of
// commission revenue — the admin reserve report warns above this.
export const REWARDS_SHARE_GUARDRAIL = 0.35;

// Passport XP for each neighbourhood stamp (first verified visit in an
// area, see src/lib/areas.ts).
export const AREA_STAMP_XP = 100;
