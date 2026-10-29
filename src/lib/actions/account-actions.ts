"use server";

import { randomBytes } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  follows,
  passwordResetTokens,
  postComments,
  posts,
  reviews,
  savedListings,
  stories,
  travellerProfiles,
  users,
} from "@/db/schema";
import { DELETED_MEMBER_NAME, deletedAccountEmail } from "@/lib/account-deletion";
import { hashPassword, requireRole } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { clearSessionCookie } from "@/lib/session";
import type { ActionState } from "@/lib/validation";

/** "Delete my account" on Passport > Account (required by Apple and
 * Google for any app with sign-up). Removes everything that identifies
 * the person and everything they published, then signs them out:
 * - public content: posts (and their images/likes, by cascade), stories,
 *   comments,
 *   reviews, follows both ways, saved places
 * - personal details on users + traveller_profiles: name, email, phone,
 *   birthday, city, bio, photo, username
 * - the password, replaced with a random one nobody knows
 * Bookings, check-ins and XP history stay, attached to the now-anonymous
 * profile, so venues' records and Wano's totals still add up (the privacy
 * notice keeps booking records for accounting). The profile row itself is
 * kept for the same reason: deleting it would cascade into bookings. */
export async function deleteMyAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE in the box to confirm." };
  }

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  const unusablePassword = await hashPassword(randomBytes(32).toString("hex"));

  await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    async (tx) => {
      await tx.delete(posts).where(eq(posts.travellerId, travellerProfile.id));
      await tx.delete(stories).where(eq(stories.travellerId, travellerProfile.id));
      await tx.delete(postComments).where(eq(postComments.travellerId, travellerProfile.id));
      await tx.delete(reviews).where(eq(reviews.travellerId, travellerProfile.id));
      await tx
        .delete(follows)
        .where(or(eq(follows.followerId, travellerProfile.id), eq(follows.followingId, travellerProfile.id)));
      await tx.delete(savedListings).where(eq(savedListings.travellerId, travellerProfile.id));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, session.userId));

      await tx
        .update(travellerProfiles)
        .set({
          displayName: DELETED_MEMBER_NAME,
          dateOfBirth: null,
          persona: null,
          city: null,
          phone: null,
          phoneVerifiedAt: null,
          showActivityInFeed: false,
          grandPrizeEntered: false,
          creatorApprovedAt: null,
        })
        .where(eq(travellerProfiles.id, travellerProfile.id));

      await tx
        .update(users)
        .set({
          name: DELETED_MEMBER_NAME,
          email: deletedAccountEmail(session.userId),
          passwordHash: unusablePassword,
          username: null,
          bio: null,
          avatarUrl: null,
          location: null,
          emailVerifiedAt: null,
          suspendedAt: new Date(),
        })
        .where(eq(users.id, session.userId));
    },
  );

  await clearSessionCookie();
  redirect("/account-deleted");
}
