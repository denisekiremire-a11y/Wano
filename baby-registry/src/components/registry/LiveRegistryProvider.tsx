"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { Gift, GiftStatus, RegistryData, RegistrySettings } from "@/lib/types";
import { RegistryContext, type LiveStatus, type RegistryContextValue } from "./context";
import { ReserveDialog } from "./ReserveDialog";
import { WhereToBuyDialog } from "./WhereToBuyDialog";

export { useRegistry } from "./context";

function toGift(row: Record<string, unknown>): Gift {
  const g = { ...row };
  for (const f of ["price_aed", "sale_price_aed", "price_min_aed", "price_max_aed", "reference_price_aed"]) {
    g[f] = g[f] === null || g[f] === undefined ? null : Number(g[f]);
  }
  return g as unknown as Gift;
}

function toSettings(row: Record<string, unknown>, prev: RegistrySettings): RegistrySettings {
  const s = { ...prev, ...row } as Record<string, unknown>;
  for (const f of ["aed_to_ugx_rate", "doc_budget_total_aed", "doc_full_total_aed"]) {
    s[f] = s[f] === null || s[f] === undefined ? null : Number(s[f]);
  }
  return s as unknown as RegistrySettings;
}

interface Props {
  initial: RegistryData;
  supabaseUrl: string;
  supabaseKey: string;
  children: ReactNode;
}

export function LiveRegistryProvider({ initial, supabaseUrl, supabaseKey, children }: Props) {
  const [gifts, setGifts] = useState<Gift[]>(initial.gifts);
  const [settings, setSettings] = useState<RegistrySettings>(initial.settings);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(supabaseUrl && supabaseKey ? "connecting" : "disabled");
  const [reserveGift, setReserveGift] = useState<Gift | null>(null);
  const [whereGift, setWhereGift] = useState<Gift | null>(null);
  const subscribedOnce = useRef(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return;
    const sb = getBrowserSupabase(supabaseUrl, supabaseKey);
    // Ignore callbacks from a channel that has already been torn down (React may mount the
    // effect twice in development, and removal completes asynchronously).
    let active = true;

    // Catch up on anything missed while disconnected (e.g. phone was asleep).
    const resync = async () => {
      const { data, error } = await sb.from("gifts").select("*").order("sort_order");
      if (!error && data) setGifts(data.map((r) => toGift(r as Record<string, unknown>)));
      const s = await sb.from("registry_settings").select("*").eq("id", 1).maybeSingle();
      if (!s.error && s.data) setSettings((prev) => toSettings(s.data as Record<string, unknown>, prev));
    };

    const onGift = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType === "DELETE") {
        const id = (payload.old as { id?: string }).id;
        if (id) setGifts((gs) => gs.filter((g) => g.id !== id));
        return;
      }
      const row = toGift(payload.new as Record<string, unknown>);
      setGifts((gs) => {
        const i = gs.findIndex((g) => g.id === row.id);
        if (i === -1) return [...gs, row];
        const next = gs.slice();
        next[i] = row;
        return next;
      });
    };

    const channel = sb
      .channel(`registry-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gifts" }, onGift)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "registry_settings" }, (payload) =>
        setSettings((prev) => toSettings(payload.new as Record<string, unknown>, prev)),
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setLiveStatus("live");
          if (subscribedOnce.current) void resync();
          subscribedOnce.current = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLiveStatus("offline");
        }
      });

    const onVisible = () => {
      if (document.visibilityState === "visible" && subscribedOnce.current) void resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      void sb.removeChannel(channel);
    };
  }, [supabaseUrl, supabaseKey]);

  // Keep open dialogs pointing at the freshest copy of their gift.
  const giftMap = useMemo(() => new Map(gifts.map((g) => [g.id, g])), [gifts]);
  const giftById = useCallback((id: string) => giftMap.get(id), [giftMap]);
  const setGiftStatus = useCallback((id: string, status: GiftStatus) => {
    setGifts((gs) => gs.map((g) => (g.id === id ? { ...g, status } : g)));
  }, []);
  const close = useCallback(() => {
    setReserveGift(null);
    setWhereGift(null);
  }, []);

  const rate = settings.aed_to_ugx_rate && settings.aed_to_ugx_rate > 0 ? settings.aed_to_ugx_rate : null;

  const value: RegistryContextValue = {
    ...initial,
    gifts,
    settings,
    liveStatus,
    rate,
    giftById,
    setGiftStatus,
    openReserve: setReserveGift,
    openWhereToBuy: setWhereGift,
  };

  return (
    <RegistryContext.Provider value={value}>
      {children}
      <ReserveDialog key={reserveGift?.id ?? "closed"} gift={reserveGift ? (giftMap.get(reserveGift.id) ?? reserveGift) : null} onClose={close} />
      <WhereToBuyDialog gift={whereGift ? (giftMap.get(whereGift.id) ?? whereGift) : null} onClose={close} />
    </RegistryContext.Provider>
  );
}
