export const PASSPORT_TABS = [
  { key: "stamps", label: "Stamps" },
  { key: "saved", label: "Saved" },
  { key: "bookings", label: "Bookings" },
  { key: "rewards", label: "Rewards" },
  { key: "posts", label: "Posts" },
  // key stays "account" so existing ?tab=account links keep working —
  // only the displayed label changed (Saved + Settings folded in here
  // per the bottom-nav restructure).
  { key: "account", label: "Settings" },
] as const;

export type PassportTabKey = (typeof PASSPORT_TABS)[number]["key"];
