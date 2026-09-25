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
  { href: "/admin/promotions", label: "Deals", icon: "tag", minLevelKey: "/admin/promotions" },
  { href: "/admin/rewards", label: "Rewards", icon: "ticket", minLevelKey: "/admin/rewards" },
  { href: "/admin/funzone", label: "Fun Zone", icon: "megaphone", minLevelKey: "/admin/funzone" },
  { href: "/admin/match-day", label: "Match Day", icon: "calendar", minLevelKey: "/admin/match-day" },
  { href: "/admin/clubs", label: "Clubs", icon: "chat", minLevelKey: "/admin/clubs" },
  { href: "/admin/journal", label: "Journal", icon: "file", minLevelKey: "/admin/journal" },
  { href: "/admin/moderation", label: "Moderation", icon: "flag", minLevelKey: "/admin/moderation" },
  { href: "/admin/influencers", label: "Influencers", icon: "trophy", minLevelKey: "/admin/influencers" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart", minLevelKey: "/admin/analytics" },
  { href: "/admin/accounts", label: "Accounts", icon: "user", minLevelKey: "/admin/accounts" },
];

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
