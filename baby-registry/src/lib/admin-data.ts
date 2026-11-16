import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseGift, normaliseSettings } from "./data";
import type { Category, Gift, Reservation, ReservationEvent, RegistrySettings } from "./types";

export async function loadAdminCore(sb: SupabaseClient) {
  const [gifts, categories, settings] = await Promise.all([
    sb.from("gifts").select("*").order("sort_order"),
    sb.from("categories").select("*").order("sort_order"),
    sb.from("registry_settings").select("*").eq("id", 1).single(),
  ]);
  const err = gifts.error || categories.error || settings.error;
  if (err) throw new Error(err.message);
  return {
    gifts: (gifts.data ?? []).map(normaliseGift) as Gift[],
    categories: (categories.data ?? []) as Category[],
    settings: normaliseSettings(settings.data) as RegistrySettings,
  };
}

export async function loadReservations(sb: SupabaseClient): Promise<Reservation[]> {
  const { data, error } = await sb.from("reservations").select("*").order("created_at", { ascending: false }).limit(2000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Reservation[]).map((r) => ({ ...r, price_aed_snapshot: r.price_aed_snapshot === null ? null : Number(r.price_aed_snapshot) }));
}

export async function loadEvents(sb: SupabaseClient, limit = 500): Promise<ReservationEvent[]> {
  const { data, error } = await sb.from("reservation_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReservationEvent[];
}
