import { sendEmail } from "@/lib/email";

// Same address the footer's "Need help?" link uses, by default — override
// with ADMIN_NOTIFICATION_EMAIL if these should go somewhere else.
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "denisekiremire@gmail.com";

/** Fire-and-forget admin ping on new signups/registrations — never throws,
 * so a notification failure can never block the actual signup/application
 * it's reporting on. */
export async function notifyAdmin(subject: string, bodyLines: string[]) {
  try {
    const html = bodyLines.map((line) => `<p>${line}</p>`).join("\n");
    await sendEmail({ to: ADMIN_EMAIL, subject: `[Wano] ${subject}`, html });
  } catch (err) {
    console.error("[notifyAdmin] failed:", err);
  }
}
