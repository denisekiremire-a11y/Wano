"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Subscribes (as the signed-in admin) to reservation and gift changes and refreshes the
 * server-rendered admin page, so new reservations appear without reloading.
 */
export function AdminLiveRefresh({ url, anonKey }: { url: string; anonKey: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase(url, anonKey);
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    let channel: ReturnType<typeof sb.channel> | null = null;
    let cancelled = false;
    (async () => {
      // Make sure realtime uses the admin's JWT so RLS lets reservation events through.
      const { data } = await sb.auth.getSession();
      if (data.session) await sb.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = sb
        .channel(`admin-live-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "gifts" }, refresh)
        .subscribe((s) => {
          if (!cancelled) setLive(s === "SUBSCRIBED");
        });
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      if (channel) void sb.removeChannel(channel);
    };
  }, [url, anonKey, router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" data-testid="admin-live" data-live={live ? "live" : "off"}>
      <span className={`size-2 rounded-full ${live ? "bg-sage-600" : "bg-sand"}`} />
      {live ? "Live" : "Connecting…"}
    </span>
  );
}
