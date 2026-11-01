// Single source of truth for every charity-vendor number/threshold, same
// reasoning as booking-config.ts/rewards-config.ts.

// Bump this whenever the charity vendor agreement's text changes — a
// charity that accepted an older version isn't silently treated as having
// accepted the new one (see charityDetails.agreementVersion).
export const CHARITY_AGREEMENT_VERSION = "2026-10-v1";

// Points a volunteer earns for a verified check-in at a volunteer
// opportunity (see checkInTicketAction's Giving Back hook). 0 = XP/stamp
// only, no points value — the default, since this is about recognition,
// not a paid incentive.
export const GIVING_BACK_BADGE_POINTS = 0;

// A charity's first N self-serve events/volunteer opportunities need an
// admin look before they publish; after that they publish directly, same
// trust-ramp reasoning as every other first-time moderation gate in Wano.
export const CHARITY_FIRST_N_LISTINGS_REQUIRE_REVIEW = 3;

// Quarterly report cadence/enforcement — see
// /api/cron/charity-report-enforcement.
export const CHARITY_REPORT_DUE_DAYS = 21;
export const CHARITY_REPORT_REMINDER_DAYS_BEFORE = 7;
export const CHARITY_REPORT_OVERDUE_DAYS = 14; // past due date: Donate disabled
export const CHARITY_REPORT_SUSPEND_DAYS = 90; // ~1 full quarter past due date: suspended

export const CHARITY_DONATION_PRESET_AMOUNTS_UGX = [5000, 20000, 50000];
