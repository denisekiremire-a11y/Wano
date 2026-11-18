import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { anon, cleanupGifts, makeGift, pool, reserve, signedInUser, deleteUser } from "./helpers";

afterAll(async () => {
  await cleanupGifts();
});

const key = () => randomBytes(24).toString("base64url");

describe("My gifts (guest pledges)", () => {
  it("lists every gift a guest pledged, newest first, without contact details", async () => {
    const k = key();
    const a = await reserve(await makeGift("Pledge A"), "Grace Example", { p_guest_key: k, p_guest_email: "grace@example.test", p_guest_phone: "+971500000000", p_message: "secret" });
    const b = await reserve(await makeGift("Pledge B"), "Grace Example", { p_guest_key: k });
    const { data, error } = await anon().rpc("get_guest_pledges", { p_guest_key: k });
    expect(error).toBeNull();
    expect((data as { reference: string }[]).map((p) => p.reference)).toEqual([b.reference, a.reference]);
    const json = JSON.stringify(data);
    for (const leak of ["grace@example.test", "+971500000000", "secret", "Grace"]) expect(json).not.toContain(leak);
  });

  it("shows nothing for another guest's key, a missing key or a malformed key", async () => {
    const k = key();
    await reserve(await makeGift(), "Someone", { p_guest_key: k });
    for (const other of [key(), "", "short", "' or 1=1 --", "x".repeat(200)]) {
      const { data, error } = await anon().rpc("get_guest_pledges", { p_guest_key: other });
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("stores only a hash of the key, never the key itself", async () => {
    const k = key();
    const r = await reserve(await makeGift(), "Hash Check", { p_guest_key: k });
    const { rows } = await pool.query("select guest_key_hash from reservations where reference = $1", [r.reference]);
    expect(rows[0].guest_key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].guest_key_hash).not.toContain(k);
    const { rows: dump } = await pool.query("select row_to_json(r)::text t from reservations r where reference = $1", [r.reference]);
    expect(dump[0].t).not.toContain(k);
  });

  it("reflects status changes made by the family (purchased / released)", async () => {
    const k = key();
    const giftId = await makeGift("Status follow");
    const r = await reserve(giftId, "Follower", { p_guest_key: k });
    const admin = await signedInUser({ admin: true });
    try {
      const { data: res } = await admin.client.from("reservations").select("id").eq("reference", r.reference!).single();
      await admin.client.rpc("admin_mark_reservation_purchased", { p_reservation_id: res!.id });
      let { data } = await anon().rpc("get_guest_pledges", { p_guest_key: k });
      expect((data as { status: string }[])[0].status).toBe("purchased");
      await admin.client.rpc("admin_close_reservation", { p_reservation_id: res!.id, p_new_status: "released" });
      ({ data } = await anon().rpc("get_guest_pledges", { p_guest_key: k }));
      expect((data as { status: string }[])[0].status).toBe("released");
    } finally {
      await deleteUser(admin.userId);
    }
  });

  it("reservations without a key still work (and belong to nobody's list)", async () => {
    const r = await reserve(await makeGift(), "No Key");
    expect(r.ok).toBe(true);
    const { rows } = await pool.query("select guest_key_hash from reservations where reference = $1", [r.reference]);
    expect(rows[0].guest_key_hash).toBeNull();
  });

  it("guests still cannot call reserve_gift directly, with or without a key", async () => {
    const { error } = await anon().rpc("reserve_gift", { p_gift_id: await makeGift(), p_guest_name: "Bypass", p_guest_key: key() });
    expect(error).not.toBeNull();
  });
});
