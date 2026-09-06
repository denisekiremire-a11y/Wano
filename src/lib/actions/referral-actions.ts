"use server";

import { getReferrerNameByCode } from "@/lib/data/traveller";

/** Called on blur from the signup form's referral code field. Never throws
 * on an unknown code — an invalid code must never block sign-up, it just
 * shows no confirmation. */
export async function validateReferralCodeAction(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, referrerName: null };

  const name = await getReferrerNameByCode(trimmed);
  return { valid: name !== null, referrerName: name };
}
