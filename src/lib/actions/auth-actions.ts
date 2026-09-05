"use server";

import { and, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  challengeCompletions,
  challenges,
  loginAttempts,
  travellerProfiles,
  users,
  vendorProfiles,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { notifyAdmin } from "@/lib/notify";
import { generateReferralCode } from "@/lib/referral";
import { clearSessionCookie, createSessionCookie } from "@/lib/session";
import { uniqueUsername } from "@/lib/username";
import { loginSchema, signupSchema, type ActionState } from "@/lib/validation";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 15;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  if (await isRateLimited(parsed.data.email)) {
    return { error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user) {
    await recordLoginAttempt(parsed.data.email, false);
    return { error: "No account found with that email." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  await recordLoginAttempt(parsed.data.email, valid);
  if (!valid) return { error: "Incorrect password." };

  await createSessionCookie({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }

  if (user.role === "vendor") redirect("/vendor/dashboard");
  if (user.role === "admin") redirect("/admin");
  redirect("/explore");
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const role = formData.get("role");
  const referredByCode = formData.get("ref");

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
    return { error: parsed.error.issues[0]?.message ?? "Please check your details and try again." };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing) return { error: "An account with that email already exists." };

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

    await db.insert(travellerProfiles).values({
      userId: user.id,
      displayName: parsed.data.name,
      referralCode: await uniqueReferralCode(),
      referredByTravellerId: referrer?.id ?? null,
    });

    if (referrer) {
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
  });

  redirect(parsed.data.role === "vendor" ? "/vendor/dashboard" : "/onboarding");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
