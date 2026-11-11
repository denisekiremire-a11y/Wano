export const REWARDS_PAGE_TABS = [
  { key: "rewards", label: "Rewards" },
  { key: "bookings", label: "Bookings" },
] as const;

export type RewardsPageTabKey = (typeof REWARDS_PAGE_TABS)[number]["key"];
