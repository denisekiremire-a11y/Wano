"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { STADIUM_ANCHORS, type AnchorId, type Coordinates, type ResolvedAnchor, type StadiumAnchorId } from "@/lib/afcon/anchors";
import { fetchMatrixDistances, type DistanceResult } from "@/lib/afcon/distance";

const STORAGE_KEY = "wano_afcon_anchor";

type StoredAnchor = { id: AnchorId; coordinates: Coordinates | null };

function readStoredAnchor(): StoredAnchor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAnchor;
    if (parsed.id === "namboole" || parsed.id === "hoima") {
      return { id: parsed.id, coordinates: STADIUM_ANCHORS[parsed.id].coordinates };
    }
    if (parsed.id === "gps" && parsed.coordinates) return parsed;
    return null;
  } catch {
    return null;
  }
}

function labelFor(id: AnchorId): string {
  if (id === "gps") return "your location";
  return STADIUM_ANCHORS[id].shortLabel;
}

type AnchorContextValue = {
  anchor: ResolvedAnchor | null;
  gpsLoading: boolean;
  gpsError: string | null;
  setStadiumAnchor: (id: StadiumAnchorId) => void;
  setGpsAnchor: () => void;
  clearAnchor: () => void;
  /** Registers a destination for the next batched Mapbox Matrix request —
   * called by useAnchorDistance, not directly by page code. */
  registerDestination: (id: string, coordinates: Coordinates) => void;
  matrixResults: Map<string, DistanceResult>;
};

const AnchorContext = createContext<AnchorContextValue | null>(null);

const BATCH_DEBOUNCE_MS = 80;

export function AnchorProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredAnchor | null>(readStoredAnchor);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [matrixResults, setMatrixResults] = useState<Map<string, DistanceResult>>(new Map());

  const pendingRef = useRef<Map<string, Coordinates>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorCoordsRef = useRef<Coordinates | null>(stored?.coordinates ?? null);

  const persist = useCallback((next: StoredAnchor | null) => {
    setStored(next);
    anchorCoordsRef.current = next?.coordinates ?? null;
    // A new anchor invalidates every previously-resolved road distance —
    // stale results from the old anchor must never render under the new one.
    setMatrixResults(new Map());
    pendingRef.current.clear();
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode, quota) — anchor still works for this session.
    }
  }, []);

  const setStadiumAnchor = useCallback(
    (id: StadiumAnchorId) => {
      setGpsError(null);
      persist({ id, coordinates: STADIUM_ANCHORS[id].coordinates });
    },
    [persist],
  );

  const setGpsAnchor = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Location isn't available on this device.");
      return;
    }
    setGpsError(null);
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        persist({
          id: "gps",
          coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        });
      },
      () => {
        setGpsLoading(false);
        setGpsError("Couldn't get your location — check your browser's location permission.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [persist]);

  const clearAnchor = useCallback(() => {
    setGpsError(null);
    persist(null);
  }, [persist]);

  const flushBatch = useCallback(async () => {
    const anchorCoords = anchorCoordsRef.current;
    const entries = [...pendingRef.current.entries()];
    pendingRef.current.clear();
    if (!anchorCoords || entries.length === 0) return;

    const result = await fetchMatrixDistances(
      anchorCoords,
      entries.map(([id, coordinates]) => ({ id, coordinates })),
    );
    if (result.size === 0) return;
    setMatrixResults((prev) => {
      const next = new Map(prev);
      for (const [id, value] of result) next.set(id, value);
      return next;
    });
  }, []);

  const registerDestination = useCallback(
    (id: string, coordinates: Coordinates) => {
      if (matrixResults.has(id)) return;
      pendingRef.current.set(id, coordinates);
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        void flushBatch();
      }, BATCH_DEBOUNCE_MS);
    },
    [flushBatch, matrixResults],
  );

  const anchor: ResolvedAnchor | null = useMemo(() => {
    if (!stored) return null;
    return { id: stored.id, label: labelFor(stored.id), coordinates: stored.coordinates };
  }, [stored]);

  const value = useMemo<AnchorContextValue>(
    () => ({ anchor, gpsLoading, gpsError, setStadiumAnchor, setGpsAnchor, clearAnchor, registerDestination, matrixResults }),
    [anchor, gpsLoading, gpsError, setStadiumAnchor, setGpsAnchor, clearAnchor, registerDestination, matrixResults],
  );

  return <AnchorContext.Provider value={value}>{children}</AnchorContext.Provider>;
}

export function useAnchor() {
  const ctx = useContext(AnchorContext);
  if (!ctx) throw new Error("useAnchor must be used within an AnchorProvider.");
  return ctx;
}

/** First paint uses a synchronous haversine estimate (see estimateDistance);
 * this hook only concerns itself with upgrading to the real Mapbox Matrix
 * result once the batched request resolves. */
export function useAnchorMatrixResult(id: string, coordinates: Coordinates | null): DistanceResult | null {
  const { anchor, registerDestination, matrixResults } = useAnchor();
  const anchorCoords = anchor?.coordinates ?? null;
  const lat = coordinates?.latitude ?? null;
  const lng = coordinates?.longitude ?? null;
  const anchorLat = anchorCoords?.latitude ?? null;
  const anchorLng = anchorCoords?.longitude ?? null;

  useEffect(() => {
    if (lat == null || lng == null || anchorLat == null || anchorLng == null) return;
    registerDestination(id, { latitude: lat, longitude: lng });
  }, [id, lat, lng, anchorLat, anchorLng, registerDestination]);

  return coordinates ? (matrixResults.get(id) ?? null) : null;
}
