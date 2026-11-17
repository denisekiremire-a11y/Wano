import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email notifications. Entirely optional — when nothing is configured, nothing is sent and
 * reservations work exactly the same. Failures are logged and never affect a reservation.
 *
 * Option A — Gmail (recommended for a family registry; no domain needed):
 *   SMTP_USER            – the Gmail address, e.g. ourfamily@gmail.com
 *   SMTP_PASS            – a Gmail "App Password" (16 characters), NOT the normal password
 *   SMTP_HOST / SMTP_PORT – optional; default smtp.gmail.com / 465
 *   EMAIL_FROM_NAME      – optional display name, default "Baby Peaches Registry"
 *
 * Option B — Resend (https://resend.com):
 *   RESEND_API_KEY, and NOTIFY_FROM_EMAIL on a domain verified in Resend to email guests.
 *
 * NOTIFY_OWNER_EMAIL – where "new reservation" emails go (comma-separated). With Gmail it
 *                      defaults to SMTP_USER.
 */

const TEST_SENDER = "Baby Registry <onboarding@resend.dev>";

export interface ReservationEmailData {
  reference: string;
  giftName: string;
  giftSlug: string | null;
  priceText: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  message: string | null;
  siteUrl: string;
  myGiftsUrl: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Strip characters that could break an email header. */
const headerSafe = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 150);

function layout(title: string, rows: [string, string][], footerHtml: string): string {
  const body = rows
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#7d7266;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0;color:#2f2a25">${v}</td></tr>`)
    .join("");
  return `<div style="background:#fbf8f3;padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ede4d6;border-radius:16px;padding:24px">
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;margin:0 0 16px;color:#2f2a25">${title}</h1>
<table style="border-collapse:collapse">${body}</table>
<div style="margin-top:20px">${footerHtml}</div>
</div></div>`;
}

const button = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:#56644b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:600">${escapeHtml(label)}</a>`;

export function ownerEmail(d: ReservationEmailData) {
  const rows: [string, string][] = [
    ["Gift", escapeHtml(d.giftName)],
    ["Price", escapeHtml(d.priceText)],
    ["Reserved by", escapeHtml(d.guestName)],
  ];
  if (d.guestEmail) rows.push(["Email", `<a href="mailto:${escapeHtml(d.guestEmail)}">${escapeHtml(d.guestEmail)}</a>`]);
  if (d.guestPhone) rows.push(["Phone", escapeHtml(d.guestPhone)]);
  if (d.message) rows.push(["Message", `“${escapeHtml(d.message)}”`]);
  rows.push(["Reference", `<code>${escapeHtml(d.reference)}</code>`]);
  return {
    subject: headerSafe(`New reservation: ${d.giftName} — reserved by ${d.guestName}`),
    html: layout("A gift has been reserved 🎁", rows, button(`${d.siteUrl}/admin/reservations`, "Open reservations")),
    text: [
      `${d.guestName} reserved: ${d.giftName} (${d.priceText})`,
      d.guestEmail ? `Email: ${d.guestEmail}` : "",
      d.guestPhone ? `Phone: ${d.guestPhone}` : "",
      d.message ? `Message: ${d.message}` : "",
      `Reference: ${d.reference}`,
      `Manage: ${d.siteUrl}/admin/reservations`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function guestEmail(d: ReservationEmailData) {
  const rows: [string, string][] = [
    ["Gift", escapeHtml(d.giftName)],
    ["Price", escapeHtml(d.priceText)],
    ["Reference", `<code>${escapeHtml(d.reference)}</code>`],
  ];
  const footer = `<p style="margin:0 0 16px;color:#5b5148">Please remember to buy this gift — reserving holds it for you on the list. Prices may have changed since the list was made, so please double-check before buying.</p>
${button(d.myGiftsUrl, "See all my gifts")}
<p style="margin:16px 0 0;font-size:13px;color:#7d7266">Keep this email: the button above is your private link to every gift you've pledged. <a href="${escapeHtml(`${d.siteUrl}/reservation/${d.reference}`)}">View this reservation</a>${d.giftSlug ? ` · <a href="${escapeHtml(`${d.siteUrl}/gift/${d.giftSlug}`)}">Where to buy</a>` : ""}</p>`;
  return {
    subject: headerSafe(`You reserved: ${d.giftName}`),
    html: layout(`Thank you, ${escapeHtml(d.guestName.split(" ")[0])}!`, rows, footer),
    text: [
      `Thank you! You reserved: ${d.giftName} (${d.priceText})`,
      `Reference: ${d.reference}`,
      `Please remember to buy this gift. Prices may have changed — please double-check before buying.`,
      `All your gifts: ${d.myGiftsUrl}`,
      `This reservation: ${d.siteUrl}/reservation/${d.reference}`,
    ].join("\n"),
  };
}

export function emailConfig() {
  const smtpUser = process.env.SMTP_USER?.trim() || "";
  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, ""); // Google shows app passwords with spaces
  const smtp = smtpUser && smtpPass
    ? {
        host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 465),
        user: smtpUser,
        pass: smtpPass,
      }
    : null;
  const apiKey = process.env.RESEND_API_KEY || "";
  const isEmail = (x: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);
  const owners = (process.env.NOTIFY_OWNER_EMAIL || (smtp ? smtp.user : ""))
    .split(",")
    .map((x) => x.trim())
    .filter(isEmail);
  const name = (process.env.EMAIL_FROM_NAME || "Baby Peaches Registry").replace(/["<>\r\n]/g, "");
  const resendFrom = process.env.NOTIFY_FROM_EMAIL?.trim() || "";
  const provider: "smtp" | "resend" | null = smtp ? "smtp" : apiKey ? "resend" : null;
  const from = smtp ? `"${name}" <${smtp.user}>` : resendFrom || TEST_SENDER;
  return {
    provider,
    smtp,
    apiKey,
    owners,
    from,
    replyTo: owners[0] ?? null,
    // Resend's test sender can only reach the account owner, so guests need a verified domain there.
    canEmailGuests: provider === "smtp" || Boolean(apiKey && resendFrom),
  };
}

let transport: Transporter | null = null;

export async function sendEmail(msg: { to: string[]; subject: string; html: string; text: string }): Promise<"sent" | "skipped" | "failed"> {
  const cfg = emailConfig();
  if (!cfg.provider || msg.to.length === 0) return "skipped";
  try {
    if (cfg.provider === "smtp" && cfg.smtp) {
      transport ??= nodemailer.createTransport({
        host: cfg.smtp.host,
        port: cfg.smtp.port,
        secure: cfg.smtp.port === 465,
        auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
        connectionTimeout: 10_000,
        socketTimeout: 15_000,
      });
      await transport.sendMail({ from: cfg.from, to: msg.to, replyTo: cfg.replyTo ?? undefined, subject: msg.subject, html: msg.html, text: msg.text });
      return "sent";
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("Email send failed", res.status, (await res.text()).slice(0, 300));
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("Email send error", e instanceof Error ? e.message : e);
    return "failed";
  }
}

/** Testing hook: forget the cached SMTP connection (e.g. after env changes). */
export function resetEmailTransport() {
  transport = null;
}

export function listLinkEmail(d: { siteUrl: string; link: string; count: number }) {
  const footer = `<p style="margin:0 0 16px;color:#5b5148">Here's your private link to the ${d.count === 1 ? "gift" : `${d.count} gifts`} you've reserved on the registry. It works on any phone or computer.</p>
${button(d.link, "See my gifts")}
<p style="margin:16px 0 0;font-size:13px;color:#7d7266">If you didn't ask for this, you can ignore this email.</p>`;
  return {
    subject: "Your gifts on the Baby Peaches registry",
    html: layout("Your gift list", [], footer),
    text: `Your private link to the gifts you've reserved: ${d.link}\nIf you didn't ask for this, you can ignore this email.`,
  };
}

/** Send the owner notification and (when possible) the guest's confirmation. Never throws. */
export async function notifyReservation(d: ReservationEmailData): Promise<{ owner: string; guest: string }> {
  const cfg = emailConfig();
  const owner = cfg.owners.length ? await sendEmail({ to: cfg.owners, ...ownerEmail(d) }) : "skipped";
  const guest = cfg.canEmailGuests && d.guestEmail ? await sendEmail({ to: [d.guestEmail], ...guestEmail(d) }) : "skipped";
  return { owner, guest };
}
