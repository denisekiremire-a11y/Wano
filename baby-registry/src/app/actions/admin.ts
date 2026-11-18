"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
  firstError,
  giftRetailerSchema,
  giftSchema,
  locationSchema,
  rateSchema,
  retailerSchema,
  settingsSchema,
  slugify,
} from "@/lib/validation";
import type { GiftStatus } from "@/lib/types";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; message: string };

const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

function refreshAll() {
  revalidatePath("/", "layout");
}

function dbMessage(msg: string): string {
  if (/duplicate key.*slug/i.test(msg)) return "Another item already uses that URL slug — choose a different one.";
  if (/violates foreign key/i.test(msg)) return "This item is still referenced elsewhere.";
  return msg.replace(/^.*?ERROR:\s*/i, "");
}

// ───────────────────────────── Auth ─────────────────────────────

export async function signInAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim().slice(0, 254);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  if (!email || !password) return { ok: false, message: "Enter your email and password." };
  let sb;
  try {
    sb = await getServerSupabase();
  } catch {
    return { ok: false, message: "Supabase is not configured on the server yet (see .env.example)." };
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Those details didn’t work. Please check your email and password." };
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (isAdmin !== true) {
    await sb.auth.signOut();
    return { ok: false, message: "This account is not a registry administrator." };
  }
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin");
}

export async function signOutAction(): Promise<void> {
  const sb = await getServerSupabase();
  await sb.auth.signOut();
  redirect("/admin/login");
}

// ─────────────────────────── Reservations ───────────────────────────

export async function markReservationPurchasedAction(reservationId: string, note?: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_mark_reservation_purchased", { p_reservation_id: reservationId, p_note: note ?? null });
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: "Marked as purchased." };
}

export async function closeReservationAction(
  reservationId: string,
  newStatus: "cancelled" | "released",
  note?: string,
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_close_reservation", {
    p_reservation_id: reservationId,
    p_new_status: newStatus,
    p_note: note ?? null,
  });
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: newStatus === "cancelled" ? "Reservation cancelled; the gift is available again." : "Gift released back to available." };
}

/** Only reservations that no longer hold a gift can be deleted. Active/purchased must be released first. */
const CLOSED_STATUSES = ["cancelled", "released", "expired"] as const;

/**
 * Permanently deletes closed reservations (and, by cascade, their history). Signed-in admins have
 * no DELETE grant on reservations, so after the admin check this uses the server-only secret-key
 * client, and the status filter guarantees a live reservation is never removed.
 */
async function deleteClosedReservations(ids: string[] | null): Promise<ActionResult> {
  await requireAdmin();
  let query = getServiceSupabase().from("reservations").delete({ count: "exact" }).in("status", [...CLOSED_STATUSES]);
  if (ids) query = query.in("id", ids);
  const { error, count } = await query;
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  if (ids && !count) return { ok: false, message: "Only cancelled or released reservations can be deleted. Release it first." };
  return { ok: true, message: count === 1 ? "Reservation deleted." : `${count ?? 0} reservations deleted.` };
}

export async function deleteReservationAction(reservationId: string): Promise<ActionResult> {
  if (typeof reservationId !== "string" || !/^[0-9a-f-]{36}$/i.test(reservationId)) return { ok: false, message: "Invalid reservation." };
  return deleteClosedReservations([reservationId]);
}

export async function deleteAllClosedReservationsAction(): Promise<ActionResult> {
  return deleteClosedReservations(null);
}

export async function setGiftStatusAction(giftId: string, status: GiftStatus, note?: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!["available", "reserved", "purchased"].includes(status)) return { ok: false, message: "Invalid status." };
  const { error } = await supabase.rpc("admin_set_gift_status", { p_gift_id: giftId, p_status: status, p_note: note ?? null });
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: `Status set to ${status}.` };
}

// ─────────────────────────────── Gifts ───────────────────────────────

