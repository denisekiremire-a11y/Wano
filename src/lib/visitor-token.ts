import "server-only";
import { SignJWT, jwtVerify } from "jose";

// Short-lived signed QR payload for a traveller's personal "Wano QR" —
// same 120s-TTL shape as reward-token.ts, with its own claim name ("tp")
// so a visitor token can never be replayed as a reward or ticket token
// (each of those three uses a distinct claim).
const TOKEN_TTL_SECONDS = 120;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env.local and fill it in.");
  }
  return new TextEncoder().encode(secret);
}

export async function signVisitorToken(travellerProfileId: string) {
  return new SignJWT({ tp: travellerProfileId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyVisitorToken(token: string): Promise<{ travellerProfileId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.tp !== "string") return null;
    return { travellerProfileId: payload.tp };
  } catch {
    return null;
  }
}
