import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailConfig, escapeHtml, guestEmail, notifyReservation, ownerEmail, type ReservationEmailData } from "@/lib/notify";

const data: ReservationEmailData = {
  reference: "GIFT-ABCDE-FGHJK",
  giftName: "Doona+ (Grey Hound)",
  giftSlug: "doona-plus-grey-hound",
  priceText: "AED 3,199",
  guestName: "Aunt <b>Grace</b>",
  guestEmail: "grace@example.test",
  guestPhone: "+971 50 000 0000",
  message: '<script>alert("x")</script>',
  siteUrl: "https://registry.example.test",
  myGiftsUrl: "https://registry.example.test/my-gifts/KEYKEYKEYKEYKEYKEYKEYKEYKEYKEYKE",
};

const ENV = ["RESEND_API_KEY", "NOTIFY_OWNER_EMAIL", "NOTIFY_FROM_EMAIL"] as const;
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  ENV.forEach((k) => delete process.env[k]);
});
afterEach(() => {
  ENV.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
  vi.unstubAllGlobals();
});

describe("reservation emails", () => {
  it("escapes guest-supplied text in HTML", () => {
    const { html, subject } = ownerEmail(data);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Aunt &lt;b&gt;Grace&lt;/b&gt;");
    expect(escapeHtml(`"'&`)).toBe("&quot;&#39;&amp;");
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it("owner email has the guest's details and a link to the admin", () => {
    const { html, text } = ownerEmail(data);
    expect(html).toContain("grace@example.test");
    expect(html).toContain("https://registry.example.test/admin/reservations");
    expect(text).toContain("GIFT-ABCDE-FGHJK");
  });

  it("guest email has their My gifts link and a reminder to buy, but no other guest's data", () => {
    const { html, text } = guestEmail(data);
    expect(html).toContain(data.myGiftsUrl);
    expect(text).toMatch(/remember to buy/i);
    expect(html).not.toContain("+971");
  });

  it("does nothing when email isn't configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await notifyReservation(data)).toEqual({ owner: "skipped", guest: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("emails only the owner when using Resend's test sender", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.NOTIFY_OWNER_EMAIL = "owner@example.test, not-an-email";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(emailConfig().canEmailGuests).toBe(false);
    expect(await notifyReservation(data)).toEqual({ owner: "sent", guest: "skipped" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["owner@example.test"]);
    expect(body.from).toContain("onboarding@resend.dev");
  });

  it("also emails the guest when a verified sender is configured", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.NOTIFY_OWNER_EMAIL = "owner@example.test";
    process.env.NOTIFY_FROM_EMAIL = "Registry <registry@example.test>";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await notifyReservation(data)).toEqual({ owner: "sent", guest: "sent" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).to).toEqual(["grace@example.test"]);
  });

  it("never throws when the email service fails", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.NOTIFY_OWNER_EMAIL = "owner@example.test";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await notifyReservation(data)).toEqual({ owner: "failed", guest: "skipped" });
    spy.mockRestore();
  });
});
