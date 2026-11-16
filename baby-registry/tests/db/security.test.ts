import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { anon, cleanupGifts, deleteUser, makeGift, pool, reserve, signedInUser } from "./helpers";

let admin: { client: SupabaseClient; userId: string };
let stranger: { client: SupabaseClient; userId: string };
let reservedGift: string;

beforeAll(async () => {
  admin = await signedInUser({ admin: true });
  stranger = await signedInUser({ admin: false });
  reservedGift = await makeGift("Secret gift");
  await reserve(reservedGift, "Private Person", { p_guest_email: "private@example.com", p_guest_phone: "+971500000000" });
});

afterAll(async () => {
  await cleanupGifts();
  await deleteUser(admin.userId);
  await deleteUser(stranger.userId);
});

const PRIVATE_TABLES = ["reservations", "reservation_events", "reservation_attempts", "admin_profiles", "exchange_rate_history"];

describe("public (anonymous) guests", () => {
  it("can read the catalogue and availability", async () => {
    const sb = anon();
    const { data, error } = await sb.from("gifts").select("id, name, status").limit(200);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(77);
    expect(data!.find((g) => g.id === reservedGift)?.status).toBe("reserved");
    for (const t of ["categories", "retailers", "gift_retailers", "store_locations", "registry_settings"]) {
      const r = await sb.from(t).select("*").limit(1);
      expect(r.error, t).toBeNull();
    }
  });

  it.each(PRIVATE_TABLES)("cannot read any guest's personal data from %s", async (table) => {
    const { data, error } = await anon().from(table).select("*").limit(5);
    // Either an explicit permission error or zero rows — never data.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
    if (!error) expect(data).toEqual([]);
  });

  it("cannot create a reservation by writing to the table directly", async () => {
    const id = await makeGift();
    const { error } = await anon().from("reservations").insert({ reference: "X-1", gift_id: id, gift_name_snapshot: "x", guest_name: "Hacker" });
    expect(error).not.toBeNull();
  });

  it("cannot call reserve_gift directly (server-only function)", async () => {
    const id = await makeGift();
    const { data, error } = await anon().rpc("reserve_gift", { p_gift_id: id, p_guest_name: "Bypass" });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
    const { rows } = await pool.query("select status from gifts where id = $1", [id]);
    expect(rows[0].status).toBe("available");
  });

  it("cannot change gifts, prices, statuses or settings", async () => {
    const sb = anon();
    const u = await sb.from("gifts").update({ status: "available", price_aed: 1 }).eq("id", reservedGift).select();
    expect(u.error !== null || (u.data ?? []).length === 0).toBe(true);
    const d = await sb.from("gifts").delete().eq("id", reservedGift).select();
    expect(d.error !== null || (d.data ?? []).length === 0).toBe(true);
    const s = await sb.from("registry_settings").update({ aed_to_ugx_rate: 1 }).eq("id", 1).select();
    expect(s.error !== null || (s.data ?? []).length === 0).toBe(true);
    const { rows } = await pool.query("select status, price_aed from gifts where id = $1", [reservedGift]);
    expect(rows[0]).toEqual({ status: "reserved", price_aed: "100.00" });
  });

  it("cannot call admin functions", async () => {
    const r = await anon().rpc("admin_set_gift_status", { p_gift_id: reservedGift, p_status: "available" });
    expect(r.error).not.toBeNull();
    const e = await anon().rpc("release_expired_reservations");
    expect(e.error).not.toBeNull();
  });
});

describe("signed-in users who are NOT administrators", () => {
  it("cannot read reservations or guest details", async () => {
    for (const t of PRIVATE_TABLES) {
      const { data, error } = await stranger.client.from(t).select("*").limit(5);
      expect(error !== null || (data ?? []).length === 0, t).toBe(true);
    }
  });

  it("is_admin() is false and admin functions are refused", async () => {
    expect((await stranger.client.rpc("is_admin")).data).toBe(false);
    const r = await stranger.client.rpc("admin_set_gift_status", { p_gift_id: reservedGift, p_status: "available" });
    expect(r.error?.message).toMatch(/administrator/i);
    const { rows } = await pool.query("select status from gifts where id = $1", [reservedGift]);
    expect(rows[0].status).toBe("reserved");
  });

  it("cannot edit products or make themselves admin", async () => {
    const u = await stranger.client.from("gifts").update({ name: "pwned" }).eq("id", reservedGift).select();
    expect((u.data ?? []).length).toBe(0);
    const p = await stranger.client.from("admin_profiles").insert({ user_id: stranger.userId });
    expect(p.error).not.toBeNull();
  });
});

