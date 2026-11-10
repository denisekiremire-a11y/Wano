// Sends through Resend's plain HTTP API — no SDK dependency needed, just
// fetch. Falls back to a console-log stub when RESEND_API_KEY isn't set, so
// local dev and previews without the key still work (and newsletter
// confirm/unsubscribe links stay visible in server logs either way).
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// resend.dev is Resend's shared sending address for unverified accounts —
// works immediately with no domain setup, but lands in spam more often and
// can only send to the account owner's own inbox. Verify a real domain in
// Resend and set EMAIL_FROM once this needs to reach anyone else reliably.
const FROM_EMAIL = process.env.EMAIL_FROM || "Wano <onboarding@resend.dev>";

export type EmailAttachment = {
  filename: string;
  /** Base64-encoded file content — Resend's own attachment format. */
  content: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  if (!RESEND_API_KEY) {
    const attachmentNote = attachments?.length ? ` (+ ${attachments.length} attachment(s): ${attachments.map((a) => a.filename).join(", ")})` : "";
    console.log(`[email stub] To: ${to}\nSubject: ${subject}${attachmentNote}\n${html}\n`);
    return { id: `stub_${Date.now()}` };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, attachments }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] Resend request failed (${res.status}): ${body}`);
    return { id: null };
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id };
}
