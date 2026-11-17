"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getPledgesByEmail } from "@/lib/data";
import { createEmailToken, normaliseEmail } from "@/lib/email-link";
import { emailConfig, listLinkEmail, sendEmail } from "@/lib/notify";
import { siteUrl } from "@/lib/site-url";
import { getServiceSupabase } from "@/lib/supabase/service";

export type ListLinkResult = { ok: boolean; message: string };

const SAME_REPLY = "If there are gifts reserved with that email, we’ve sent a link to it. Please check your inbox (and spam folder).";

async function clientHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const salt = process.env.RESERVATION_HASH_SALT || "salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 40);
}

/**
 * "Email me my list". Always answers the same way, so it can't be used to find out whether an
 * email address has reservations. Throttled per client.
 */
export async function requestListLinkAction(_prev: ListLinkResult | null, fd: FormData): Promise<ListLinkResult> {
  const email = normaliseEmail(String(fd.get("email") ?? "")).slice(0, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Please enter a valid email address." };
  if (String(fd.get("hp_x") ?? "") !== "") return { ok: true, message: SAME_REPLY };

  const cfg = emailConfig();
  if (!cfg.canEmailGuests) {
    return { ok: false, message: "Emailing lists isn’t switched on yet. Please use the link on your confirmation page, or ask the family." };
  }

  try {
    const sb = getServiceSupabase();
    const client = `list:${await clientHash()}`;
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await sb.from("reservation_attempts").select("id", { count: "exact", head: true }).eq("client_hash", client).gte("created_at", since);
    if ((count ?? 0) >= 5) return { ok: false, message: "Too many requests. Please wait a few minutes and try again." };
    await sb.from("reservation_attempts").insert({ client_hash: client, outcome: "list_link" });

    const pledges = await getPledgesByEmail(email);
    const live = pledges.filter((p) => p.status === "active" || p.status === "purchased");
    if (live.length) {
      const origin = await siteUrl();
      const link = `${origin}/my-gifts/e/${createEmailToken(email, 30)}`;
      await sendEmail({ to: [email], ...listLinkEmail({ siteUrl: origin, link, count: live.length }) });
    }
  } catch (e) {
    console.error("requestListLinkAction", e instanceof Error ? e.message : e);
  }
  return { ok: true, message: SAME_REPLY };
}
