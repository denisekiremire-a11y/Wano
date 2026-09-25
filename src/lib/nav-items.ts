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

export function navItemsFor(role: SessionPayload["role"] | "guest"): NavItem[] {
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
    return [
      { href: "/admin", label: "Overview", icon: "gauge" },
      { href: "/admin/vendors", label: "Vendors", icon: "users" },
      { href: "/admin/submissions", label: "Submissions", icon: "mail" },
      { href: "/admin/bookings", label: "Bookings", icon: "ticket" },
      { href: "/admin/slots", label: "Slots", icon: "calendar" },
      { href: "/admin/travellers", label: "Members", icon: "grid" },
      { href: "/admin/promotions", label: "Deals", icon: "tag" },
      { href: "/admin/rewards", label: "Rewards", icon: "ticket" },
      { href: "/admin/funzone", label: "Fun Zone", icon: "megaphone" },
      { href: "/admin/match-day", label: "Match Day", icon: "calendar" },
      { href: "/admin/clubs", label: "Clubs", icon: "chat" },
      { href: "/admin/journal", label: "Journal", icon: "file" },
      { href: "/admin/moderation", label: "Moderation", icon: "flag" },
      { href: "/admin/influencers", label: "Influencers", icon: "trophy" },
      { href: "/admin/analytics", label: "Analytics", icon: "chart" },
    ];
  }
  // admin is the only remaining role — the traveller/guest branch above
  // already returns before reaching here.
  return PRIMARY_NAV_ITEMS;
}

export function mobileNavItemsFor(role: SessionPayload["role"] | "guest"): NavItem[] {
  return navItemsFor(role);
}
