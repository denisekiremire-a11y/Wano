"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export type MapPin = { id: string; lat: number; lng: number; label: string };

/** Loaded via next/dynamic({ ssr: false }) from the page — mapbox-gl touches
 * the DOM at import time and can't run server-side. Only rendered at all
 * when NEXT_PUBLIC_MAPBOX_TOKEN is set (checked by the caller), same
 * optional-token pattern as lib/afcon/distance.ts's Matrix calls. */
export function DiscoverMap({
  pins,
  token,
  onPinClick,
}: {
  pins: MapPin[];
  token: string;
  onPinClick?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [32.5825, 0.3476],
      zoom: 6,
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = pins.map((pin) => {
      const marker = new mapboxgl.Marker({ color: "#C1440E" })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(new mapboxgl.Popup({ offset: 14 }).setText(pin.label))
        .addTo(map);
      if (onPinClick) {
        marker.getElement().addEventListener("click", () => onPinClick(pin.id));
      }
      return marker;
    });

    if (pins.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      pins.forEach((pin) => bounds.extend([pin.lng, pin.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
    }
  }, [pins, onPinClick]);

  return <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-2xl sm:h-80" />;
}
