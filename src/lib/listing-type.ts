export const listingTypeLabels = {
  hotel: "Accommodation",
  restaurant: "Restaurant",
  experience: "Experience",
  transport: "Transport",
  spa_salon: "Spa & Salon",
  attraction: "Attraction",
  event: "Event",
  rental: "Rental",
  charity: "Charity / Community Organisation",
} as const;

export type ListingType = keyof typeof listingTypeLabels;

export const listingTypeGradient: Record<ListingType, string> = {
  hotel: "from-nile-800 via-nile-600 to-nile-400",
  restaurant: "from-marigold-700 via-marigold-500 to-marigold-300",
  experience: "from-forest-800 via-forest-600 to-forest-400",
  transport: "from-forest-950 via-nile-700 to-marigold-400",
  spa_salon: "from-nile-700 via-forest-500 to-marigold-300",
  attraction: "from-marigold-800 via-forest-600 to-nile-400",
  event: "from-nile-900 via-marigold-600 to-marigold-300",
  rental: "from-forest-900 via-forest-600 to-nile-300",
  charity: "from-forest-800 via-marigold-500 to-forest-400",
};

// What the "items" section of a listing page is called for this type —
// the same underlying listingItems table backs all of them. Charity
// listings don't use this tab at all (Phase 2 replaces the tab set for
// listingType "charity" with Events/Volunteer/Donate/Reports) — this
// entry only exists to satisfy the exhaustive Record and is unused.
export const listingItemSectionLabel: Record<ListingType, string> = {
  restaurant: "Menu",
  spa_salon: "Services",
  experience: "Activities",
  hotel: "Rooms",
  transport: "Vehicles",
  rental: "Vehicles",
  event: "Tickets",
  attraction: "Experiences",
  charity: "Ways to help",
};
