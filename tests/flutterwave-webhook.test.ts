import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const confirmXpPayment = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/xp-actions", () => ({ confirmXpPayment }));

import { POST } from "@/app/api/webhooks/flutterwave/route";

const SECRET = "test-webhook-hash";

function webhook(body: unknown, hash: string | null = SECRET) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (hash !== null) headers.set("verif-hash", hash);
  return new Request("http://localhost/api/webhooks/flutterwave", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const chargeCompleted = { event: "charge.completed", data: { id: 987654, tx_ref: "booking-123", status: "successful" } };

describe("POST /api/webhooks/flutterwave", () => {
  beforeEach(() => {
    vi.stubEnv("FLUTTERWAVE_WEBHOOK_SECRET_HASH", SECRET);
    confirmXpPayment.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects a request without the verif-hash header", async () => {
    const res = await POST(webhook(chargeCompleted, null));
    expect(res.status).toBe(401);
    expect(confirmXpPayment).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong verif-hash", async () => {
    const res = await POST(webhook(chargeCompleted, "not-the-secret"));
    expect(res.status).toBe(401);
    expect(confirmXpPayment).not.toHaveBeenCalled();
  });

  it("rejects everything when no secret hash is configured", async () => {
    vi.stubEnv("FLUTTERWAVE_WEBHOOK_SECRET_HASH", "");
    const res = await POST(webhook(chargeCompleted, ""));
    expect(res.status).toBe(401);
    expect(confirmXpPayment).not.toHaveBeenCalled();
  });

  it("confirms the booking named by tx_ref, passing the transaction id as a string", async () => {
    const res = await POST(webhook(chargeCompleted));
    expect(res.status).toBe(200);
    expect(confirmXpPayment).toHaveBeenCalledWith("booking-123", "987654");
  });

  it("still answers 200 when confirming fails, so Flutterwave doesn't retry-storm", async () => {
    confirmXpPayment.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(webhook(chargeCompleted));
    expect(res.status).toBe(200);
    expect(confirmXpPayment).toHaveBeenCalledOnce();
  });

  it("ignores an authenticated payload without tx_ref or id", async () => {
    expect((await POST(webhook({ event: "charge.completed", data: { id: 1 } }))).status).toBe(200);
    expect((await POST(webhook({ event: "charge.completed", data: { tx_ref: "x" } }))).status).toBe(200);
    expect((await POST(webhook("not json"))).status).toBe(200);
    expect(confirmXpPayment).not.toHaveBeenCalled();
  });
});
