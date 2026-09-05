import { sendEmail } from "@/lib/email";

// Same address the footer's "Need help?" link uses, by default — override
// with ADMIN_NOTIFICATION_EMAIL if these should go somewhere else.
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "denisekiremire@gmail.com";

/** Fire-and-forget transactional ping to any user — never throws, so a
 * notification failure can never block the action it's reporting on. */
export async function notifyUser(email: string, subject: string, bodyLines: string[]) {
  try {
    const html = bodyLines.map((line) => `<p>${line}</p>`).join("\n");
    await sendEmail({ to: email, subject: `[Wano] ${subject}`, html });
  } catch (err) {
    console.error("[notifyUser] failed:", err);
  }
}

/** Same as notifyUser, always sent to the admin address. */
export async function notifyAdmin(subject: string, bodyLines: string[]) {
  await notifyUser(ADMIN_EMAIL, subject, bodyLines);
}