function parseGift(fd: FormData) {
  const name = String(fd.get("name") ?? "");
  return giftSchema.safeParse({
    name,
    slug: String(fd.get("slug") ?? "").trim() || slugify(name),
    categoryId: fd.get("categoryId"),
    description: fd.get("description"),
    notes: fd.get("notes"),
    priceAed: fd.get("priceAed"),
    salePriceAed: fd.get("salePriceAed"),
    priceMinAed: fd.get("priceMinAed"),
    priceMaxAed: fd.get("priceMaxAed"),
    priceUnit: fd.get("priceUnit"),
    priceBasis: fd.get("priceBasis"),
    priceLabel: fd.get("priceLabel"),
    tier: fd.get("tier"),
    inDocBudget: bool(fd, "inDocBudget"),
    inDocFull: bool(fd, "inDocFull"),
    isAlternative: bool(fd, "isAlternative"),
    isFeatured: bool(fd, "isFeatured"),
    imageUrl: fd.get("imageUrl"),
    imageKind: fd.get("imageKind") || "placeholder",
    imageCaption: fd.get("imageCaption"),
    sortOrder: fd.get("sortOrder") || 0,
  });
}

function giftRow(g: ReturnType<typeof giftSchema.parse>) {
  return {
    name: g.name,
    slug: g.slug,
    category_id: g.categoryId,
    description: g.description,
    notes: g.notes,
    price_aed: g.priceAed,
    sale_price_aed: g.salePriceAed,
    price_min_aed: g.priceMinAed,
    price_max_aed: g.priceMaxAed,
    price_unit: g.priceUnit,
    price_basis: g.priceBasis,
    price_label: g.priceLabel,
    tier: g.tier,
    in_doc_budget: g.inDocBudget,
    in_doc_full: g.inDocFull,
    is_alternative: g.isAlternative,
    is_featured: g.isFeatured,
    image_url: g.imageUrl,
    image_kind: g.imageUrl ? g.imageKind : "placeholder",
    image_caption: g.imageCaption,
    sort_order: g.sortOrder,
  };
}

export async function createGiftAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = parseGift(fd);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { data, error } = await supabase.from("gifts").insert(giftRow(parsed.data)).select("id").single();
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  redirect(`/admin/gifts/${data.id}?created=1`);
}

export async function updateGiftAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = parseGift(fd);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { error } = await supabase.from("gifts").update(giftRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, message: dbMessage(error.message) };

  // Availability is changed through the reservation-aware function, never a raw update.
  const status = String(fd.get("status") ?? "");
  const current = String(fd.get("currentStatus") ?? "");
  if (status && status !== current) {
    const r = await supabase.rpc("admin_set_gift_status", { p_gift_id: id, p_status: status, p_note: "Changed from the product editor" });
    if (r.error) return { ok: false, message: `Saved, but the status could not be changed: ${dbMessage(r.error.message)}` };
  }
  refreshAll();
  return { ok: true, message: "Gift saved." };
}

export async function deleteGiftAction(giftId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("gifts").delete().eq("id", giftId);
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: "Gift deleted." };
}

export async function saveGiftRetailerAction(giftId: string, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = giftRetailerSchema.safeParse({
    retailerId: fd.get("retailerId"),
    productUrl: fd.get("productUrl"),
    productNote: fd.get("productNote"),
    urlVerified: bool(fd, "urlVerified"),
    sourceNote: fd.get("sourceNote"),
    isPrimary: bool(fd, "isPrimary"),
  });
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const v = parsed.data;
  const { error } = await supabase.from("gift_retailers").upsert(
    {
      gift_id: giftId,
      retailer_id: v.retailerId,
      product_url: v.productUrl,
      product_note: v.productNote,
      url_verified: v.productUrl ? v.urlVerified : false,
      source_note: v.sourceNote,
      is_primary: v.isPrimary,
    },
    { onConflict: "gift_id,retailer_id" },
  );
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: "Shopping link saved." };
}

