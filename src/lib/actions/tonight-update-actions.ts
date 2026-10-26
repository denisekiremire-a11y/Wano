"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { containsProfanity } from "@/lib/profanity";
import { setTonightUpdate, TONIGHT_UPDATE_MAX } from "@/lib/data/tonight-updates";
import { getVendorProfileByUserId } from "@/lib/data/vendor";

/** A partner's line for tonight. Posting again replaces it; an empty line
 * takes it down. It disappears on its own at midnight Kampala time. */
export async function postTonightUpdateAction(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const session = await requireRole("vendor");
  const vendor = await getVendorProfileByUserId(session.userId);
  if (!vendor) return { error: "Vendor profile not found." };
  const text = String(formData.get("text") ?? "").replace(/\s+/g, " ").trim();
  if (text.length > TONIGHT_UPDATE_MAX) return { error: `Keep it under ${TONIGHT_UPDATE_MAX} characters.` };
  if (text && containsProfanity(text)) return { error: "Please reword that." };
  await setTonightUpdate(vendor.id, text || null);
  revalidatePath("/");
  revalidatePath("/vendor/dashboard");
  return { ok: true };
}
