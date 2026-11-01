import { timingSafeEqual } from "crypto";

/** Constant-time string comparison for secrets compared against an
 * incoming request (the cron bearer token, Flutterwave's webhook hash) —
 * a plain === leaks how many leading bytes matched through response
 * timing, which matters here since both of these are reachable by anyone
 * who knows the URL, not just an authenticated caller. node:crypto's
 * timingSafeEqual throws on a length mismatch rather than returning
 * false, so that case is handled explicitly up front; comparing lengths
 * first does leak the secret's length, but that's the accepted tradeoff
 * this exact pattern makes everywhere it's used (Node's own docs recommend
 * it) — the secret's length was never the part worth protecting. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
