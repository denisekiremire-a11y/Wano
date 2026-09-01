// Email sending is stubbed for now — Resend isn't wired up yet. This keeps
// the same shape (to/subject/html, async, returns an id) so swapping in a
// real Resend client later is a one-file change, not a rewrite of every
// call site. For now it just logs, so newsletter confirm/unsubscribe links
// are visible in server logs during development and review.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  console.log(`[email stub] To: ${to}\nSubject: ${subject}\n${html}\n`);
  return { id: `stub_${Date.now()}` };
}
