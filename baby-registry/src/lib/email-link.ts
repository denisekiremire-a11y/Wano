import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed "My gifts" links for guests who gave an email address. The token carries the email and
 * an expiry, signed with a server-only secret, so whoever opens the link from that inbox can see
 * the gifts reserved with that email — on any device — and nobody can forge one for another email.
 *
 * Format: base64url(JSON{e: email, x: expiry-seconds}) + "." + base64url(HMAC-SHA256)
 */
export const EMAIL_COOKIE = "registry_guest_email";
const DAY = 86_400;
export const LINK_TTL_DAYS = 365;

function secret(): string {
  const s =
    process.env.LINK_SIGNING_SECRET ||
    process.env.RESERVATION_HASH_SALT ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("No signing secret configured (set RESERVATION_HASH_SALT).");
  return `my-gifts-link:${s}`;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createEmailToken(email: string, ttlDays = LINK_TTL_DAYS, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ e: normaliseEmail(email), x: Math.floor(now / 1000) + ttlDays * DAY })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the email if the token is genuine and unexpired, otherwise null. Never throws. */
export function verifyEmailToken(token: unknown, now = Date.now()): string | null {
  if (typeof token !== "string" || token.length > 800) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { e?: unknown; x?: unknown };
    if (typeof data.e !== "string" || typeof data.x !== "number") return null;
    if (data.x * 1000 < now) return null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.e)) return null;
    return data.e;
  } catch {
    return null;
  }
}

export const emailCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: LINK_TTL_DAYS * DAY,
};
