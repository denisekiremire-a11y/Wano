import { ADMIN_MIN_LEVEL, levelMeets, type AdminLevel } from "@/lib/admin-permissions";
import type { SessionPayload } from "@/lib/session";

export type NavItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "compass"
    | "stamp"
    | "tag"
    | "flag"
    | "grid"
    | "heart"
    | "megaphone"
    | "chart"
    | "users"
    | "gauge"
    | "file"
    | "calendar"
    | "chat"
    | "mail"
    | "user"
    | "ticket"
    | "trophy"
    | "map";
  /** Extra pathname prefixes (besides `href` itself) that should also
   * count as "on this tab" for active-link highlighting — for pages that
   * keep their own route rather than living under `href` (e.g. Messages,
   * folded into the Social tab but still served from /messages). */
  matchPrefixes?: string[];
};

// Exactly 5 tabs, identical for every traveller and guest — Discover,
// Journeys, Verified, Saved, Messages, and (for guests) Contact all fold
// into these 5 rather than getting their own tab; see each route's
// `redirect()` and the Social/Passport pages for where their content
// actually lives now.
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/explore", label: "Explore", icon: "compass" },
  { href: "/events", label: "Events", icon: "calendar" },
  { href: "/afcon", label: "AFCON 27", icon: "trophy" },
  { href: "/social", label: "Social", icon: "chat", matchPrefixes: ["/messages"] },
  { href: "/passport", label: "Passport", icon: "stamp" },
];

const ADMIN_NAV_ITEMS: (NavItem & { minLevelKey: keyof typeof ADMIN_MIN_LEVEL })[] = [
  { href: "/admin", label: "Overview", icon: "gauge", minLevelKey: "/admin" },
  { href: "/admin/vendors", label: "Vendors", icon: "users", minLevelKey: "/admin/vendors" },
  { href: "/admin/submissions", label: "Submissions", icon: "mail", minLevelKey: "/admin/submissions" },
  { href: "/admin/bookings", label: "Bookings", icon: "ticket", minLevelKey: "/admin/bookings" },
  { href: "/admin/slots", label: "Slots", icon: "calendar", minLevelKey: "/admin/slots" },
  { href: "/admin/travellers", label: "Members", icon: "grid", minLevelKey: "/admin/travellers" },
  {
    href: "/admin/rewards",
    label: "Rewards",
    icon: "ticket",
    minLevelKey: "/admin/rewards",
    matchPrefixes: ["/admin/promotions"],
  },
  { href: "/admin/funzone", label: "Fun Zone", icon: "megaphone", minLevelKey: "/admin/funzone" },
  { href: "/admin/match-day", label: "Match Day", icon: "calendar", minLevelKey: "/admin/match-day" },
  { href: "/admin/clubs", label: "Clubs", icon: "chat", minLevelKey: "/admin/clubs" },
  { href: "/admin/journal", label: "Journal", icon: "file", minLevelKey: "/admin/journal" },
  { href: "/admin/moderation", label: "Moderation", icon: "flag", minLevelKey: "/admin/moderation" },
  { href: "/admin/influencers", label: "Influencers", icon: "trophy", minLevelKey: "/admin/influencers" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart", minLevelKey: "/admin/analytics" },
  { href: "/admin/accounts", label: "Accounts", icon: "user", minLevelKey: "/admin/accounts" },
  { href: "/admin/action-log", label: "Action log", icon: "file", minLevelKey: "/admin/action-log" },
];

// Admin's flat list (16 sections) doesn't fit a desktop header — grouped
// into 5 categories plus a standalone Overview link, each a dropdown that
// leads to its members. The mobile bottom nav keeps the flat list (see
// mobileNavItemsFor / bottom-nav.tsx) since a horizontally-scrollable
// strip already works fine there and doesn't need this collapsing.
const ADMIN_GROUPS: { label: string; hrefs: string[] }[] = [
  { label: "Partners", hrefs: ["/admin/vendors", "/admin/submissions"] },
  { label: "Bookings", hrefs: ["/admin/bookings", "/admin/slots", "/admin/match-day"] },
  {
    label: "Community",
    hrefs: ["/admin/travellers", "/admin/clubs", "/admin/moderation", "/admin/influencers"],
  },
  { label: "Marketing", hrefs: ["/admin/rewards", "/admin/funzone", "/admin/journal"] },
  { label: "System", hrefs: ["/admin/analytics", "/admin/accounts", "/admin/action-log"] },
];

export type AdminNavGroup = { label: string; items: NavItem[] };

export function adminNavGroupsFor(
  adminLevel?: AdminLevel | null,
): { overview: NavItem | null; groups: AdminNavGroup[] } {
  const visible = ADMIN_NAV_ITEMS.filter(({ minLevelKey }) => levelMeets(adminLevel, ADMIN_MIN_LEVEL[minLevelKey])).map(
    ({ href, label, icon, matchPrefixes }) => ({ href, label, icon, matchPrefixes }),
  );
  const byHref = new Map(visible.map((item) => [item.href, item]));
  const overview = byHref.get("/admin") ?? null;
  const groups = ADMIN_GROUPS.map(({ label, hrefs }) => ({
    label,
    items: hrefs.map((href) => byHref.get(href)).filter((item): item is NonNullable<typeof item> => Boolean(item)),
  })).filter((group) => group.items.length > 0);
  return { overview, groups };
}

export function navItemsFor(role: SessionPayload["role"] | "guest", adminLevel?: AdminLevel | null): NavItem[] {
  if (role === "traveller" || role === "guest") {
    return PRIMARY_NAV_ITEMS;
  }
  if (role === "vendor") {
    return [
      { href: "/vendor/dashboard", label: "Overview", icon: "gauge" },
      { href: "/vendor/dashboard/listings", label: "Listings", icon: "grid" },
      { href: "/vendor/dashboard/bookings", label: "Bookings", icon: "ticket" },
      { href: "/vendor/dashboard/rewards", label: "Rewards", icon: "megaphone" },
      { href: "/vendor/dashboard/redeem", label: "Redeem", icon: "tag" },
      { href: "/vendor/dashboard/posts", label: "Posts", icon: "chat" },
      { href: "/vendor/dashboard/referrals", label: "Referrals", icon: "chart" },
      { href: "/vendor/dashboard/documents", label: "Documents", icon: "file" },
      { href: "/vendor/dashboard/clubs", label: "Clubs", icon: "users" },
    ];
  }
  if (role === "admin") {
    // Purely a UI convenience — hides items the viewer can't reach so the
    // nav isn't cluttered with dead ends. The actual access control lives
    // server-side in requireAdminPage/requireAdminLevel (src/lib/auth.ts),
    // which re-check the live level on every request regardless of what
    // this filter decided.
    return ADMIN_NAV_ITEMS.filter(({ minLevelKey }) => levelMeets(adminLevel, ADMIN_MIN_LEVEL[minLevelKey])).map(
      ({ href, label, icon, matchPrefixes }) => ({ href, label, icon, matchPrefixes }),
    );
  }
  // admin is the only remaining role — the traveller/guest branch above
  // already returns before reaching here.
  return PRIMARY_NAV_ITEMS;
}

export function mobileNavItemsFor(role: SessionPayload["role"] | "guest", adminLevel?: AdminLevel | null): NavItem[] {
  return navItemsFor(role, adminLevel);
}
