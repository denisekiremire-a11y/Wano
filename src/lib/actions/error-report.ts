"use server";

import { notifyAdmin } from "@/lib/notify";

/** Fired from the client error boundaries (error.tsx, global-error.tsx) so
 * a crash reaches an inbox instead of only ever showing up if someone
 * happens to check Vercel's function logs. Best-effort: notifyAdmin
 * already swallows its own failures, so this never throws back at the
 * error boundary that called it. */
export async function reportClientErrorAction(message: string, digest: string | undefined, path: string) {
  await notifyAdmin("Site error", [
    `<strong>${path}</strong>`,
    `Digest: ${digest ?? "none"}`,
    `<pre style="white-space:pre-wrap">${message}</pre>`,
  ]);
}
