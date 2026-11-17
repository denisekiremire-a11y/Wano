"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EMAIL_COOKIE, createEmailToken, emailCookieOptions, normaliseEmail } from "@/lib/email-link";

export type SignInResult = { ok: boolean; message: string };

/**
 * "Sign in" to My gifts with just an email address (the family chose no password and no code).
 * It only lets someone see which gifts were reserved with that email — never contact details,
 * and nothing can be changed — so a typed email is enough.
 */
export async function signInWithEmailAction(_prev: SignInResult | null, fd: FormData): Promise<SignInResult> {
  const email = normaliseEmail(String(fd.get("email") ?? "")).slice(0, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Please enter the email address you used when reserving." };
  if (String(fd.get("hp_x") ?? "") !== "") return { ok: false, message: "Please try again." };
  (await cookies()).set(EMAIL_COOKIE, createEmailToken(email), emailCookieOptions);
  redirect("/my-gifts");
}

export async function signOutEmailAction(): Promise<void> {
  (await cookies()).delete(EMAIL_COOKIE);
  redirect("/my-gifts");
}
