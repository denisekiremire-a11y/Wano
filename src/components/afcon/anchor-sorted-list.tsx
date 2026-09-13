"use client";

import { useMemo, type ReactNode } from "react";
import { useAnchor } from "@/components/afcon/anchor-provider";
import { sortByAnchor } from "@/lib/afcon/distance";
import type { Coordinates } from "@/lib/afcon/anchors";

export type AnchorSortableItem = {
  id: string;
  /** A single point, several (ranked by whichever is nearest), or null. */
  coordinates: Coordinates | Coordinates[] | null;
  node: ReactNode;
};

/** Reorders a list of already-server-rendered items nearest-first once an
 * anchor is set — items themselves (PartnerCard, a journey's summary row,
 * …) are rendered server-side and handed in as `node`; this component only
 * ever touches ordering, never what's rendered. Returns the original order
 * untouched when there's no anchor, so the page looks identical to today
 * with the AFCON feature off. */
export function AnchorSortedList({
  items,
  className,
  itemWrapperClassName,
}: {
  items: AnchorSortableItem[];
  className?: string;
  itemWrapperClassName?: string;
}) {
  const { anchor } = useAnchor();
  const ordered = useMemo(
    () => sortByAnchor(anchor?.coordinates ?? null, items, (item) => item.coordinates),
    [anchor?.coordinates, items],
  );

  return (
    <div className={className}>
      {ordered.map((item) => (
        <div key={item.id} className={itemWrapperClassName}>
          {item.node}
        </div>
      ))}
    </div>
  );
}
