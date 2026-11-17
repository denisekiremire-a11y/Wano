import "server-only";
import { headers } from "next/headers";

/** The site's public origin: SITE_URL, else (on Vercel production) the main project address, else the incoming request. */
export async function siteUrl(): Promise<string> {
  const fixed = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fixed && /^https?:\/\//.test(fixed)) return fixed;
  // On Vercel, always use the project's main address — never a one-off deployment address,
  // which stays frozen on an old version of the site.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production && process.env.VERCEL_ENV === "production") return `https://${production.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
