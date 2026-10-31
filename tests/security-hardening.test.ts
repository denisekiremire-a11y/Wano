import { afterEach, describe, expect, it, vi } from "vitest";
import { timingSafeEqualString } from "@/lib/timing-safe-equal";
import { rejectUnauthorizedCron } from "@/lib/cron-auth";

describe("timingSafeEqualString", () => {
  it("matches identical strings", () => {
    expect(timingSafeEqualString("same-secret-value", "same-secret-value")).toBe(true);
  });

  it("rejects a different string of the same length", () => {
    expect(timingSafeEqualString("same-secret-value", "same-secret-valux")).toBe(false);
  });

  it("rejects strings of different lengths without throwing", () => {
    expect(timingSafeEqualString("short", "a-much-longer-string")).toBe(false);
  });

  it("treats an empty string as not matching a non-empty one", () => {
    expect(timingSafeEqualString("", "something")).toBe(false);
  });
});

function cronRequest(authHeader?: string) {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/cron/whatever", { headers });
}

describe("rejectUnauthorizedCron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows a request with the correct bearer token", () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-abc");
    expect(rejectUnauthorizedCron(cronRequest("Bearer cron-secret-abc"))).toBeNull();
  });

  it("rejects the wrong bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-abc");
    const res = rejectUnauthorizedCron(cronRequest("Bearer wrong-token"));
    expect(res?.status).toBe(401);
  });

  it("rejects a missing authorization header", () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-abc");
    const res = rejectUnauthorizedCron(cronRequest());
    expect(res?.status).toBe(401);
  });

  it("refuses every request (503) in production when CRON_SECRET isn't set", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const res = rejectUnauthorizedCron(cronRequest("Bearer anything"));
    expect(res?.status).toBe(503);
  });

  it("allows requests through in dev when CRON_SECRET isn't set", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(rejectUnauthorizedCron(cronRequest())).toBeNull();
  });
});
