export const PASSPORT_TABS = [
  { key: "stamps", label: "Stamps" },
  { key: "bookings", label: "Bookings" },
  { key: "rewards", label: "Rewards" },
  { key: "posts", label: "Posts" },
  { key: "account", label: "Account" },
] as const;

export type PassportTabKey = (typeof PASSPORT_TABS)[number]["key"];
