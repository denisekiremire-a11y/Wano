"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { issueVisitorCode, recordCheckIn, resolveVisitorCodeForVendor, type CheckInResult } from "@/lib/data/check-ins";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { signVisitorToken, verifyVisitorToken } from "@/lib/visitor-token";

/** The member's 6-digit backup code, shown under their Wano QR for when a
 * scan fails. Valid 10 minutes. */
export async function getVisitorCodeAction() {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) throw new Error("Traveller profile not found.");
  const row = await issueVisitorCode(traveller.id);
  return { code: row.code, expiresAt: row.expiresAt.toISOString() };
}

export type CheckInOutcome =
  | ({ ok: true } & CheckInResult)
  | { ok: false; reason: "invalid" | "not_trusted" };

/** Called by the venue's visitor page once it has opened: records today's
 * verified visit for the member behind the scanned QR (or typed code). */
export async function checkInVisitorAction(token: string, via: "qr" | "code" = "qr"): Promise<CheckInOutcome> {
  const session = await requireRole("vendor");
  const vendor = await getVendorProfileByUserId(session.userId);
  if (!vendor) return { ok: false, reason: "invalid" };
  if (vendor.accreditationStatus !== "trusted") return { ok: false, reason: "not_trusted" };

  const decoded = await verifyVisitorToken(token);
  if (!decoded) return { ok: false, reason: "invalid" };

  const result = await recordCheckIn(decoded.travellerProfileId, vendor.id, via === "code" ? "code" : "qr");
  return { ok: true, ...result };
}

/** Staff typed a member's backup code: open the same visitor page a scan
 * would, so they see what the member can claim and the visit is logged. */
export async function lookupVisitorCodeAction(_prev: { error?: string } | undefined, formData: FormData) {
  const session = await requireRole("vendor");
  const vendor = await getVendorProfileByUserId(session.userId);
  if (!vendor) return { error: "Vendor profile not found." };
  const found = await resolveVisitorCodeForVendor(vendor.id, String(formData.get("code") ?? ""));
  if ("error" in found) {
    return {
      error:
        found.error === "paused"
          ? "Too many wrong codes. Wait 15 minutes, or scan the visitor's QR instead."
          : "That code isn't valid. Codes last 10 minutes, so ask the visitor to check their Passport.",
    };
  }
  const token = await signVisitorToken(found.travellerId);
  redirect(`/vendor/dashboard/redeem/visitor/${token}?via=code`);
}
