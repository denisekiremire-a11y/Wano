import "server-only";
import { getPublicSupabase } from "./supabase/server";
import type { Category, Gift, GiftRetailer, GuestPledge, PublicReservation, RegistryData, RegistrySettings, Retailer, StoreLocation } from "./types";

/** Supabase returns numeric columns as strings in some drivers; normalise to numbers. */
const NUMERIC_GIFT_FIELDS = ["price_aed", "sale_price_aed", "price_min_aed", "price_max_aed", "reference_price_aed"] as const;

export function normaliseGift(row: Record<string, unknown>): Gift {
  const g = { ...row } as Record<string, unknown>;
  for (const f of NUMERIC_GIFT_FIELDS) g[f] = g[f] === null || g[f] === undefined ? null : Number(g[f]);
  return g as unknown as Gift;
}

export function normaliseSettings(row: Record<string, unknown>): RegistrySettings {
  const s = { ...row } as Record<string, unknown>;
  for (const f of ["aed_to_ugx_rate", "doc_budget_total_aed", "doc_full_total_aed"]) s[f] = s[f] === null || s[f] === undefined ? null : Number(s[f]);
  return s as unknown as RegistrySettings;
}

export class DataError extends Error {}

export async function getRegistryData(): Promise<RegistryData> {
  const sb = getPublicSupabase();
  const [gifts, categories, retailers, giftRetailers, locations, settings] = await Promise.all([
    sb.from("gifts").select("*").order("sort_order"),
    sb.from("categories").select("*").order("sort_order"),
    sb.from("retailers").select("*").order("name"),
    sb.from("gift_retailers").select("*"),
    sb.from("store_locations").select("*").order("name"),
    sb.from("registry_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  const err = gifts.error || categories.error || retailers.error || giftRetailers.error || locations.error || settings.error;
  if (err) throw new DataError(`Could not load the registry: ${err.message}`);
  if (!settings.data) throw new DataError("Registry settings are missing — run the database migrations.");
  return {
    gifts: (gifts.data ?? []).map(normaliseGift),
    categories: (categories.data ?? []) as Category[],
    retailers: (retailers.data ?? []) as Retailer[],
    giftRetailers: (giftRetailers.data ?? []) as GiftRetailer[],
    locations: (locations.data ?? []) as StoreLocation[],
    settings: normaliseSettings(settings.data),
  };
}

export async function getPublicReservation(reference: string): Promise<PublicReservation | null> {
  const sb = getPublicSupabase();
  const { data, error } = await sb.rpc("get_reservation_public", { p_reference: reference });
  if (error) throw new DataError(error.message);
  return (data as PublicReservation | null) ?? null;
}

export async function getGuestPledges(guestKey: string): Promise<GuestPledge[]> {
  const sb = getPublicSupabase();
  const { data, error } = await sb.rpc("get_guest_pledges", { p_guest_key: guestKey });
  if (error?.code === "PGRST202") return []; // "My gifts" migration not applied yet
  if (error) throw new DataError(error.message);
  return ((data as GuestPledge[] | null) ?? []).map((p) => ({ ...p, price_aed: p.price_aed === null ? null : Number(p.price_aed) }));
}
