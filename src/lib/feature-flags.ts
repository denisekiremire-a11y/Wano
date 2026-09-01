// AFCON 2027 returns as a club only once this is flipped on — see Milestone
// S section 4.1. Set NEXT_PUBLIC_AFCON_CLUB_ENABLED=true in the environment
// to enable it.
export const AFCON_CLUB_ENABLED = process.env.NEXT_PUBLIC_AFCON_CLUB_ENABLED === "true";

/** The 4 launch club categories (interest keys) — everything else comes off
 * the grid per the milestone brief, replaced by the "Start a club"
 * application form. */
export const LAUNCH_CLUB_CATEGORY_KEYS = ["food", "adventure", "business", "art"] as const;
