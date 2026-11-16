"use client";

import { createContext, useContext } from "react";
import type { Gift, GiftStatus, RegistryData } from "@/lib/types";

export type LiveStatus = "connecting" | "live" | "offline" | "disabled";

export interface RegistryContextValue extends RegistryData {
  liveStatus: LiveStatus;
  rate: number | null;
  giftById: (id: string) => Gift | undefined;
  /** Optimistically set a gift's status locally (the realtime event confirms it). */
  setGiftStatus: (id: string, status: GiftStatus) => void;
  openReserve: (gift: Gift) => void;
  openWhereToBuy: (gift: Gift) => void;
}

export const RegistryContext = createContext<RegistryContextValue | null>(null);

export function useRegistry(): RegistryContextValue {
  const ctx = useContext(RegistryContext);
  if (!ctx) throw new Error("useRegistry must be used inside <LiveRegistryProvider>");
  return ctx;
}
