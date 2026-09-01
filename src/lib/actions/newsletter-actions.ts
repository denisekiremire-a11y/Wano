"use server";

import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import type { ActionState } from "@/lib/validation";

function token() {
  return randomBytes(24).toString("hex");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function subscribeToNewsletterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const source = String(formData.get("source") ?? "unknown");

  if (!email || !email.includes("@")) return { error: "Enter a valid email." };

  const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);

  if (existing) {
    if (existing.confirmed) return { error: "You're already subscribed." };
    // Not confirmed yet — resend the confirm link rather than erroring.
    await sendEmail({
      to: email,
      subject: "Confirm your Wano newsletter signup",
      html: `<p>Click to confirm: <a href="${APP_URL}/newsletter/confirm?token=${existing.confirmToken}">${APP_URL}/newsletter/confirm?token=${existing.confirmToken}</a></p>`,
    });
    return {};
  }

  const confirmToken = token();
  const unsubscribeToken = token();
  await db.insert(subscribers).values({
    email,
    name: name || null,
    source,
    confirmToken,
    unsubscribeToken,
  });

  await sendEmail({
    to: email,
    subject: "Confirm your Wano newsletter signup",
    html: `<p>Click to confirm: <a href="${APP_URL}/newsletter/confirm?token=${confirmToken}">${APP_URL}/newsletter/confirm?token=${confirmToken}</a></p>`,
  });

  return {};
}
