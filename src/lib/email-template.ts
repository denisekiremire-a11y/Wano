// Shared branded wrapper for every transactional email the app sends (see
// notify.ts's notifyUser, which every booking/account notification funnels
// through). Real CSS @keyframes animations don't render in Gmail (it strips
// <style> blocks entirely) or most other mail clients, so "feels alive" here
// means a proper branded layout — header, a solid status badge, a boxed
// confirmation code, a real button — not motion. Table-based layout and
// inline styles throughout: that's still the only markup every mail client
// renders consistently.

const INK = "#1e150e";
const INK_MUTED = "#84786a";
const EMBER = "#db4603";
const PAPER = "#fbf6ee";
const WHITE = "#ffffff";
const BORDER = "#e7ded0";

const SERIF_STACK = "Georgia, 'Times New Roman', serif";
const SANS_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type EmailBadge = "check" | "info" | "alert";

const BADGE_GLYPH: Record<EmailBadge, string> = {
  check: "&#10003;",
  info: "&#8505;",
  alert: "!",
};

export function renderEmailHtml(opts: {
  heading: string;
  bodyHtml: string;
  badge?: EmailBadge;
  code?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  appUrl: string;
}) {
  const { heading, bodyHtml, badge, code, ctaLabel, ctaUrl, appUrl } = opts;

  const badgeHtml = badge
    ? `<tr><td align="center" style="padding-bottom:16px;">
         <table role="presentation" cellpadding="0" cellspacing="0"><tr>
           <td width="48" height="48" align="center" valign="middle" style="width:48px;height:48px;border-radius:50%;background:${INK};color:${WHITE};font-size:22px;line-height:48px;font-family:${SANS_STACK};">${BADGE_GLYPH[badge]}</td>
         </tr></table>
       </td></tr>`
    : "";

  const codeHtml = code
    ? `<tr><td align="center" style="padding:4px 0 20px;">
         <table role="presentation" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};background:${PAPER};">
           <tr><td style="padding:10px 24px;font-family:${SANS_STACK};font-size:11px;letter-spacing:0.08em;color:${INK_MUTED};text-transform:uppercase;text-align:center;">Confirmation code</td></tr>
           <tr><td style="padding:0 24px 14px;font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:${INK};text-align:center;">${code}</td></tr>
         </table>
       </td></tr>`
    : "";

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<tr><td align="center" style="padding:8px 0 4px;">
           <table role="presentation" cellpadding="0" cellspacing="0"><tr>
             <td style="border-radius:999px;background:${EMBER};">
               <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;font-family:${SANS_STACK};font-size:14px;font-weight:600;color:${WHITE};text-decoration:none;">${ctaLabel}</a>
             </td>
           </tr></table>
         </td></tr>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${PAPER};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${WHITE};border:1px solid ${BORDER};">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
                <span style="font-family:${SANS_STACK};font-weight:800;font-size:18px;letter-spacing:-0.02em;color:${INK};">WANO</span>
              </td>
            </tr>
            <tr>
              <td
                style="padding:32px;background-image:url('${appUrl}/api/email-watermark');background-repeat:no-repeat;background-position:right -70px top -60px;background-size:260px 260px;"
              >
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${badgeHtml}
                  <tr><td align="center" style="padding-bottom:12px;font-family:${SERIF_STACK};font-size:24px;color:${INK};text-align:center;">${heading}</td></tr>
                  <tr><td style="padding-bottom:4px;font-family:${SANS_STACK};font-size:14px;line-height:1.6;color:${INK};">${bodyHtml}</td></tr>
                  ${codeHtml}
                  ${ctaHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${BORDER};font-family:${SANS_STACK};font-size:12px;line-height:1.7;color:${INK_MUTED};">
                Need help? Call or WhatsApp <a href="tel:0771013268" style="color:${EMBER};text-decoration:none;">0771013268</a>.
                <br />
                <a href="${appUrl}" style="color:${INK_MUTED};text-decoration:underline;">Wano</a> — Kampala, Uganda.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
