import { NextResponse } from "next/server";
import { EMAIL_COOKIE, emailCookieOptions, verifyEmailToken } from "@/lib/email-link";

/** A guest's emailed link. Remembers it on this device, then shows /my-gifts without the token in the address bar. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const to = new URL("/my-gifts", req.url);
  if (!verifyEmailToken(token)) {
    to.searchParams.set("link", "expired");
    return NextResponse.redirect(to, 303);
  }
  const res = NextResponse.redirect(to, 303);
  res.cookies.set(EMAIL_COOKIE, token, emailCookieOptions);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
