// AFCON 2027 returns as a club only once this is flipped on — see Milestone
// S section 4.1. Set NEXT_PUBLIC_AFCON_CLUB_ENABLED=true in the environment
// to enable it.
export const AFCON_CLUB_ENABLED = process.env.NEXT_PUBLIC_AFCON_CLUB_ENABLED === "true";

// Part B kill switch for the paid-bookings pilot — commission, points on
// paid bookings, and points-spend-on-booking all stay fully inert (same
// as before this pilot existed) unless this is true AND the specific
// vendor has opted in (vendorProfiles.paidBookingsPilot). Every booking
// stays request-to-book and pay-at-venue regardless of this flag — it
// only ever changes what happens once a booking is paid and completed,
// never whether a booking requires online payment.
export const PAID_BOOKINGS_ENABLED = process.env.NEXT_PUBLIC_PAID_BOOKINGS_ENABLED === "true";

/** The 4 launch club categories (interest keys) — everything else comes off
 * the grid per the milestone brief, replaced by the "Start a club"
 * application form. */
export const LAUNCH_CLUB_CATEGORY_KEYS = ["food", "adventure", "business", "art"] as const;
