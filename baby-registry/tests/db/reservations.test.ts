import { afterAll, describe, expect, it } from "vitest";
import { anon, cleanupGifts, makeGift, pool, reserve, service, uniqueClient } from "./helpers";

afterAll(async () => {
  await cleanupGifts();
});

describe("reserve_gift — atomic reservations", () => {
  it("reserves an available gift, returns a unique reference and flips the status", async () => {
    const id = await makeGift();
    const r = await reserve(id, "Aunt Grace", { p_guest_email: "Grace@Example.com", p_guest_phone: "+256 700 000000", p_message: "Congratulations!" });
    expect(r.ok).toBe(true);
    expect(r.reference).toMatch(/^GIFT-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    const { rows } = await pool.query("select status from gifts where id = $1", [id]);
    expect(rows[0].status).toBe("reserved");
    const { rows: res } = await pool.query("select guest_email, status, price_aed_snapshot from reservations where reference = $1", [r.reference]);
    expect(res[0]).toMatchObject({ guest_email: "grace@example.com", status: "active", price_aed_snapshot: "100.00" });
  });

  it("refuses to reserve an already-reserved gift with a friendly message", async () => {
    const id = await makeGift();
    expect((await reserve(id)).ok).toBe(true);
    const second = await reserve(id, "Someone Else");
    expect(second).toMatchObject({ ok: false, error: "unavailable" });
    expect(second.message).toMatch(/no longer available/i);
  });

  it("refuses purchased gifts and unknown gifts", async () => {
    const id = await makeGift();
    const c = await pool.connect();
    await c.query("begin; select set_config('registry.allow_status_change','on',true); update gifts set status='purchased' where id=$1; commit;".replace("$1", `'${id}'`));
    c.release();
    expect((await reserve(id)).error).toBe("unavailable");
    expect((await reserve("00000000-0000-4000-8000-000000000000")).error).toBe("not_found");
  });

  it("CONCURRENCY: 30 simultaneous attempts on one gift via the API → exactly one succeeds", async () => {
    const id = await makeGift("Race gift");
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => reserve(id, `Racer ${i}`)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).every((r) => r.error === "unavailable")).toBe(true);
    const { rows } = await pool.query("select count(*)::int n from reservations where gift_id = $1", [id]);
    expect(rows[0].n).toBe(1);
  });

  it("CONCURRENCY: 25 parallel database transactions held open at once → exactly one succeeds", async () => {
    const id = await makeGift("Race gift 2");
    const clients = await Promise.all(Array.from({ length: 25 }, () => pool.connect()));
    try {
      // Every transaction starts before any of them commits, maximising contention.
      await Promise.all(clients.map((c) => c.query("begin; set local role service_role;")));
      const results = await Promise.all(
        clients.map((c, i) =>
          c.query("select public.reserve_gift($1, $2, null, null, null, $3) as r", [id, `Parallel ${i}`, uniqueClient()]).then(async (res) => {
            await c.query("commit");
            return res.rows[0].r as { ok: boolean; error?: string };
          }),
        ),
      );
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok).every((r) => r.error === "unavailable")).toBe(true);
    } finally {
      clients.forEach((c) => c.release());
    }
    const { rows } = await pool.query("select count(*)::int n from reservations where gift_id = $1 and status = 'active'", [id]);
    expect(rows[0].n).toBe(1);
  });

  it("the partial unique index independently forbids two live reservations for one gift", async () => {
    const id = await makeGift();
    await pool.query("insert into reservations (reference, gift_id, gift_name_snapshot, guest_name) values ('T-1-' || gen_random_uuid(), $1, 'x', 'a')", [id]);
    await expect(
      pool.query("insert into reservations (reference, gift_id, gift_name_snapshot, guest_name) values ('T-2-' || gen_random_uuid(), $1, 'x', 'b')", [id]),
    ).rejects.toThrow(/reservations_one_live_per_gift/);
  });

  it("validates and sanitises input inside the database", async () => {
    const id = await makeGift();
    expect((await reserve(id, " ")).error).toBe("invalid");
    expect((await reserve(id, "Ann", { p_guest_email: "not-an-email" })).error).toBe("invalid");
    expect((await reserve(id, "Ann", { p_guest_phone: "<script>" })).error).toBe("invalid");
    const ok = await reserve(id, "<b>Ann</b>\u0007 Smith");
    expect(ok.ok).toBe(true);
    const { rows } = await pool.query("select guest_name from reservations where reference = $1", [ok.reference]);
    expect(rows[0].guest_name).not.toMatch(/[<>\u0007]/);
  });

  it("throttles repeated attempts from the same client", async () => {
    const client = uniqueClient();
    const id = await makeGift();
    await reserve(id, "Spammer", { p_client_hash: client });
    const outcomes: string[] = [];
    for (let i = 0; i < 16; i++) outcomes.push((await reserve(id, "Spammer", { p_client_hash: client })).error ?? "ok");
    expect(outcomes).toContain("rate_limited");
  });

  it("limits how many gifts one client can reserve per day", async () => {
    const client = uniqueClient();
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await reserve(await makeGift(), "Greedy", { p_client_hash: client }));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5].error).toBe("rate_limited");
  });

  it("public confirmation lookup reveals only non-sensitive fields", async () => {
    const id = await makeGift();
    const r = await reserve(id, "Grace Hopper", { p_guest_email: "g@example.com", p_guest_phone: "+971 50 000 0000", p_message: "secret note" });
    const { data, error } = await anon().rpc("get_reservation_public", { p_reference: r.reference!.toLowerCase() });
    expect(error).toBeNull();
    expect(data).toMatchObject({ reference: r.reference, guest_first_name: "Grace", status: "active" });
    const json = JSON.stringify(data);
    expect(json).not.toContain("g@example.com");
    expect(json).not.toContain("000 0000");
    expect(json).not.toContain("secret note");
    expect(json).not.toContain("Hopper");
    const miss = await anon().rpc("get_reservation_public", { p_reference: "GIFT-AAAAA-AAAAA" });
    expect(miss.data).toBeNull();
  });
});

describe("optional reservation expiry", () => {
  it("is disabled by default and never releases anything", async () => {
    const id = await makeGift();
    const r = await reserve(id);
    await pool.query("update reservations set created_at = now() - interval '30 days' where reference = $1", [r.reference]);
    const { data } = await service().rpc("release_expired_reservations");
    expect(data).toBe(0);
    const { rows } = await pool.query("select status from gifts where id = $1", [id]);
    expect(rows[0].status).toBe("reserved");
  });

  it("releases old reservations only when an admin enables it", async () => {
    const id = await makeGift();
    const r = await reserve(id);
    await pool.query("update reservations set created_at = now() - interval '3 days' where reference = $1", [r.reference]);
    await pool.query("update registry_settings set reservation_expiry_enabled = true, reservation_expiry_hours = 48 where id = 1");
    try {
      const { data } = await service().rpc("release_expired_reservations");
      expect(data).toBeGreaterThanOrEqual(1);
      const { rows } = await pool.query("select g.status gs, r.status rs from gifts g join reservations r on r.gift_id = g.id where r.reference = $1", [r.reference]);
      expect(rows[0]).toEqual({ gs: "available", rs: "expired" });
    } finally {
      await pool.query("update registry_settings set reservation_expiry_enabled = false, reservation_expiry_hours = null where id = 1");
    }
  });
});
