import "server-only";
import { SignJWT, jwtVerify } from "jose";

// Short-lived signed QR payload for reward redemption — 120s, refreshed by
// the client while the voucher card is open, so a screenshot of the QR
// stops working almost immediately. The static redemptionCode on
// user_rewards is the manual fallback for when a scan fails; it still
// requires the venue PIN before anything is marked redeemed (see
// markRewardRedeemedAction), so a leaked code alone is never enough.
const TOKEN_TTL_SECONDS = 120;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env.local and fill it in.");
  }
  return new TextEncoder().encode(secret);
}

export async function signRewardToken(userRewardId: string) {
  return new SignJWT({ ur: userRewardId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyRewardToken(token: string): Promise<{ userRewardId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.ur !== "string") return null;
    return { userRewardId: payload.ur };
  } catch {
    return null;
  }
}
