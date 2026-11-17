import "server-only";
import { headers } from "next/headers";

/** The site's public origin: SITE_URL if set, otherwise derived from the incoming request. */
export async function siteUrl(): Promise<string> {
  const fixed = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fixed && /^https?:\/\//.test(fixed)) return fixed;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
