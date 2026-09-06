// Wano XP pricing and capacity — kept here, not scattered through the
// code, since whether this price survives review is still an open
// commercial question (see the implementation brief's "out of scope").
export const WANO_XP_PRICE_PER_SEAT_UGX = 300_000;
export const WANO_XP_SEAT_CAP = 50;
export const WANO_XP_REFUND_CUTOFF_HOURS = 48;

// The convention this codebase uses to mark an event as a Wano XP match
// (vs. a regular event) — events.category === "match". No schema flag
// needed since events already carry a free-text category.
export const MATCH_DAY_CATEGORY = "match";
