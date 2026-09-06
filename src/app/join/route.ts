import { NextResponse } from "next/server";
import { REF_COOKIE, REF_COOKIE_MAX_AGE_SECONDS } from "@/lib/referral-cookie";

// https://<domain>/join?ref=CODE — the shareable referral link. Stashes the
// code in a cookie (not just the query string) so it survives a detour
// through another page before signup, then redirects straight to the
// pre-filled signup form.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");

  const redirectUrl = new URL("/signup", url.origin);
  if (ref) redirectUrl.searchParams.set("ref", ref);

  const response = NextResponse.redirect(redirectUrl);
  if (ref) {
    response.cookies.set(REF_COOKIE, ref, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REF_COOKIE_MAX_AGE_SECONDS,
    });
  }
  return response;
}
