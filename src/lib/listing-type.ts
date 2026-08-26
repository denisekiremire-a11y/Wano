export const listingTypeLabels = {
  hotel: "Hotel & Stay",
  restaurant: "Restaurant",
  experience: "Experience",
  transport: "Transport",
  spa_salon: "Spa & Salon",
} as const;

export type ListingType = keyof typeof listingTypeLabels;

export const listingTypeGradient: Record<ListingType, string> = {
  hotel: "from-nile-800 via-nile-600 to-nile-400",
  restaurant: "from-marigold-700 via-marigold-500 to-marigold-300",
  experience: "from-forest-800 via-forest-600 to-forest-400",
  transport: "from-forest-950 via-nile-700 to-marigold-400",
  spa_salon: "from-nile-700 via-forest-500 to-marigold-300",
};
