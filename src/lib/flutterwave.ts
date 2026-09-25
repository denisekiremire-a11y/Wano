import "server-only";

// Real payment processing for Wano XP paid seats — Standard Checkout v3
// API. Small, isolated functions (mirrors reward-token.ts/ticket-token.ts)
// so the actual HTTP calls are easy to review in one place. See
// xp-actions.ts for how these get wired into the booking flow, including
// the local-dev fallback when no key is configured.
const API_BASE = "https://api.flutterwave.com/v3";

export function isFlutterwaveConfigured() {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

/** Names of the Flutterwave env vars that aren't set. Paid seats need both:
 * the secret key to take payment, the webhook hash so /api/webhooks/flutterwave
 * can confirm bookings when the traveller never returns from checkout. */
export function missingFlutterwaveEnv(): string[] {
  return ["FLUTTERWAVE_SECRET_KEY", "FLUTTERWAVE_WEBHOOK_SECRET_HASH"].filter((name) => !process.env[name]);
}

function getSecretKey() {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLUTTERWAVE_SECRET_KEY is not set.");
  return key;
}

async function flutterwaveFetch(path: string, init: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json();
  if (!response.ok || body.status !== "success") {
    throw new Error(`Flutterwave request to ${path} failed: ${body.message ?? response.statusText}`);
  }
  return body;
}

/** Initiates a Standard Checkout payment and returns the hosted checkout
 * URL to redirect the traveller to. txRef must be unique per attempt —
 * xp-actions.ts uses the xp_bookings row's own id. */
export async function createFlutterwavePayment({
  txRef,
  amountUgx,
  customerEmail,
  customerName,
  customerPhone,
  title,
  redirectUrl,
}: {
  txRef: string;
  amountUgx: number;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  title: string;
  redirectUrl: string;
}): Promise<string> {
  const body = await flutterwaveFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: txRef,
      amount: amountUgx,
      currency: "UGX",
      redirect_url: redirectUrl,
      payment_options: "card,mobilemoneyuganda,ussd",
      customer: {
        email: customerEmail,
        name: customerName,
        phonenumber: customerPhone,
      },
      customizations: {
        title: "Wano XP",
        description: title,
      },
    }),
  });
  const link = body?.data?.link;
  if (typeof link !== "string") throw new Error("Flutterwave did not return a checkout link.");
  return link;
}

export type FlutterwaveVerification = {
  id: string;
  txRef: string;
  amount: number;
  currency: string;
  status: string;
};

/** Fetches the authoritative status of a transaction by Flutterwave's own
 * id — never trust a redirect query param or webhook body without this. */
export async function verifyFlutterwaveTransaction(transactionId: string): Promise<FlutterwaveVerification> {
  const body = await flutterwaveFetch(`/transactions/${encodeURIComponent(transactionId)}/verify`, {
    method: "GET",
  });
  const data = body?.data;
  return {
    id: String(data?.id),
    txRef: String(data?.tx_ref),
    amount: Number(data?.amount),
    currency: String(data?.currency),
    status: String(data?.status),
  };
}

/** Refunds a previously-confirmed transaction for its full booked amount. */
export async function refundFlutterwaveTransaction(transactionId: string, amountUgx: number): Promise<boolean> {
  try {
    await flutterwaveFetch(`/transactions/${encodeURIComponent(transactionId)}/refund`, {
      method: "POST",
      body: JSON.stringify({ amount: amountUgx }),
    });
    return true;
  } catch {
    return false;
  }
}

/** Flutterwave signs webhook requests with a static secret hash (set to
 * match in the dashboard) sent in the verif-hash header — not a computed
 * HMAC, a plain shared-secret comparison. */
export function verifyWebhookSignature(headerValue: string | null): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  return Boolean(secret) && headerValue === secret;
}
