import "server-only";
import { SignJWT, jwtVerify } from "jose";

// Short-lived signed QR payload for an event ticket check-in — same
// pattern and TTL as reward-token.ts, kept as a separate token type so a
// leaked reward QR can never be replayed as a ticket scan or vice versa.
// The booking's own bookingRef is the manual fallback for a failed scan.
const TOKEN_TTL_SECONDS = 120;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env.local and fill it in.");
  }
  return new TextEncoder().encode(secret);
}

export async function signTicketToken(bookingId: string) {
  return new SignJWT({ bk: bookingId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyTicketToken(token: string): Promise<{ bookingId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.bk !== "string") return null;
    return { bookingId: payload.bk };
  } catch {
    return null;
  }
}
