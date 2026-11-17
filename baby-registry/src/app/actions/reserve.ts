"use server";

import { createHash } from "node:crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { formatAED } from "@/lib/currency";
import { ensureGuestKey } from "@/lib/guest-key";
import { notifyReservation } from "@/lib/notify";
import { siteUrl } from "@/lib/site-url";
import { getServiceSupabase } from "@/lib/supabase/service";
import { firstError, reservationSchema } from "@/lib/validation";

export type ReserveResult =
  | { ok: true; reference: string; giftId: string; giftName: string; priceAed: number | null }
  | { ok: false; code: "invalid" | "unavailable" | "not_found" | "rate_limited" | "spam" | "server"; message: string; giftStatus?: string };

/** Minimum time between opening the form and submitting it (bots submit instantly). */
const MIN_FILL_MS = 1500;

async function clientHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown";
  // Salted so stored hashes cannot be reversed into IP addresses.
  const salt =
    process.env.RESERVATION_HASH_SALT ||
    createHash("sha256").update(`salt:${process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`).digest("hex");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 40);
}

export async function reserveGiftAction(formData: FormData): Promise<ReserveResult> {
  // Honeypot: real visitors never see or fill this field.
  if (String(formData.get("hp_x") ?? "") !== "") {
    console.warn("reservation blocked by honeypot");
    return { ok: false, code: "spam", message: "Something went wrong. Please refresh the page and try again." };
  }
  const openedAt = Number(formData.get("openedAt"));
  if (Number.isFinite(openedAt) && openedAt > 0 && Date.now() - openedAt < MIN_FILL_MS) {
    return { ok: false, code: "spam", message: "That was quick! Please check your details and press Reserve again." };
  }

  const parsed = reservationSchema.safeParse({
    giftId: formData.get("giftId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, code: "invalid", message: firstError(parsed.error) };
  const input = parsed.data;

  try {
    const guestKey = await ensureGuestKey();
    const sb = getServiceSupabase();
    const args = {
      p_gift_id: input.giftId,
      p_guest_name: input.name,
      p_guest_email: input.email,
      p_guest_phone: input.phone,
      p_message: input.message,
      p_client_hash: await clientHash(),
    };
    let { data, error } = await sb.rpc("reserve_gift", { ...args, p_guest_key: guestKey });
    if (error?.code === "PGRST202") {
      // The "My gifts" database update (20261117000100_guest_pledges.sql) hasn't been applied
      // yet: still take the reservation, just without linking it to the guest's list.
      console.warn("reserve_gift without guest key — apply the guest_pledges migration");
      ({ data, error } = await sb.rpc("reserve_gift", args));
    }
    if (error) {
      console.error("reserve_gift failed", error.message);
      return { ok: false, code: "server", message: "We couldn't save your reservation just now. Please try again in a moment." };
    }
    const res = data as {
      ok: boolean;
      error?: string;
      message?: string;
      status?: string;
      reference?: string;
      gift_id?: string;
      gift_name?: string;
      gift_slug?: string;
      price_aed?: number | string | null;
    };
    if (!res.ok) {
      return {
        ok: false,
        code: (res.error as Exclude<ReserveResult, { ok: true }>["code"]) ?? "server",
        message: res.message ?? "This gift could not be reserved.",
        giftStatus: res.status,
      };
    }
    // Email the family (and the guest, if configured) after the response is sent, so the
    // guest never waits on email and an email failure can never undo a reservation.
    const origin = await siteUrl();
    after(() =>
      notifyReservation({
        reference: res.reference!,
        giftName: res.gift_name!,
        giftSlug: res.gift_slug ?? null,
        priceText: formatAED(res.price_aed),
        guestName: input.name,
        guestEmail: input.email,
        guestPhone: input.phone,
        message: input.message,
        siteUrl: origin,
        myGiftsUrl: `${origin}/my-gifts/${guestKey}`,
      }).catch((e) => console.error("notifyReservation", e)),
    );
    return {
      ok: true,
      reference: res.reference!,
      giftId: res.gift_id!,
      giftName: res.gift_name!,
      priceAed: res.price_aed === null || res.price_aed === undefined ? null : Number(res.price_aed),
    };
  } catch (e) {
    console.error("reserveGiftAction", e instanceof Error ? e.message : e);
    return {
      ok: false,
      code: "server",
      message: "Reservations aren't available right now because the registry isn't fully set up. Please let the family know.",
    };
  }
}
