import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * A guest's private "My gifts" key. Random (192 bits), kept in an httpOnly cookie and in a
 * personal link the guest can bookmark or open on another device. The database stores only
 * a SHA-256 hash of it.
 */
export const GUEST_COOKIE = "registry_guest";
const KEY_RE = /^[A-Za-z0-9_-]{32,128}$/;
const TWO_YEARS = 60 * 60 * 24 * 730;

export function isValidGuestKey(key: unknown): key is string {
  return typeof key === "string" && KEY_RE.test(key);
}

export function newGuestKey(): string {
  return randomBytes(24).toString("base64url"); // 32 chars
}

export const guestCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TWO_YEARS,
};

/** Read the current guest key (server components, actions, route handlers). */
export async function readGuestKey(): Promise<string | null> {
  const value = (await cookies()).get(GUEST_COOKIE)?.value;
  return isValidGuestKey(value) ? value : null;
}

/** Read or create the guest key (server actions / route handlers only — sets a cookie). */
export async function ensureGuestKey(): Promise<string> {
  const existing = await readGuestKey();
  if (existing) return existing;
  const key = newGuestKey();
  (await cookies()).set(GUEST_COOKIE, key, guestCookieOptions);
  return key;
}
