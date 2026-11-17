import { NextResponse } from "next/server";
import { GUEST_COOKIE, guestCookieOptions, isValidGuestKey } from "@/lib/guest-key";

/**
 * A guest's private link (from their confirmation page or email). Opening it on any device
 * remembers the key in a cookie, then shows /my-gifts — so the address bar never keeps the key.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const to = new URL("/my-gifts", req.url);
  if (!isValidGuestKey(key)) {
    to.searchParams.set("link", "invalid");
    return NextResponse.redirect(to, 303);
  }
  const res = NextResponse.redirect(to, 303);
  res.cookies.set(GUEST_COOKIE, key, guestCookieOptions);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
