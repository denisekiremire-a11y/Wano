import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// The staff link (src/app/staff/[token]) lets venue staff unlock scanning
// without ever seeing the vendor's email/password — they open the
// bookmarked link and type the venue PIN once, which sets this cookie for
// the rest of their shift. Same signing primitive as session.ts/
// ticket-token.ts, just a longer TTL than the 120s QR tokens (a shift, not
// a single scan) and much shorter than the 30-day login session (a lost or
// borrowed phone self-expires instead of staying unlocked for a month).
export const STAFF_SESSION_COOKIE = "wano_staff_session";
const STAFF_SESSION_DURATION_SECONDS = 12 * 60 * 60;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env.local and fill it in.");
  }
  return new TextEncoder().encode(secret);
}

// The staff link's own token is baked into the cookie (not just the
// vendor id) so rotating it — lost phone, staff turnover — invalidates
// every already-unlocked session immediately, not just future unlocks:
// requireVendorAccess rejects the cookie the moment its embedded token
// stops matching the vendor's current staffAccessToken.
export async function signStaffSession(vendorProfileId: string, staffAccessToken: string) {
  return new SignJWT({ vp: vendorProfileId, tok: staffAccessToken })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STAFF_SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifyStaffSessionToken(token: string): Promise<{ vendorProfileId: string; staffAccessToken: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.vp !== "string" || typeof payload.tok !== "string") return null;
    return { vendorProfileId: payload.vp, staffAccessToken: payload.tok };
  } catch {
    return null;
  }
}

export async function createStaffSessionCookie(vendorProfileId: string, staffAccessToken: string) {
  const token = await signStaffSession(vendorProfileId, staffAccessToken);
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_SESSION_DURATION_SECONDS,
  });
}

/** The vendor a staff member unlocked and the staff-link token their
 * cookie was issued against, if it's still a well-formed, unexpired JWT —
 * null for everyone else (no cookie, expired, or tampered). Does NOT
 * confirm that token is still the vendor's *current* staffAccessToken
 * (checked separately in requireVendorAccess, against the live row), so a
 * rotated link's cookies read as present here but get rejected there. */
export async function getStaffSession(): Promise<{ vendorProfileId: string; staffAccessToken: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyStaffSessionToken(token);
}

export async function clearStaffSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
}
