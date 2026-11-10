import { sendEmail } from "@/lib/email";
import { renderEmailHtml, type EmailBadge } from "@/lib/email-template";

// Same address the footer's "Need help?" link uses, by default — override
// with ADMIN_NOTIFICATION_EMAIL if these should go somewhere else.
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "denisekiremire@gmail.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type NotifyOptions = {
  /** A solid status badge above the heading — "check" for anything
   * confirmed/successful, "alert" for something gone wrong, "info" for a
   * neutral FYI. Omit for plain updates (most admin/vendor notices). */
  badge?: EmailBadge;
  /** Shown in a boxed, monospace callout — the one thing in most of these
   * emails worth making impossible to miss. */
  code?: string;
  /** Rendered as a real button instead of an inline link. */
  ctaLabel?: string;
  ctaUrl?: string;
};

/** Fire-and-forget transactional ping to any user — never throws, so a
 * notification failure can never block the action it's reporting on. Wraps
 * bodyLines in the shared branded template (see email-template.ts) so every
 * notification in the app — booking confirmations, cancellations, admin
 * alerts — gets the same header/footer/styling instead of bare <p> tags. */
export async function notifyUser(email: string, subject: string, bodyLines: string[], opts?: NotifyOptions) {
  try {
    const html = renderEmailHtml({
      heading: subject,
      bodyHtml: bodyLines.map((line) => `<p style="margin:0 0 10px;">${line}</p>`).join("\n"),
      badge: opts?.badge,
      code: opts?.code,
      ctaLabel: opts?.ctaLabel,
      ctaUrl: opts?.ctaUrl,
      appUrl: APP_URL,
    });
    await sendEmail({ to: email, subject: `[Wano] ${subject}`, html });
  } catch (err) {
    console.error("[notifyUser] failed:", err);
  }
}

/** Same as notifyUser, always sent to the admin address. */
export async function notifyAdmin(subject: string, bodyLines: string[], opts?: NotifyOptions) {
  await notifyUser(ADMIN_EMAIL, subject, bodyLines, opts);
}
