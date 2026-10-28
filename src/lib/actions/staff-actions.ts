"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { staffPinFailures, vendorProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorProfileByUserId, getVendorProfileByStaffAccessToken } from "@/lib/data/vendor";
import { clearStaffSessionCookie, createStaffSessionCookie } from "@/lib/staff-token";
import type { ActionState } from "@/lib/validation";

function newStaffAccessToken() {
  return randomBytes(24).toString("hex");
}

/** Generates this vendor's shareable staff link, or rotates it if one
 * already exists — rotating instantly kills every link currently
 * bookmarked on staff phones (lost phone, staff turnover), independent of
 * the venue PIN. Vendor-login only: staff never get to mint or revoke
 * their own access. */
export async function rotateStaffLinkAction(): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  await db
    .update(vendorProfiles)
    .set({ staffAccessToken: newStaffAccessToken() })
    .where(eq(vendorProfiles.id, vendorProfile.id));

  revalidatePath("/vendor/dashboard/redeem");
  return {};
}

const PIN_FAILURE_LIMIT = 10;
const PIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

/** The staff link's PIN-entry step — no vendor login involved at all, so
 * this is the one place a 4-6 digit PIN becomes guessable by anyone who
 * has (or guesses) the link, hence the same failed-attempt lockout
 * visitor codes use (resolveVisitorCodeForVendor in check-ins.ts). */
export async function unlockStaffSessionAction(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const staffAccessToken = formData.get("staffAccessToken");
  const pin = formData.get("pin");
  if (typeof staffAccessToken !== "string" || !staffAccessToken) return { error: "Invalid staff link." };
  if (typeof pin !== "string" || !pin) return { error: "Enter the venue PIN." };

  const vendorProfile = await getVendorProfileByStaffAccessToken(staffAccessToken);
  if (!vendorProfile) return { error: "This staff link isn't valid any more — ask the venue for a fresh one." };
  if (!vendorProfile.staffPinHash) return { error: "This venue hasn't set a PIN yet." };

  const since = new Date(Date.now() - PIN_FAILURE_WINDOW_MS);
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(staffPinFailures)
    .where(and(eq(staffPinFailures.vendorProfileId, vendorProfile.id), gt(staffPinFailures.createdAt, since)));
  if ((recent?.n ?? 0) >= PIN_FAILURE_LIMIT) {
    return { error: "Too many wrong PINs. Wait 15 minutes and try again." };
  }

  const pinValid = await bcrypt.compare(pin, vendorProfile.staffPinHash);
  if (!pinValid) {
    await db.insert(staffPinFailures).values({ vendorProfileId: vendorProfile.id });
    return { error: "Incorrect PIN." };
  }

  await createStaffSessionCookie(vendorProfile.id, staffAccessToken);
  return {};
}

/** "Lock" button on the staff page — clears the shift cookie early
 * (end of shift, handing the phone to a customer, etc.) instead of
 * waiting out the full 12 hours. */
export async function lockStaffSessionAction() {
  await clearStaffSessionCookie();
  revalidatePath("/staff", "layout");
}
