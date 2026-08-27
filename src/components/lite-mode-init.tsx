"use client";

import { useEffect } from "react";
import { applyStoredLiteMode } from "@/lib/lite-mode";

/** Applies the viewer's stored Lite mode preference on first paint. Renders
 * nothing — a small unavoidable flash before this runs is an acceptable
 * tradeoff for keeping the preference client-only (no cookie/DB round trip
 * needed just to know whether to shrink images). */
export function LiteModeInit() {
  useEffect(() => {
    applyStoredLiteMode();
  }, []);
  return null;
}
