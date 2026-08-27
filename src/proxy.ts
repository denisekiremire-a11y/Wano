import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const MEMBER_PREFIXES = ["/dashboard", "/home", "/bookings", "/profile", "/social", "/onboarding", "/rewards"];

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
      session.role === "vendor" ? "/vendor/dashboard" : session.role === "admin" ? "/admin" : "/home";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/home/:path*",
    "/bookings/:path*",
    "/profile",
    "/social/:path*",
    "/onboarding/:path*",
    "/rewards",
    "/vendor/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
