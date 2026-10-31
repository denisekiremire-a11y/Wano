"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { travellerProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { sendVerificationEmail } from "@/lib/actions/email-verification-actions";
import { createSessionCookie } from "@/lib/session";
import { toWhatsAppNumber } from "@/lib/afcon/phone";
import type { ActionState } from "@/lib/validation";

const birthdaySchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
});

export async function updateBirthdayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("traveller");
  const parsed = birthdaySchema.safeParse({ dateOfBirth: formData.get("dateOfBirth") });
  if (!parsed.success) return { error: "Enter a valid birthday." };

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  await withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, async (tx) => {
    await tx
      .update(travellerProfiles)
      .set({ dateOfBirth: parsed.data.dateOfBirth })
      .where(eq(travellerProfiles.id, travellerProfile.id));
  });

  revalidatePath("/passport");
  return {};
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().max(32, "Phone number is too long.").optional(),
});

/** Name, email and phone together — the one "edit your profile" form on
 * the Account tab. Keeps travellerProfiles.displayName in sync with
 * users.name (same invariant updateTravellerNameAction maintains for an
 * admin-initiated rename). Changing the email re-verifies it exactly like
 * signup does (clears emailVerifiedAt, sends a fresh link to the new
 * address) since the old verification no longer proves anything about a
 * different inbox; changing the phone likewise clears phoneVerifiedAt
 * (see phone-verification-actions.ts) without re-sending automatically —
 * the traveller re-triggers that themselves via PhoneVerifyInline, same as
 * if they'd never verified at all. The session cookie carries name/email
 * too (see session.ts), so it's reissued here or the old values would
 * linger in it until the next login. */
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields and try again." };
  const { name, email } = parsed.data;
  const rawPhone = parsed.data.phone?.trim() ?? "";

  let phone: string | null = null;
  if (rawPhone) {
    if (!toWhatsAppNumber(rawPhone)) return { error: "That phone number doesn't look valid." };
    phone = rawPhone;
  }

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  const [current] = await db.select({ email: users.email }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (!current) return { error: "Account not found." };

  const emailChanged = email !== current.email;
  if (emailChanged) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, session.userId)))
      .limit(1);
    if (existing) return { error: "That email is already in use by another account." };
  }
  const phoneChanged = phone !== travellerProfile.phone;

  await db
    .update(users)
    .set({ name, email, ...(emailChanged ? { emailVerifiedAt: null } : {}) })
    .where(eq(users.id, session.userId));

  await withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, (tx) =>
    tx
      .update(travellerProfiles)
      .set({ displayName: name, phone, ...(phoneChanged ? { phoneVerifiedAt: null } : {}) })
      .where(eq(travellerProfiles.id, travellerProfile.id)),
  );

  await createSessionCookie({ ...session, name, email });

  if (emailChanged) {
    await sendVerificationEmail(session.userId, email);
  }

  revalidatePath("/passport");
  revalidatePath("/social");

  return {};
}

export async function setFeedActivityVisibilityAction(showActivityInFeed: boolean) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return;

  await withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, async (tx) => {
    await tx
      .update(travellerProfiles)
      .set({ showActivityInFeed })
      .where(eq(travellerProfiles.id, travellerProfile.id));
  });

  revalidatePath("/social");
  revalidatePath("/passport");
}

export async function setAttendeeListVisibilityAction(hideFromAttendeeLists: boolean) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return;

  await withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, async (tx) => {
    await tx
      .update(travellerProfiles)
      .set({ hideFromAttendeeLists })
      .where(eq(travellerProfiles.id, travellerProfile.id));
  });

  revalidatePath("/events");
  revalidatePath("/social");
  revalidatePath("/passport");
}
