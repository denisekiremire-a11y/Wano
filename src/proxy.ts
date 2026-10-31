import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// "/social" itself is deliberately absent — the feed is public and
// indexable per the milestone brief. Club detail and category-browse
// pages are public too now (shareable links, Luma-features Phase 1) —
// soft-gated at the page level the same way "/passport" and "/saved"
// already are (a signed-out visitor sees a join/sign-up prompt instead of
// member-only actions, not a hard redirect). Only "/social/clubs/apply"
// stays a real member-only page, since applying to start a club already
// requires an account. "/onboarding" is unrelated to clubs — still fully
// member-gated.
const MEMBER_PREFIXES = ["/dashboard", "/social/clubs/apply", "/onboarding"];

const roleForPrefix = (pathname: string): "traveller" | "vendor" | "admin" | null => {
  if (MEMBER_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "traveller";
  if (pathname.startsWith("/vendor/dashboard")) return "vendor";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiredRole = roleForPrefix(pathname);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (requiredRole) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== requiredRole) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if ((pathname === "/login" || pathname === "/signup") && session) {
    const dest =
      session.role === "vendor" ? "/vendor/dashboard" : session.role === "admin" ? "/admin" : "/explore";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/social/clubs/apply",
    "/onboarding/:path*",
    "/vendor/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
