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
    | "user"
    | "ticket";
};

export function navItemsFor(role: SessionPayload["role"] | "guest"): NavItem[] {
  if (role === "traveller") {
    return [
      { href: "/home", label: "Home", icon: "home" },
      { href: "/explore", label: "Explore", icon: "compass" },
      { href: "/events", label: "Events", icon: "calendar" },
      { href: "/social", label: "Social", icon: "chat" },
      { href: "/bookings", label: "Bookings", icon: "ticket" },
      { href: "/profile", label: "Profile", icon: "user" },
    ];
  }
  if (role === "vendor") {
    return [
      { href: "/vendor/dashboard", label: "Listing", icon: "grid" },
      { href: "/vendor/dashboard/bookings", label: "Bookings", icon: "ticket" },
      { href: "/vendor/dashboard/offer", label: "Offer", icon: "megaphone" },
      { href: "/vendor/dashboard/referrals", label: "Referrals", icon: "chart" },
      { href: "/vendor/dashboard/documents", label: "Documents", icon: "file" },
      { href: "/vendor/dashboard/clubs", label: "Clubs", icon: "users" },
    ];
  }
  if (role === "admin") {
    return [
      { href: "/admin", label: "Overview", icon: "gauge" },
      { href: "/admin/vendors", label: "Vendors", icon: "users" },
      { href: "/admin/bookings", label: "Bookings", icon: "ticket" },
      { href: "/admin/travellers", label: "Members", icon: "grid" },
      { href: "/admin/promotions", label: "Deals", icon: "tag" },
      { href: "/admin/clubs", label: "Clubs", icon: "chat" },
    ];
  }
  return [
    { href: "/", label: "Home", icon: "home" },
    { href: "/explore", label: "Explore", icon: "compass" },
    { href: "/events", label: "Events", icon: "calendar" },
    { href: "/how-it-works", label: "How it works", icon: "flag" },
  ];
}

// The mobile bottom bar has less room than the desktop header, so for
// members it drops to 5 items (Bookings lives inside Profile on mobile).
export function mobileNavItemsFor(role: SessionPayload["role"] | "guest"): NavItem[] {
  const items = navItemsFor(role);
  if (role === "traveller") {
    return items.filter((item) => item.href !== "/bookings");
  }
  return items;
}
