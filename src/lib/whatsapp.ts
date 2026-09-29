import "server-only";

// Sends through Wati (a WhatsApp Business Solution Provider built on
// Meta's Cloud API) — same optional-credential, graceful-fallback shape as
// email.ts/flutterwave.ts: with no WATI_API_ENDPOINT/WATI_API_TOKEN set,
// every call just logs to the console instead of sending, so local dev and
// previews without the keys still work.
//
// The exact request shape below (path, body, header names) is Wati's
// documented REST API as of when this was written — verify it against
// https://docs.wati.io once real credentials are in place, since BSP APIs
// do shift over time and this hasn't been exercised against a live
// account yet.
const WATI_API_ENDPOINT = process.env.WATI_API_ENDPOINT;
const WATI_API_TOKEN = process.env.WATI_API_TOKEN;

export function isWhatsappConfigured() {
  return Boolean(WATI_API_ENDPOINT && WATI_API_TOKEN);
}

/** Sends a pre-approved WhatsApp template message (business-initiated
 * messages outside a 24h customer-service window must use an approved
 * template — see Meta's WhatsApp Business Platform rules). toPhone must
 * already be normalized (digits only, country-code-prefixed — see
 * toWhatsAppNumber in @/lib/afcon/phone). Never throws — a notification
 * failure should never block the booking action that triggered it, same
 * philosophy as notifyUser/notifyAdmin. */
export async function sendWhatsappTemplate({
  toPhone,
  templateName,
  parameters,
}: {
  toPhone: string;
  templateName: string;
  parameters: { name: string; value: string }[];
}): Promise<boolean> {
  if (!isWhatsappConfigured()) {
    console.log(
      `[whatsapp stub] To: ${toPhone}\nTemplate: ${templateName}\nParameters: ${JSON.stringify(parameters)}\n`,
    );
    return true;
  }

  try {
    const res = await fetch(
      `${WATI_API_ENDPOINT}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(toPhone)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WATI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_name: templateName,
          broadcast_name: templateName,
          parameters,
        }),
      },
    );
    if (!res.ok) {
      console.error("[whatsapp] Wati request failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp] failed to send:", err);
    return false;
  }
}
