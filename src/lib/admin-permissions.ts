import "server-only";

// The single source of truth for "who can see/do what" across the admin
// area — read by requireAdminPage/requireAdminLevel (the actual
// enforcement, in src/lib/auth.ts) and by navItemsFor (just UI filtering,
// in src/lib/nav-items.ts) so the two can never drift apart.

export type AdminLevel = "support" | "ops" | "super";

const LEVEL_RANK: Record<AdminLevel, number> = { support: 1, ops: 2, super: 3 };

export function levelMeets(level: AdminLevel | null | undefined, minLevel: AdminLevel): boolean {
  if (!level) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

// Keyed by the page's own route for most entries. A few keys aren't a
// route at all — they gate one write action that's stricter than the page
// it lives on (e.g. Members is read-only for "support": the list page is
// "support", but editing a traveller's name needs "ops").
export const ADMIN_MIN_LEVEL = {
  "/admin": "support",
  "/admin/bookings": "support",
  "/admin/travellers": "support",
  "/admin/moderation": "support",
  "travellers:write": "ops",

  "/admin/vendors": "ops",
  "/admin/submissions": "ops",
  "/admin/slots": "ops",
  "/admin/clubs": "ops",
  "/admin/journeys": "ops",
  "/admin/supply-leads": "ops",

  "/admin/promotions": "super",
  "/admin/rewards": "super",
  "/admin/funzone": "super",
  "/admin/match-day": "super",
  "/admin/journal": "super",
  "/admin/influencers": "super",
  "/admin/analytics": "super",
  "/admin/accounts": "super",
  "/admin/action-log": "super",
  // Demo/backfill utilities — not linked from nav, direct-URL only, no
  // reason for anyone but super to touch them.
  "/admin/seed-demo-inventory": "super",
  "/admin/seed-journeys-j1": "super",
  "/admin/seed-milestone-s": "super",
} as const satisfies Record<string, AdminLevel>;

export type AdminPermissionKey = keyof typeof ADMIN_MIN_LEVEL;
