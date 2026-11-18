import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmailToken, verifyEmailToken } from "@/lib/email-link";

beforeEach(() => {
  process.env.RESERVATION_HASH_SALT = "unit-test-salt";
});

describe("emailed My gifts links", () => {
  it("round-trips a normalised email", () => {
    expect(verifyEmailToken(createEmailToken("  Grace@Example.TEST "))).toBe("grace@example.test");
  });

  it("rejects tampered, forged, malformed and expired tokens", () => {
    const t = createEmailToken("grace@example.test");
    const [payload, sig] = t.split(".");
    const other = Buffer.from(JSON.stringify({ e: "someone@else.test", x: 9_999_999_999 })).toString("base64url");
    expect(verifyEmailToken(`${other}.${sig}`)).toBeNull(); // different email, old signature
    expect(verifyEmailToken(`${payload}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(verifyEmailToken(`${payload}.${sig}.extra`)).toBeNull();
    for (const bad of ["", "abc", null, 42, "x".repeat(1000)]) expect(verifyEmailToken(bad)).toBeNull();
    const old = createEmailToken("grace@example.test", 1, Date.now() - 3 * 86_400_000);
    expect(verifyEmailToken(old)).toBeNull();
  });

  it("a token signed with a different secret is rejected", () => {
    const t = createEmailToken("grace@example.test");
    process.env.RESERVATION_HASH_SALT = "a-different-secret";
    expect(verifyEmailToken(t)).toBeNull();
  });
});

const sendMail = vi.fn().mockResolvedValue({ messageId: "x" });
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport: (...a: unknown[]) => createTransport(...(a as [])) } }));

describe("Gmail (SMTP) sending", () => {
  const KEYS = ["SMTP_USER", "SMTP_PASS", "SMTP_HOST", "SMTP_PORT", "NOTIFY_OWNER_EMAIL", "RESEND_API_KEY", "NOTIFY_FROM_EMAIL"];
  let saved: Record<string, string | undefined>;
  beforeEach(async () => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    KEYS.forEach((k) => delete process.env[k]);
    sendMail.mockClear();
    createTransport.mockClear();
    (await import("@/lib/notify")).resetEmailTransport();
  });
  afterEach(() => KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));

  it("uses Gmail when SMTP_USER/SMTP_PASS are set, emails the owner and the guest", async () => {
    process.env.SMTP_USER = "family@gmail.com";
    process.env.SMTP_PASS = "abcd efgh ijkl mnop"; // as Google displays it
    const { emailConfig, notifyReservation } = await import("@/lib/notify");
    const cfg = emailConfig();
    expect(cfg.provider).toBe("smtp");
    expect(cfg.canEmailGuests).toBe(true);
    expect(cfg.owners).toEqual(["family@gmail.com"]); // defaults to the Gmail address
    const r = await notifyReservation({
      reference: "GIFT-AAAAA-BBBBB", giftName: "Doona+", giftSlug: "doona", priceText: "AED 3,199",
      guestName: "Grace", guestEmail: "grace@example.test", guestPhone: null, message: null,
      siteUrl: "https://x.test", myGiftsUrl: "https://x.test/my-gifts/e/tok",
    });
    expect(r).toEqual({ owner: "sent", guest: "sent" });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: "family@gmail.com", pass: "abcdefghijklmnop" } }));
    expect(sendMail.mock.calls.map((c) => (c[0] as { to: string[] }).to)).toEqual([["family@gmail.com"], ["grace@example.test"]]);
    expect((sendMail.mock.calls[1][0] as { html: string }).html).toContain("https://x.test/my-gifts/e/tok");
  });

  it("does nothing when no provider is configured", async () => {
    const { emailConfig, sendEmail } = await import("@/lib/notify");
    expect(emailConfig().provider).toBeNull();
    expect(await sendEmail({ to: ["a@b.test"], subject: "s", html: "h", text: "t" })).toBe("skipped");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("a Gmail failure never throws", async () => {
    process.env.SMTP_USER = "family@gmail.com";
    process.env.SMTP_PASS = "pw";
    sendMail.mockRejectedValueOnce(new Error("Invalid login"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/notify");
    expect(await sendEmail({ to: ["a@b.test"], subject: "s", html: "h", text: "t" })).toBe("failed");
    spy.mockRestore();
  });
});
