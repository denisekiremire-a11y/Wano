import { afterAll, describe, expect, it } from "vitest";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { anon, cleanupGifts, makeGift, reserve } from "./helpers";

afterAll(async () => {
  await cleanupGifts();
});

function subscribe(table: string, onEvent: (p: Record<string, unknown>) => void): Promise<{ channel: RealtimeChannel; client: ReturnType<typeof anon> }> {
  const client = anon();
  return new Promise((resolve, reject) => {
    const channel = client
      .channel(`test-${table}-${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (p) => onEvent(p as unknown as Record<string, unknown>))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") resolve({ channel, client });
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
      });
  });
}

describe("Supabase Realtime", () => {
  it("pushes a gift's change to RESERVED to every open (anonymous) registry session", async () => {
    const id = await makeGift("Realtime gift");
    const seen: { a: string[]; b: string[] } = { a: [], b: [] };
    const a = await subscribe("gifts", (p) => {
      const n = p.new as { id?: string; status?: string };
      if (n?.id === id && n.status) seen.a.push(n.status);
    });
    const b = await subscribe("gifts", (p) => {
      const n = p.new as { id?: string; status?: string };
      if (n?.id === id && n.status) seen.b.push(n.status);
    });
    await new Promise((r) => setTimeout(r, 1000)); // let the subscriptions settle server-side
    expect((await reserve(id)).ok).toBe(true);
    const start = Date.now();
    while ((!seen.a.includes("reserved") || !seen.b.includes("reserved")) && Date.now() - start < 10_000) await new Promise((r) => setTimeout(r, 100));
    expect(seen.a).toContain("reserved");
    expect(seen.b).toContain("reserved");
    for (const s of [a, b]) await s.client.removeChannel(s.channel);
  });

  it("never broadcasts reservation rows (guest details) to anonymous subscribers", async () => {
    const leaked: unknown[] = [];
    const s = await subscribe("reservations", (p) => leaked.push(p));
    await new Promise((r) => setTimeout(r, 1000));
    await reserve(await makeGift(), "Leaky Guest", { p_guest_email: "leak@example.com" });
    await new Promise((r) => setTimeout(r, 3000));
    // Realtime may emit an empty "Error 401: Unauthorized" notice; it must never carry row data.
    for (const p of leaked as { new?: object; old?: object; errors?: string[] }[]) {
      expect(p.new ?? {}).toEqual({});
      expect(p.old ?? {}).toEqual({});
      expect(p.errors?.join(" ")).toMatch(/Unauthorized/);
    }
    expect(JSON.stringify(leaked)).not.toMatch(/Leaky|leak@example/);
    await s.client.removeChannel(s.channel);
  });
});
