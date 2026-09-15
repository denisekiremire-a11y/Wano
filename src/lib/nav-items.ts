import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
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
    | "trophy";
};

export function navItemsFor(role: SessionPayload["role"] | "guest"): NavItem[] {
  if (role === "traveller") {
    return [
      { href: "/explore", label: "Explore", icon: "compass" },
      { href: "/events", label: "Events", icon: "calendar" },
      { href: "/social", label: "Social", icon: "chat" },
      { href: "/messages", label: "Messages", icon: "mail" },
      { href: "/passport", label: "Passport", icon: "stamp" },
      ...(AFCON_CLUB_ENABLED ? [{ href: "/afcon", label: "AFCON", icon: "trophy" } as const] : []),
    ];
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
  return [
    { href: "/explore", label: "Explore", icon: "compass" },
    { href: "/journeys", label: "Journeys", icon: "flag" },
    { href: "/events", label: "Events", icon: "calendar" },
    ...(AFCON_CLUB_ENABLED ? [{ href: "/afcon", label: "AFCON 27", icon: "trophy" } as const] : []),
    { href: "/verified", label: "Verified", icon: "tag" },
    { href: "/contact", label: "Contact", icon: "mail" },
  ];
}

export function mobileNavItemsFor(role: SessionPayload["role"] | "guest"): NavItem[] {
  return navItemsFor(role);
}
