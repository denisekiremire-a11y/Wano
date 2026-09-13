"use client";

import { useAnchor, useAnchorMatrixResult } from "@/components/afcon/anchor-provider";
import { PinIcon } from "@/components/icons";
import { estimateDistance, formatKm, formatMinutes } from "@/lib/afcon/distance";
import type { Coordinates } from "@/lib/afcon/anchors";

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Drops into any card with coordinates. Renders nothing when no anchor is
 * set, so cards look exactly as they do with the AFCON feature off. First
 * paint shows a haversine-based "about" estimate; it upgrades in place to
 * the real Mapbox Matrix road distance/time once that batched request
 * resolves (or stays on the estimate if the request fails). */
export function DistanceBadge({
  id,
  latitude,
  longitude,
}: {
  id: string;
  latitude: string | number | null | undefined;
  longitude: string | number | null | undefined;
}) {
  const { anchor } = useAnchor();
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  const coordinates: Coordinates | null = lat != null && lng != null ? { latitude: lat, longitude: lng } : null;
  const matrixResult = useAnchorMatrixResult(id, coordinates);

  if (!anchor?.coordinates || !coordinates) return null;

  const result = matrixResult ?? estimateDistance(anchor.coordinates, coordinates);

  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-full bg-nile-50 py-1 pl-2 pr-3 text-sm font-medium text-nile-800">
      <PinIcon className="h-3.5 w-3.5 flex-none text-nile-600" />
      <span>
        {result.isEstimate ? "about " : ""}
        {formatKm(result.km)}
      </span>
      <span aria-hidden className="h-3 w-px bg-nile-700/25" />
      <span>{result.minutes != null ? formatMinutes(result.minutes) : "drive time unknown"}</span>
      <span className="font-normal text-nile-700/70">from {anchor.label}</span>
    </span>
  );
}