describe("administrators", () => {
  it("can see reservations with guest contact details", async () => {
    const { data, error } = await admin.client.from("reservations").select("*").eq("gift_id", reservedGift);
    expect(error).toBeNull();
    expect(data![0]).toMatchObject({ guest_name: "Private Person", guest_email: "private@example.com" });
  });

  it("can mark a reservation purchased, and the gift follows", async () => {
    const id = await makeGift();
    const r = await reserve(id);
    const { data: res } = await admin.client.from("reservations").select("id").eq("reference", r.reference!).single();
    const { error } = await admin.client.rpc("admin_mark_reservation_purchased", { p_reservation_id: res!.id });
    expect(error).toBeNull();
    const { rows } = await pool.query("select g.status gs, r.status rs, r.purchased_at is not null p from gifts g join reservations r on r.gift_id = g.id where g.id = $1", [id]);
    expect(rows[0]).toEqual({ gs: "purchased", rs: "purchased", p: true });
    expect((await reserve(id)).error).toBe("unavailable");
  });

  it("can cancel or release a reservation, making the gift reservable again", async () => {
    for (const mode of ["cancelled", "released"] as const) {
      const id = await makeGift();
      const r = await reserve(id);
      const { data: res } = await admin.client.from("reservations").select("id").eq("reference", r.reference!).single();
      const { error } = await admin.client.rpc("admin_close_reservation", { p_reservation_id: res!.id, p_new_status: mode, p_note: "test" });
      expect(error).toBeNull();
      const { rows } = await pool.query("select status from gifts where id = $1", [id]);
      expect(rows[0].status).toBe("available");
      expect((await reserve(id, "Second guest")).ok).toBe(true); // history preserved, new reservation allowed
      const { rows: hist } = await pool.query("select status from reservations where gift_id = $1 order by created_at", [id]);
      expect(hist.map((h) => h.status)).toEqual([mode, "active"]);
    }
  });

  it("can set gift availability directly, keeping reservations consistent", async () => {
    const id = await makeGift();
    await reserve(id);
    expect((await admin.client.rpc("admin_set_gift_status", { p_gift_id: id, p_status: "available" })).error).toBeNull();
    const { rows } = await pool.query("select status from reservations where gift_id = $1", [id]);
    expect(rows[0].status).toBe("released");
    expect((await admin.client.rpc("admin_set_gift_status", { p_gift_id: id, p_status: "purchased" })).error).toBeNull();
    const reservedWithoutGuest = await admin.client.rpc("admin_set_gift_status", { p_gift_id: id, p_status: "reserved" });
    expect(reservedWithoutGuest.error).not.toBeNull();
  });

  it("cannot bypass the reservation functions with a raw status update", async () => {
    const id = await makeGift();
    const u = await admin.client.from("gifts").update({ status: "purchased" }).eq("id", id);
    expect(u.error?.message).toMatch(/reservation functions/);
  });

  it("can edit products and settings; rate changes are timestamped and logged", async () => {
    const id = await makeGift();
    const e = await admin.client.from("gifts").update({ price_aed: 250, notes: "Updated" }).eq("id", id).select("reference_price_aed").single();
    expect(e.error).toBeNull();
    expect(Number(e.data!.reference_price_aed)).toBe(250);
    const before = await pool.query("select aed_to_ugx_rate from registry_settings");
    try {
      const s = await admin.client.from("registry_settings").update({ aed_to_ugx_rate: 1234.5, rate_source: "test" }).eq("id", 1).select("rate_updated_at").single();
      expect(s.error).toBeNull();
      expect(Date.now() - new Date(s.data!.rate_updated_at).getTime()).toBeLessThan(60_000);
      const h = await admin.client.from("exchange_rate_history").select("rate").order("created_at", { ascending: false }).limit(1);
      expect(Number(h.data![0].rate)).toBe(1234.5);
    } finally {
      await pool.query("update registry_settings set aed_to_ugx_rate = $1", [before.rows[0].aed_to_ugx_rate]);
    }
  });

  it("cannot delete a gift that is currently reserved; can once released (history kept)", async () => {
    const id = await makeGift();
    const r = await reserve(id);
    expect((await admin.client.from("gifts").delete().eq("id", id)).error?.message).toMatch(/Release this gift/);
    await admin.client.rpc("admin_set_gift_status", { p_gift_id: id, p_status: "available" });
    expect((await admin.client.from("gifts").delete().eq("id", id)).error).toBeNull();
    const { rows } = await pool.query("select gift_id, gift_name_snapshot from reservations where reference = $1", [r.reference]);
    expect(rows[0]).toEqual({ gift_id: null, gift_name_snapshot: "Test gift" });
  });
});
