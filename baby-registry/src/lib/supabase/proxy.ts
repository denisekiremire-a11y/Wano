import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublicKey, supabaseUrl } from "../env";

/**
 * Refreshes the Supabase auth session cookie and gates /admin/*. This is the first layer only:
 * every admin page, action and export ALSO verifies admin status server-side, and RLS enforces
 * it again in the database.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const url = supabaseUrl();
  const key = supabasePublicKey();
  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";

  if (!url || !key) {
    if (isLogin) return response;
    const to = request.nextUrl.clone();
    to.pathname = "/admin/login";
    to.search = "";
    return NextResponse.redirect(to);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalidates the JWT with Supabase Auth (getSession() would trust the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    const to = request.nextUrl.clone();
    to.pathname = "/admin/login";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  return response;
}
