"use server";

import { and, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  challengeCompletions,
  challenges,
  loginAttempts,
  follows,
  referralCredits,
  travellerProfiles,
  users,
  vendorProfiles,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { finalizeFunzoneClaim } from "@/lib/actions/funzone-actions";
import { sendVerificationEmail } from "@/lib/actions/email-verification-actions";
import { withRlsContext } from "@/lib/db-context";
import { notifyAdmin } from "@/lib/notify";
import { generateReferralCode } from "@/lib/referral";
import { clearSessionCookie, createSessionCookie } from "@/lib/session";
import { uniqueUsername } from "@/lib/username";
import { loginSchema, signupSchema, type ActionState } from "@/lib/validation";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 15;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type InlineAuthState = { error?: string; success?: boolean };

async function recordLoginAttempt(email: string, success: boolean) {
  await db.insert(loginAttempts).values({ email: email.toLowerCase(), success });
}

async function isRateLimited(email: string) {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000);
  const recentFailures = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email.toLowerCase()),
        eq(loginAttempts.success, false),
        gte(loginAttempts.createdAt, since),
      ),
    );
  return recentFailures.length >= MAX_FAILED_ATTEMPTS;
}

async function uniqueReferralCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const [existing] = await db
      .select({ id: travellerProfiles.id })
      .from(travellerProfiles)
      .where(eq(travellerProfiles.referralCode, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique referral code.");
}

async function performLogin(
  formData: FormData,
): Promise<{ ok: false; error: string } | { ok: true; user: typeof users.$inferSelect }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "Enter a valid email and password." };

  if (await isRateLimited(parsed.data.email)) {
    return { ok: false, error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user) {
    await recordLoginAttempt(parsed.data.email, false);
    return { ok: false, error: "No account found with that email." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  await recordLoginAttempt(parsed.data.email, valid);
  if (!valid) return { ok: false, error: "Incorrect password." };

  await createSessionCookie({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    adminLevel: user.adminLevel,
  });

  // Skip notifying on the admin's own logins — the point is visibility into
  // other people using the app, not emailing yourself every time you do.
  if (user.role !== "admin") {
    await notifyAdmin("User login", [`<strong>${user.name}</strong> (${user.email}) logged in — ${user.role}.`]);
  }

  return { ok: true, user };
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await performLogin(formData);
  if (!result.ok) return { error: result.error };
  const { user } = result;

  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }

  if (user.role === "vendor") redirect("/vendor/dashboard");
  if (user.role === "admin") redirect("/admin");
  redirect("/explore");
}

// Used by InlineAuthGate (booking CTAs on public pages): same auth logic as
// loginAction, but returns instead of redirecting, so the caller stays put
// and the booking form appears once the page refreshes with the new
// session — no round trip through /login and back. `success` (rather than
// just the absence of `error`) lets the gate tell "submitted successfully"
// apart from "hasn't submitted yet", since both start as an empty state.
export async function inlineLoginAction(_prev: InlineAuthState, formData: FormData): Promise<InlineAuthState> {
  const result = await performLogin(formData);
  return result.ok ? { success: true } : { error: result.error };
}

async function performSignup(
  formData: FormData,
): Promise<{ ok: false; error: string } | { ok: true; role: "traveller" | "vendor" }> {
  const role = formData.get("role");
  const referredByCode = formData.get("ref");
  const claimCode = formData.get("claim");

  const raw =
    role === "vendor"
      ? {
          role: "vendor" as const,
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          businessName: formData.get("businessName"),
          location: formData.get("location"),
          description: formData.get("description"),
        }
      : {
          role: "traveller" as const,
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details and try again." };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing) return { ok: false, error: "An account with that email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);

  const [user] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      username: await uniqueUsername(parsed.data.name),
    })
    .returning();

  await sendVerificationEmail(user.id, user.email);

  if (parsed.data.role === "traveller") {
    let referrer = null;
    if (typeof referredByCode === "string" && referredByCode.trim()) {
      const [row] = await db
        .select()
        .from(travellerProfiles)
        .where(eq(travellerProfiles.referralCode, referredByCode.trim().toUpperCase()))
        .limit(1);
      referrer = row ?? null;
    }

    const newProfile = await withRlsContext({ userId: user.id, role: "traveller" }, async (tx) => {
      const [row] = await tx
        .insert(travellerProfiles)
        .values({
          userId: user.id,
          displayName: parsed.data.name,
          referralCode: await uniqueReferralCode(),
          referredByTravellerId: referrer?.id ?? null,
          referredAt: referrer ? new Date() : null,
        })
        .returning();
      return row;
    });

    if (typeof claimCode === "string" && claimCode.trim()) {
      await finalizeFunzoneClaim(claimCode.trim(), newProfile.id);
    }

    if (referrer) {
      // The 150-point referral bonus doesn't land yet — see
      // awardReferralCreditOnFirstBooking, called once this referee's
      // first booking is confirmed. Until then it just sits here as
      // "pending" so the referrer can see it's on its way.
      await db.insert(referralCredits).values({
        referrerId: referrer.id,
        refereeId: newProfile.id,
      });

      // Joining from a friend's invite makes them friends straight away,
      // so the new member's home shows where that friend is going.
      await db
        .insert(follows)
        .values([
          { followerId: newProfile.id, followingId: referrer.id },
          { followerId: referrer.id, followingId: newProfile.id },
        ])
        .onConflictDoNothing();

      const [referChallenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.key, "refer-a-friend"))
        .limit(1);

      if (referChallenge) {
        const [alreadyCompleted] = await db
          .select()
          .from(challengeCompletions)
          .where(
            and(
              eq(challengeCompletions.travellerId, referrer.id),
              eq(challengeCompletions.challengeId, referChallenge.id),
            ),
          )
          .limit(1);

        if (!alreadyCompleted) {
          await db.insert(challengeCompletions).values({
            travellerId: referrer.id,
            challengeId: referChallenge.id,
            status: "verified",
            completedAt: new Date(),
          });
        }
      }
      await logEvent("referral_converted", { userId: user.id, role: "traveller" });
    }
  } else {
    await db.insert(vendorProfiles).values({
      userId: user.id,
      businessName: parsed.data.businessName,
      location: parsed.data.location,
      description: parsed.data.description,
      accreditationStatus: "pending",
    });
  }

  if (parsed.data.role === "vendor") {
    await notifyAdmin("New partner signup", [
      `<strong>${parsed.data.businessName}</strong> just signed up as a partner.`,
      `Contact: ${parsed.data.name} — ${parsed.data.email}`,
      `Location: ${parsed.data.location}`,
      `Review in <a href="${APP_URL}/admin/vendors">/admin/vendors</a>.`,
    ]);
  } else {
    await notifyAdmin("New user signup", [
      `<strong>${parsed.data.name}</strong> just signed up — ${parsed.data.email}`,
    ]);
  }

  await createSessionCookie({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    // Signup never creates admin accounts (see requireAdminLevel).
    adminLevel: null,
  });

  return { ok: true, role: parsed.data.role };
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await performSignup(formData);
  if (!result.ok) return { error: result.error };
  redirect(result.role === "vendor" ? "/vendor/dashboard" : "/onboarding");
}

// Used by InlineAuthGate (booking CTAs on public pages): same signup logic
// as signupAction (including the verification email), but returns instead
// of redirecting to /onboarding — the caller stays on the listing/event
// page it was booking, now with a session, and the page refreshes to show
// the real booking form in place of the CTA.
export async function inlineSignupAction(_prev: InlineAuthState, formData: FormData): Promise<InlineAuthState> {
  const result = await performSignup(formData);
  return result.ok ? { success: true } : { error: result.error };
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
