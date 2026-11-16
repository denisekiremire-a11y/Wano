import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the admin area needs a session; public pages never touch auth cookies.
export const config = {
  matcher: ["/admin/:path*"],
};
