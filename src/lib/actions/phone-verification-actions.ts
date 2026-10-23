"use server";

import { randomInt } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { phoneVerificationCodes, travellerProfiles } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { sendWhatsappTemplate } from "@/lib/whatsapp";
import { toWhatsAppNumber } from "@/lib/afcon/phone";
import type { ActionState } from "@/lib/validation";

const CODE_TTL_MINUTES = 10;

function generateCode() {
  return String(randomInt(100000, 1000000));
}

/** phone_verification_codes is admin-only under RLS (see
 * manual_wano_part_b.sql) — the real access control is the code value
 * itself, short-lived and single-use, plus this action's own
 * requireRole("traveller") check that it belongs to the caller. */
export async function sendPhoneVerificationCodeAction(): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };
  if (travellerProfile.phoneVerifiedAt) return { error: "Your phone is already verified." };
  if (!travellerProfile.phone) return { error: "Add a phone number to your profile first." };

  const toPhone = toWhatsAppNumber(travellerProfile.phone);
  if (!toPhone) return { error: "That phone number doesn't look valid." };

  const code = generateCode();
  await withRlsContext({ role: "admin" }, (tx) =>
    tx.insert(phoneVerificationCodes).values({
      travellerId: travellerProfile.id,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    }),
  );

  await sendWhatsappTemplate({
    toPhone,
    templateName: "wano_phone_verification",
    parameters: [{ name: "code", value: code }],
  });

  return {};
}

export async function verifyPhoneCodeAction(rawCode: string): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const trimmed = rawCode.trim();
  if (!trimmed) return { error: "Enter the code you received." };

  const verified = await withRlsContext({ role: "admin" }, async (tx) => {
    const [row] = await tx
      .select({ id: phoneVerificationCodes.id })
      .from(phoneVerificationCodes)
      .where(
        and(
          eq(phoneVerificationCodes.travellerId, travellerProfile.id),
          eq(phoneVerificationCodes.code, trimmed),
          isNull(phoneVerificationCodes.usedAt),
          gt(phoneVerificationCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) return false;

    await tx.update(phoneVerificationCodes).set({ usedAt: new Date() }).where(eq(phoneVerificationCodes.id, row.id));
    await tx
      .update(travellerProfiles)
      .set({ phoneVerifiedAt: new Date() })
      .where(eq(travellerProfiles.id, travellerProfile.id));
    return true;
  });

  if (!verified) return { error: "That code is invalid or has expired." };
  return {};
}