export async function removeGiftRetailerAction(linkId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("gift_retailers").delete().eq("id", linkId);
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: "Shopping link removed." };
}

// ───────────────────────── Retailers & stores ─────────────────────────

export async function saveRetailerAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = retailerSchema.safeParse({
    name: fd.get("name"),
    websiteUrl: fd.get("websiteUrl"),
    searchUrlTemplate: fd.get("searchUrlTemplate"),
    phone: fd.get("phone"),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const v = parsed.data;
  const row = { name: v.name, website_url: v.websiteUrl, search_url_template: v.searchUrlTemplate, phone: v.phone, notes: v.notes };
  const id = Number(fd.get("id") || 0);
  const { error } = id
    ? await supabase.from("retailers").update(row).eq("id", id)
    : await supabase.from("retailers").insert({ ...row, slug: slugify(v.name) || `retailer-${Date.now()}` });
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: id ? "Retailer saved." : "Retailer added." };
}

export async function deleteRetailerAction(id: number): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("retailers").delete().eq("id", id);
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: "Retailer deleted." };
}

export async function saveLocationAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = locationSchema.safeParse({
    retailerId: fd.get("retailerId"),
    name: fd.get("name"),
    area: fd.get("area"),
    address: fd.get("address"),
    phone: fd.get("phone"),
    mapsUrl: fd.get("mapsUrl"),
    verified: bool(fd, "verified"),
  });
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const v = parsed.data;
  const row = { retailer_id: v.retailerId, name: v.name, area: v.area, address: v.address, phone: v.phone, maps_url: v.mapsUrl, verified: v.verified };
  const id = String(fd.get("id") ?? "");
  const { error } = id ? await supabase.from("store_locations").update(row).eq("id", id) : await supabase.from("store_locations").insert(row);
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: id ? "Store saved." : "Store added." };
}

export async function deleteLocationAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("store_locations").delete().eq("id", id);
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: "Store deleted." };
}

// ───────────────────────────── Settings ─────────────────────────────

export async function saveRateAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = rateSchema.safeParse({ rate: fd.get("rate"), source: fd.get("source") });
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { error } = await supabase
    .from("registry_settings")
    .update({ aed_to_ugx_rate: parsed.data.rate, rate_source: parsed.data.source })
    .eq("id", 1);
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return {
    ok: true,
    message: parsed.data.rate ? "Exchange rate saved. UGX prices now show across the registry." : "Exchange rate cleared. The registry now shows AED only.",
  };
}

export async function saveSettingsAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse({
    registryTitle: fd.get("registryTitle"),
    welcomeHeading: fd.get("welcomeHeading"),
    welcomeText: fd.get("welcomeText"),
    priceNotice: fd.get("priceNotice"),
    reservationExpiryEnabled: bool(fd, "reservationExpiryEnabled"),
    reservationExpiryHours: fd.get("reservationExpiryHours"),
    maxReservationsPerDay: fd.get("maxReservationsPerDay"),
    maxAttemptsPer10Min: fd.get("maxAttemptsPer10Min"),
  });
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const v = parsed.data;
  if (v.reservationExpiryEnabled && !v.reservationExpiryHours) {
    return { ok: false, message: "Set how many hours a reservation lasts before turning on expiry." };
  }
  const { error } = await supabase
    .from("registry_settings")
    .update({
      registry_title: v.registryTitle,
      welcome_heading: v.welcomeHeading,
      welcome_text: v.welcomeText,
      price_notice: v.priceNotice,
      reservation_expiry_enabled: v.reservationExpiryEnabled,
      reservation_expiry_hours: v.reservationExpiryHours,
      max_reservations_per_client_per_day: v.maxReservationsPerDay,
      max_attempts_per_client_per_10min: v.maxAttemptsPer10Min,
    })
    .eq("id", 1);
  if (error) return { ok: false, message: dbMessage(error.message) };
  refreshAll();
  return { ok: true, message: "Settings saved." };
}
