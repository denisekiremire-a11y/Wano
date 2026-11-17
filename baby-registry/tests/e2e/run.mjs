/**
 * End-to-end tests through the real UI (Next.js + local Supabase + Realtime).
 *
 *   npx supabase db reset && npm run dev   (in another terminal)
 *   npm run test:e2e
 *
 * Uses the Playwright that is installed on the machine. Creates its own admin account with the
 * service key from .env.local. Expects a freshly reset database (all 77 gifts available).
 */
import { createRequire } from "node:module";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
/** Same format as src/lib/email-link.ts, signed with the app's local secret. */
const emailToken = (email, days = 30, secret = env.LINK_SIGNING_SECRET || env.RESERVATION_HASH_SALT) => {
  const payload = Buffer.from(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + days * 86400 })).toString("base64url");
  return `${payload}.${createHmac("sha256", `my-gifts-link:${secret}`).update(payload).digest("base64url")}`;
};
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  ✗ ${name}\n      ${String(e.message ?? e).split("\n").slice(0, 6).join("\n      ")}`);
  }
}
const waitFor = async (fn, ms = 8000, label = "condition") => {
  const t = Date.now();
  for (;;) {
    try {
      if (await fn()) return;
    } catch {}
    if (Date.now() - t > ms) throw new Error(`Timed out waiting for ${label}${globalThis.__diag ? " | " + (await globalThis.__diag()) : ""}`);
    await new Promise((r) => setTimeout(r, 150));
  }
};
const card = (page, slug) => page.locator(`[data-testid=gift-card][data-gift-slug="${slug}"]`).first();
const giftId = async (slug) => (await svc.from("gifts").select("id").eq("slug", slug).single()).data.id;
const serverReserve = async (slug, name) =>
  (await svc.rpc("reserve_gift", { p_gift_id: await giftId(slug), p_guest_name: name, p_client_hash: `e2e-${randomUUID()}` })).data;

async function reserveViaUi(page, slug, { name, email = "", phone = "" }) {
  await card(page, slug).getByTestId("reserve-button").click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByLabel(/Your name/).fill(name);
  if (email) await dialog.getByLabel(/Your email/).fill(email);
  if (phone) {
    await dialog.getByText(/Add a message or phone number/).click();
    await dialog.getByLabel("Phone").fill(phone);
  }
  await page.waitForTimeout(1600); // humans take a moment; the anti-bot timer requires it
  await dialog.getByTestId("confirm-checkbox").check();
  await dialog.getByTestId("confirm-reserve").click();
  await page.waitForURL(/\/reservation\/GIFT-/, { timeout: 10000 });
}

/** The list shows only available gifts by default; tests that watch status changes switch to "All gifts". */
const showAll = async (page) => {
  await page.locator("[data-testid=show-all]:visible").first().click();
};

const browser = await chromium.launch();
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("    [pageerror]", e.message));
  return page;
};

// Wait until the app and database are ready (PostgREST reconnects briefly after a db reset).
{
  const t = Date.now();
  for (;;) {
    const html = await fetch(BASE + "/").then((r) => r.text()).catch(() => "");
    if (html.includes("Made with love")) break;
    if (Date.now() - t > 60000) throw new Error("App did not become ready at " + BASE);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// Admin account for the run.
const adminEmail = `e2e-admin-${randomUUID().slice(0, 6)}@example.test`;
const adminPassword = `pw-${randomUUID()}`;
const { data: au, error: aerr } = await svc.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
if (aerr) throw aerr;
await svc.from("admin_profiles").insert({ user_id: au.user.id });
const { data: limits } = await svc.from("registry_settings").select("max_reservations_per_client_per_day").eq("id", 1).single();
await svc.from("registry_settings").update({ max_reservations_per_client_per_day: 50 }).eq("id", 1);

try {
  console.log("\nPublic registry");
  const A = await newPage();
  const B = await newPage();
  await A.goto(BASE + "/");
  await B.goto(BASE + "/");
  await showAll(B);
  globalThis.__diag = async () =>
    `B url=${B.url()} indicators=${JSON.stringify(await B.$$eval("[data-testid=live-indicator]", (els) => els.map((e) => e.dataset.live + (e.offsetParent ? "" : "(hidden)"))).catch((e) => e.message))} cards=${await B.locator("[data-testid=gift-card]").count()}`;
  B.on("console", (m) => { if (/realtime|websocket|channel/i.test(m.text())) console.log("    [B console]", m.text().slice(0, 200)); });

  await test("homepage shows welcome, progress and 77 gifts with no login", async () => {
    assert.match(await A.locator("h1").textContent(), /Made with love for little Peaches/);
    assert.match(await A.locator("header").textContent(), /Baby Peaches/);
    assert.equal(await A.getByTestId("stat-total").textContent(), "77");
    assert.equal(await A.getByTestId("stat-available").textContent(), "77");
    assert.equal(await A.getByTestId("result-count").textContent(), "77 gifts still available");
    await waitFor(async () => (await A.getByTestId("live-indicator").getAttribute("data-live")) === "live", 10000, "realtime connection");
  });

  await test("price notice and AED-only currency note are shown before a rate is configured", async () => {
    assert.match(await A.getByTestId("price-notice").first().textContent(), /24 October 2026.*double-check/);
    assert.match(await A.getByTestId("currency-note").first().textContent(), /will appear once/);
    assert.equal(await A.getByTestId("price-ugx").count(), 0);
  });

  await test("search works (accent-insensitive) and empty state appears", async () => {
    await A.getByTestId("search-input").fill("bjorn");
    await waitFor(async () => (await A.locator("#collection [data-testid=gift-card]").count()) === 1, 4000, "1 result");
    assert.match(await A.locator("#collection [data-testid=gift-card] h3").textContent(), /BabyBjörn Bouncer/);
    await A.getByTestId("search-input").fill("zzzzzz");
    await A.locator("[data-testid=empty-state]:visible").first().waitFor();
    await A.getByTestId("search-input").fill("");
  });

  await test("category, price, tier filters and sorting work", async () => {
    const grid = A.locator("#collection");
    await grid.getByTestId("category-chip-travel").click();
    await waitFor(async () => (await grid.getByTestId("gift-card").count()) === 7, 4000, "7 travel gifts");
    await grid.getByTestId("category-chip-clothing").click();
    await waitFor(async () => (await grid.getByTestId("gift-card").count()) === 16, 4000, "16 clothing gifts");
    await grid.getByRole("button", { name: "Everything" }).click();
    await grid.getByTestId("more-filters").click();
    await grid.getByTestId("price-filter").selectOption("1500-plus");
    const prices = await grid.locator("[data-testid=gift-card] [data-testid=price-aed]").allTextContents();
    assert.ok(prices.length > 0 && prices.every((p) => Number(p.replace(/[^0-9.–-]/g, "").split(/[–-]/)[0]) >= 1500 || /–/.test(p)), prices.join(" | "));
    await grid.getByTestId("price-filter").selectOption("all");
    await grid.getByTestId("tier-filter").selectOption("premium");
    assert.ok((await grid.getByTestId("gift-card").count()) > 0);
    await grid.getByTestId("tier-filter").selectOption("all");
    await grid.getByTestId("sort-select").selectOption("price-desc");
    assert.match(await grid.locator("[data-testid=gift-card] h3").first().textContent(), /Kikka Boo Goya Platinum/);
    await grid.getByTestId("sort-select").selectOption("name-asc");
    assert.match(await grid.locator("[data-testid=gift-card] h3").first().textContent(), /^4moms mamaRoo/);
    await grid.getByTestId("sort-select").selectOption("recommended");
  });

  await test("category page /registry/clothing lists only that category; unknown category is not found", async () => {
    const p = await newPage();
    await p.goto(BASE + "/registry/clothing");
    await p.locator("[data-testid=gift-card]:visible").first().waitFor();
    assert.equal(await p.locator("[data-testid=gift-card]:visible").count(), 16);
    await p.goto(BASE + "/registry/not-a-category");
    assert.match(await p.locator("h1").textContent(), /couldn’t find/);
    await p.context().close();
  });

  await test("'Buy' goes straight to the exact product page; other shops use their own search", async () => {
    const DOONA = "https://mamasandpapas.ae/doona-infant-car-seat-grey-hound-218794628.html";
    const buy = card(A, "doona-plus-grey-hound").getByTestId("buy-link");
    assert.equal(await buy.getAttribute("href"), DOONA);
    assert.match(await buy.textContent(), /Buy at Mamas & Papas UAE/);
    assert.equal(await buy.getAttribute("target"), "_blank");
    await card(A, "doona-plus-grey-hound").getByTestId("where-button").click();
    const panel = A.locator("dialog[open] [data-testid=where-to-buy]");
    await panel.waitFor();
    const hrefs = await panel.locator("a").evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.href, a.target, a.rel, a.dataset.kind]));
    assert.equal(hrefs[0][1], DOONA, JSON.stringify(hrefs[0]));
    assert.equal(hrefs[0][4], "product");
    assert.ok(hrefs.some(([t, h]) => /Search Mom Store for it/.test(t) && h.startsWith("https://www.momstore.com/ae-en/catalogsearch/result/?q=Doona")), JSON.stringify(hrefs));
    assert.ok(hrefs.some(([, h]) => h === "https://www.google.com/maps/search/?api=1&query=Mom%20Store%20Dubai"));
    assert.ok(hrefs.every(([, h, t, r]) => t === "_blank" && r.includes("noopener") && h.startsWith("https://")));
    await A.keyboard.press("Escape");
    // A gift with no single product page gets no Buy button, just Where to buy.
    assert.equal(await card(A, "play-gym").getByTestId("buy-link").count(), 0);
  });

  await test("a gift reserved by someone else disappears from an open 'Still available' list, live", async () => {
    const C = await newPage();
    await C.goto(BASE + "/registry/feeding");
    await C.locator("[data-testid=live-indicator][data-live=live]").first().waitFor({ timeout: 10000 }).catch(() => {});
    await card(C, "silicone-feeding-sets").waitFor();
    const r = await serverReserve("silicone-feeding-sets", "Someone Else");
    assert.equal(r.ok, true);
    await waitFor(async () => (await card(C, "silicone-feeding-sets").count()) === 0, 8000, "card removed");
    assert.match(await C.getByTestId("result-count").textContent(), /6 gifts still available · 1 already chosen/);
    await C.getByTestId("show-all").click();
    assert.equal(await card(C, "silicone-feeding-sets").getAttribute("data-status"), "reserved");
    await C.context().close();
  });

  console.log("\nReservations & real time");
  let reference;
  await test("the anti-spam field can't be mistaken for an autofill field (regression)", async () => {
    await card(A, "skip-hop-moby").getByTestId("reserve-button").click();
    const hp = A.locator("dialog[open] [data-testid=honeypot]");
    const name = await hp.getAttribute("name");
    const label = await A.locator("dialog[open] label[for=r-hp]").textContent();
    // Words browsers use to decide what to autofill must not appear in the trap's name, id or label.
    const autofillWords = /company|organi[sz]ation|org|name|email|mail|phone|tel|fax|address|street|city|zip|postal|country|website|url|card|user/i;
    for (const v of [name, await hp.getAttribute("id"), label]) assert.ok(!autofillWords.test(v), `honeypot uses autofill-like text: ${v}`);
    assert.equal(await hp.getAttribute("autocomplete"), "off");
    await A.keyboard.press("Escape");
  });

  await test("guest reserves without an account and gets a confirmation with reference", async () => {
    await reserveViaUi(A, "doona-plus-grey-hound", { name: "Aunt Grace Example", email: "grace@example.test", phone: "+971 50 123 4567" });
    await A.locator("[data-testid=reservation-reference]:visible").first().waitFor();
    reference = await A.locator("[data-testid=reservation-reference]:visible").first().textContent();
    assert.match(reference, /^GIFT-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    const body = await A.locator("main").textContent();
    assert.match(body, /Thank you, Aunt!/);
    assert.match(body, /Doona\+ \(Grey Hound\)/);
    assert.match(body, /AED 3,199/);
    await A.locator("[data-testid=purchase-reminder]:visible").first().waitFor();
    await A.locator("[data-testid=where-to-buy]:visible").first().waitFor();
  });

  await test("the confirmation page never shows the guest's email or phone", async () => {
    const html = await (await fetch(`${BASE}/reservation/${reference}`)).text();
    assert.ok(!html.includes("grace@example.test") && !html.includes("123 4567") && !html.includes("Example</"), "PII leaked");
  });

  await test("another open session sees the gift become RESERVED instantly, without reloading", async () => {
    await waitFor(async () => (await card(B, "doona-plus-grey-hound").getAttribute("data-status")) === "reserved", 8000, "live status update");
    // 2 = this reservation + the one made in the "disappears live" test above.
    assert.equal(await B.getByTestId("stat-reserved").textContent(), "2");
    assert.equal(await card(B, "doona-plus-grey-hound").getByTestId("reserve-button").count(), 0);
    assert.match(await card(B, "doona-plus-grey-hound").textContent(), /Already reserved/);
  });

  await test("a reserved gift cannot be reserved again (detail page has no reserve button)", async () => {
    const p = await newPage();
    await p.goto(BASE + "/gift/doona-plus-grey-hound");
    await p.locator("[data-testid=unavailable-note]:visible").first().waitFor();
    assert.equal(await p.getByTestId("reserve-button").count(), 0);
    await p.context().close();
  });

  await test("a guest with the form open is told politely when someone else takes the gift first", async () => {
    await card(B, "cuddledry").getByTestId("reserve-button").click();
    const dialog = B.locator("dialog[open]");
    await dialog.getByLabel(/Your name/).fill("Slow Guest");
    await B.waitForTimeout(1600);
    await dialog.getByTestId("confirm-checkbox").check();
    const r = await serverReserve("cuddledry", "Fast Guest"); // someone else wins the race
    assert.equal(r.ok, true);
    await waitFor(async () => /no longer available/i.test(await dialog.textContent()), 8000, "unavailable message");
    await dialog.getByRole("button", { name: "Choose another gift" }).click();
  });

  await test("simultaneous reservations from two browsers: exactly one wins", async () => {
    const slug = "mam-cups";
    const go = async (page, name) => {
      await card(page, slug).getByTestId("reserve-button").click();
      const d = page.locator("dialog[open]");
      await d.getByLabel(/Your name/).fill(name);
      await page.waitForTimeout(1600);
      await d.getByTestId("confirm-checkbox").check();
      return d;
    };
    await A.goto(BASE + "/");
    await A.locator("[data-testid=live-indicator][data-live=live]").first().waitFor({ timeout: 10000 });
    const [dA, dB] = await Promise.all([go(A, "Racer A"), go(B, "Racer B")]);
    await Promise.all([dA.getByTestId("confirm-reserve").click(), dB.getByTestId("confirm-reserve").click()]);
    await waitFor(async () => /\/reservation\//.test(A.url()) || /\/reservation\//.test(B.url()), 10000, "one winner");
    await A.waitForTimeout(1500);
    const winners = [A.url(), B.url()].filter((u) => /\/reservation\//.test(u)).length;
    assert.equal(winners, 1, "exactly one browser reached a confirmation page");
    const { count } = await svc.from("reservations").select("*", { count: "exact", head: true }).eq("gift_id", await giftId(slug));
    assert.equal(count, 1);
    // Whichever browser won is now on its confirmation page; later tests watch both registries.
    for (const page of [A, B]) {
      await page.goto(BASE + "/");
      await page.locator("[data-testid=live-indicator][data-live=live]").first().waitFor({ timeout: 10000 });
    }
    await showAll(B);
  });

  console.log("\nAdministration");
  await test("unauthenticated visitors are redirected away from every admin page and export", async () => {
    const p = await newPage();
    for (const path of ["/admin", "/admin/gifts", "/admin/reservations", "/admin/settings", "/admin/retailers"]) {
      await p.goto(BASE + path);
      assert.match(p.url(), /\/admin\/login/, path);
    }
    const res = await fetch(BASE + "/admin/export/reservations", { redirect: "manual" });
    assert.ok([302, 303, 307].includes(res.status), `export status ${res.status}`);
    const res2 = await fetch(BASE + "/admin/export/reservations", { redirect: "follow" });
    assert.ok(!(await res2.text()).includes("grace@example.test"));
    await p.context().close();
  });

  const admin = await newPage();
  await test("wrong password is rejected; a non-admin account is refused", async () => {
    await admin.goto(BASE + "/admin/login");
    await admin.getByLabel("Email").fill(adminEmail);
    await admin.getByLabel("Password").fill("wrong-password");
    await admin.getByRole("button", { name: "Sign in" }).click();
    await admin.getByText(/didn’t work/).waitFor();
    const plainEmail = `e2e-user-${randomUUID().slice(0, 6)}@example.test`;
    await svc.auth.admin.createUser({ email: plainEmail, password: "plain-user-password-1", email_confirm: true });
    await admin.getByLabel("Email").fill(plainEmail);
    await admin.getByLabel("Password").fill("plain-user-password-1");
    await admin.getByRole("button", { name: "Sign in" }).click();
    await admin.getByText(/not a registry administrator/).waitFor();
  });

  await test("admin signs in and sees overview counts", async () => {
    await admin.getByLabel("Email").fill(adminEmail);
    await admin.getByLabel("Password").fill(adminPassword);
    await admin.getByRole("button", { name: "Sign in" }).click();
    await admin.waitForURL(BASE + "/admin");
    assert.equal(await admin.getByTestId("admin-stat-total").textContent(), "77");
    assert.equal(await admin.getByTestId("admin-stat-reserved").textContent(), "4");
    await admin.locator("[data-testid=activity]:visible").first().waitFor();
  });

  await test("admin sees guest details on the reservations page and can search", async () => {
    await admin.goto(BASE + "/admin/reservations");
    const row = admin.locator(`[data-testid=reservation-row][data-reference="${reference}"]`);
    assert.match(await row.textContent(), /Aunt Grace Example.*grace@example\.test.*\+971 50 123 4567.*Doona/s);
    await admin.getByTestId("res-search").fill("grace");
    assert.equal(await admin.getByTestId("reservation-row").count(), 1);
    await admin.getByTestId("res-search").fill("");
  });

  await test("admin releases a reservation → gift is AVAILABLE again live for guests", async () => {
    admin.once("dialog", (d) => d.accept());
    await admin.locator(`[data-testid=reservation-row][data-reference="${reference}"]`).getByTestId("release").click();
    await admin.locator("[data-testid=flash]:visible").first().waitFor();
    await waitFor(async () => (await card(B, "doona-plus-grey-hound").getAttribute("data-status")) === "available", 8000, "released live");
  });

  await test("admin marks a reservation purchased → guests see PURCHASED", async () => {
    const r = await serverReserve("lamb-set", "Uncle Sam");
    await admin.reload();
    admin.once("dialog", (d) => d.accept());
    await admin.locator(`[data-testid=reservation-row][data-reference="${r.reference}"]`).getByTestId("mark-purchased").click();
    await waitFor(async () => /purchased/.test(await admin.locator(`[data-testid=reservation-row][data-reference="${r.reference}"] [data-testid=reservation-status]`).textContent()), 8000, "purchased row");
    await waitFor(async () => (await card(B, "lamb-set").getAttribute("data-status")) === "purchased", 8000, "purchased live");
  });

  await test("admin exports reservations and gifts as CSV", async () => {
    const cookies = (await admin.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
    const r = await fetch(BASE + "/admin/export/reservations", { headers: { cookie: cookies } });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/csv/);
    const csv = await r.text();
    assert.match(csv, /Reference,Status,Gift/);
    assert.match(csv, /grace@example\.test/);
    const g = await (await fetch(BASE + "/admin/export/gifts", { headers: { cookie: cookies } })).text();
    assert.equal(g.trim().split("\r\n").length, 78); // header + 77
  });

  await test("admin sets the AED→UGX rate → UGX prices appear for guests", async () => {
    await admin.goto(BASE + "/admin/settings");
    await admin.getByLabel("1 AED = ? UGX").fill("1000");
    await admin.getByRole("button", { name: "Save rate" }).click();
    await admin.getByText(/Exchange rate saved/).waitFor();
    await waitFor(async () => (await B.getByTestId("price-ugx").count()) > 0, 8000, "UGX via realtime");
    const doona = await card(B, "doona-plus-grey-hound").getByTestId("price-ugx").textContent();
    assert.equal(doona.trim(), "≈ UGX 3,199,000");
    await B.reload();
    assert.match(await B.getByTestId("currency-note").first().textContent(), /approximate.*1 AED ≈ 1,000 UGX/);
  });

  await test("admin creates, edits and deletes a gift", async () => {
    await admin.goto(BASE + "/admin/gifts/new");
    await admin.getByLabel("Name *").fill("E2E Test Rattle");
    await admin.getByLabel("Range from").fill("40");
    await admin.getByLabel("Range to").fill("60");
    await admin.getByTestId("save-gift").click();
    await admin.waitForURL(/\/admin\/gifts\/[0-9a-f-]{36}\?created=1/);
    await admin.getByLabel("Price", { exact: true }).fill("55");
    await admin.getByLabel("Range from").fill("");
    await admin.getByLabel("Range to").fill("");
    await admin.getByTestId("save-gift").click();
    await admin.getByTestId("form-status").filter({ hasText: "Gift saved" }).waitFor();
    await waitFor(async () => (await card(B, "e2e-test-rattle").count()) === 1, 8000, "new gift live on registry");
    await waitFor(async () => /AED 55/.test(await card(B, "e2e-test-rattle").getByTestId("price-aed").textContent()), 8000, "edited price live");
    await admin.goto(BASE + "/admin/gifts");
    admin.once("dialog", (d) => d.accept());
    await admin.locator('[data-testid=admin-gift-row][data-slug="e2e-test-rattle"]').getByRole("button", { name: /Delete/ }).click();
    await waitFor(async () => (await card(B, "e2e-test-rattle").count()) === 0, 8000, "gift removed live");
  });

  await test("admin adds a verified product link and store → guests see them", async () => {
    const id = await giftId("skip-hop-moby");
    await admin.goto(`${BASE}/admin/gifts/${id}`);
    const form = admin.getByTestId("link-form");
    await form.locator("select[name=retailerId]").selectOption({ label: "Mom Store" });
    await form.getByLabel("Product URL").fill("https://shop.example.test/skip-hop-moby");
    await form.getByLabel(/checked this link/).check();
    await form.getByRole("button", { name: /Save shop link/ }).click();
    await admin.getByText("Shopping link saved.").waitFor();
    const p = await newPage();
    await p.goto(BASE + "/gift/skip-hop-moby");
    const link = p.getByRole("link", { name: /Buy at Mom Store/ });
    assert.equal(await link.getAttribute("href"), "https://shop.example.test/skip-hop-moby");
    await p.context().close();
  });

  console.log("\nMobile");
  await test("mobile: no horizontal scrolling on key pages, and reserving works on a phone", async () => {
    const m = await newPage({ ...devices["iPhone 13"] });
    for (const path of ["/", "/registry", "/registry/travel", "/gift/maxi-cosi-iora-air", "/my-gifts", `/reservation/${reference}`, "/admin/login"]) {
      await m.goto(BASE + path);
      const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(over <= 0, `${path} overflows by ${over}px`);
    }
    await m.goto(BASE + "/registry/feeding");
    await reserveViaUi(m, "matchstick-monkey", { name: "Mobile Guest" });
    await m.locator("[data-testid=reservation-reference]:visible").first().waitFor();
    await m.context().close();
  });

  console.log("\nMy gifts");
  await test("the budget summary is gone: no page and no links", async () => {
    const p = await newPage();
    await p.goto(BASE + "/");
    assert.equal(await p.getByText("Budget summary").count(), 0);
    assert.equal(await p.locator('a[href="/budget"]').count(), 0);
    await p.goto(BASE + "/budget");
    assert.match(await p.locator("h1").first().textContent(), /couldn’t find/);
    await p.context().close();
  });

  let personalLink;
  await test("a guest who reserves two gifts sees both, with a count, under My gifts", async () => {
    const g = await newPage();
    await g.goto(BASE + "/registry/clothing");
    await reserveViaUi(g, "hats", { name: "Pledging Guest" });
    await g.goto(BASE + "/registry/clothing");
    await reserveViaUi(g, "socks", { name: "Pledging Guest" });
    const banner = g.locator("[data-testid=my-gifts-banner]:visible").first();
    await banner.waitFor();
    assert.match(await banner.textContent(), /pledged 2 gifts/);
    await g.getByTestId("nav-my-gifts").click();
    await g.waitForURL(/\/my-gifts$/);
    assert.match(await g.locator("h1").first().textContent(), /You’ve pledged 2 gifts/);
    const names = await g.locator("[data-testid=pledge] p.font-display").allTextContents();
    assert.deepEqual(names, ["Socks", "Hats"]);
    assert.match(await g.locator("[data-testid=pledge-summary]:visible").first().textContent(), /2 still to buy/);
    personalLink = (await g.locator("[data-testid=personal-link] code").textContent()).trim();
    assert.match(personalLink, /^http:\/\/localhost:3000\/my-gifts\/[A-Za-z0-9_-]{32}$/);
    await g.context().close();
  });

  await test("the personal link shows the same gifts on another device; strangers see none", async () => {
    const other = await newPage({ ...devices["iPhone 13"] });
    await other.goto(personalLink);
    await other.waitForURL(/\/my-gifts$/); // key moved into a cookie, out of the address bar
    await other.locator("[data-testid=pledge]:visible").first().waitFor();
    assert.equal(await other.locator("[data-testid=pledge]:visible").count(), 2);
    await other.reload();
    await other.locator("[data-testid=pledge]:visible").first().waitFor();
    assert.equal(await other.locator("[data-testid=pledge]:visible").count(), 2, "remembered after reload");
    await other.context().close();

    const stranger = await newPage();
    await stranger.goto(BASE + "/my-gifts");
    assert.match(await stranger.locator("h1").first().textContent(), /haven’t pledged/);
    await stranger.goto(BASE + "/my-gifts/not-a-real-key");
    assert.match(await stranger.locator("main").textContent(), /isn’t complete/);
    await stranger.context().close();
  });

  await test("reserving with an email links this device to that email's list", async () => {
    const x = await newPage();
    await x.goto(BASE + "/registry/feeding");
    await reserveViaUi(x, "mam-easy-start-starter-set", { name: "Email Guest", email: "Email.Guest@Example.test" });
    await x.goto(BASE + "/my-gifts");
    await x.locator("[data-testid=pledge]:visible").first().waitFor();
    assert.match(await x.locator("[data-testid=linked-email]:visible").first().textContent(), /email\.guest@example\.test/);
    await x.getByText("MAM Easy Start starter set").first().waitFor();
    await x.context().close();
  });

  await test("the emailed link shows that email's gifts on any other device; forged links are refused", async () => {
    const y = await newPage({ ...devices["iPhone 13"] });
    await y.goto(`${BASE}/my-gifts/e/${emailToken("email.guest@example.test")}`);
    await y.waitForURL(/\/my-gifts$/); // token moved into a cookie, out of the address bar
    await y.getByText("MAM Easy Start starter set").first().waitFor();
    await y.context().close();

    const z = await newPage();
    await z.goto(`${BASE}/my-gifts/e/${emailToken("email.guest@example.test", 30, "wrong-secret")}`);
    await z.getByText(/expired or isn’t complete/).first().waitFor();
    assert.equal(await z.locator("[data-testid=pledge]:visible").count(), 0);
    await z.goto(`${BASE}/my-gifts/e/${emailToken("email.guest@example.test", -1)}`); // expired yesterday
    await z.getByText(/expired or isn’t complete/).first().waitFor();
    await z.context().close();
  });

  await test("'Email me my list' explains when emailing isn't switched on", async () => {
    const w = await newPage();
    await w.goto(BASE + "/my-gifts");
    const form = w.locator("[data-testid=email-list-form]:visible").first();
    await form.getByLabel("Your email").fill("someone@example.test");
    await form.getByRole("button", { name: /Email me my list/ }).click();
    await w.locator("[data-testid=email-list-status]:visible").first().waitFor();
    // Local test runs have no Gmail configured, so the page says so instead of pretending to send.
    assert.match(await w.locator("[data-testid=email-list-status]:visible").first().textContent(), /isn’t switched on yet/);
    await w.context().close();
  });

  await test("My gifts follows the family's updates (purchased)", async () => {
    const ref = (await svc.from("reservations").select("id, reference").eq("gift_name_snapshot", "Hats").eq("status", "active").single()).data;
    const c = await (await browser.newContext()).newPage();
    await c.goto(personalLink);
    await c.waitForURL(/\/my-gifts$/);
    await admin.goto(BASE + "/admin/reservations");
    admin.once("dialog", (d) => d.accept());
    await admin.locator(`[data-testid=reservation-row][data-reference="${ref.reference}"]`).getByTestId("mark-purchased").click();
    await admin.getByTestId("flash").waitFor();
    await c.reload();
    await c.locator("[data-testid=pledge]:visible").first().waitFor();
    assert.equal(await c.locator('[data-testid=pledge][data-status="purchased"]:visible').count(), 1);
    assert.match(await c.locator("[data-testid=pledge-summary]:visible").first().textContent(), /1 still to buy/);
    await c.context().close();
  });
} finally {
  await svc.from("registry_settings").update({ max_reservations_per_client_per_day: limits.max_reservations_per_client_per_day }).eq("id", 1);
  await browser.close();
  await svc.auth.admin.deleteUser(au.user.id);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failed:\n - " + failures.join("\n - "));
  process.exit(1);
}
