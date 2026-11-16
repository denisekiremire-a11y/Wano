"use client";

import { GiftCard } from "./GiftCard";
import { useRegistry } from "./context";

export function FeaturedGifts() {
  const { gifts } = useRegistry();
  const featured = gifts.filter((g) => g.is_featured).slice(0, 8);
  if (!featured.length) return null;
  return (
    <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {featured.map((g, i) => (
        <GiftCard key={g.id} gift={g} priority={i < 2} />
      ))}
    </div>
  );
}
