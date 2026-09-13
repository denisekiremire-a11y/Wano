import type { Coordinates } from "./anchors";

// Straight-line (haversine) distance is always an underestimate of how far
// you'd actually drive — roads bend, lakes and hills get in the way. This
// factor turns the geometric distance into a rough "as the road winds"
// estimate for first paint, before the real Matrix API number arrives.
// Uganda's road network (a lot of single carriageway, few real ring roads)
// runs a bit windier than a flat highway grid, hence 1.35 rather than the
// ~1.2–1.3 typically used for motorway-heavy countries.
const ROAD_FACTOR = 1.35;
const EARTH_RADIUS_KM = 6371;
const AVERAGE_ROAD_SPEED_KMH = 55;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export type DistanceResult = {
  km: number;
  /** Null until the Matrix API resolves a real drive time — the estimate
   * path never guesses at time, only distance. */
  minutes: number | null;
  isEstimate: boolean;
};

/** First-paint estimate: haversine × a road-winding factor, with drive time
 * derived from a flat average speed. Always labelled "about" in the UI. */
export function estimateDistance(anchor: Coordinates, point: Coordinates): DistanceResult {
  const km = haversineKm(anchor, point) * ROAD_FACTOR;
  return { km, minutes: Math.round((km / AVERAGE_ROAD_SPEED_KMH) * 60), isEstimate: true };
}

/** Reorders items nearest-first by straight-line distance to the anchor.
 * Uses haversine (not the async Matrix result) so ordering is instant and
 * stable — upgrading order live as road-distance results trickle in would
 * shuffle cards under the traveller's thumb. Items with no coordinates sink
 * to the end; returns the list untouched when there's no anchor.
 *
 * getCoordinates may return several points for one item (e.g. a journey,
 * which has no coordinate of its own — only its listings do); the item is
 * then ranked by whichever of its points is nearest the anchor, since
 * that's the real question ("is anything on this journey close by"). */
export function sortByAnchor<T>(
  anchor: Coordinates | null,
  items: T[],
  getCoordinates: (item: T) => Coordinates | Coordinates[] | null,
): T[] {
  if (!anchor) return items;
  const from = anchor;

  function nearestDistanceKm(item: T): number | null {
    const value = getCoordinates(item);
    const points = value ? (Array.isArray(value) ? value : [value]) : [];
    if (points.length === 0) return null;
    return Math.min(...points.map((p) => haversineKm(from, p)));
  }

  return [...items].sort((a, b) => {
    const da = nearestDistanceKm(a);
    const db = nearestDistanceKm(b);
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });
}

const MATRIX_CHUNK_SIZE = 24;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Real road distance + drive time from one anchor to many destinations,
 * via the Mapbox Matrix API (one source, many destinations per request —
 * never one Directions call per card). Chunks at 24 destinations, Mapbox's
 * per-request limit for this endpoint. Returns whatever chunks succeeded;
 * a network failure degrades silently to an empty map so callers fall back
 * to the haversine estimate rather than breaking the page. */
export async function fetchMatrixDistances(
  origin: Coordinates,
  destinations: { id: string; coordinates: Coordinates }[],
): Promise<Map<string, DistanceResult>> {
  const results = new Map<string, DistanceResult>();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || destinations.length === 0) return results;

  await Promise.all(
    chunk(destinations, MATRIX_CHUNK_SIZE).map(async (batch) => {
      // Source is coordinate 0; destinations are 1..n.
      const coordString = [origin, ...batch.map((d) => d.coordinates)]
        .map((c) => `${c.longitude},${c.latitude}`)
        .join(";");
      const destinationsParam = batch.map((_, i) => i + 1).join(";");
      const url =
        `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordString}` +
        `?sources=0&destinations=${destinationsParam}&annotations=distance,duration&access_token=${token}`;

      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data: { distances?: (number | null)[][]; durations?: (number | null)[][] } = await res.json();
        const distances = data.distances?.[0];
        const durations = data.durations?.[0];
        if (!distances) return;
        batch.forEach((dest, i) => {
          const meters = distances[i];
          if (meters == null) return;
          const seconds = durations?.[i] ?? null;
          results.set(dest.id, {
            km: meters / 1000,
            minutes: seconds != null ? Math.round(seconds / 60) : null,
            isEstimate: false,
          });
        });
      } catch {
        // Network failure — this chunk just falls back to the estimate.
      }
    }),
  );

  return results;
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
