import { NextResponse } from "next/server";
import { confirmXpPayment } from "@/lib/actions/xp-actions";
import { verifyWebhookSignature } from "@/lib/flutterwave";

// First webhook endpoint in the app. Flutterwave authenticates its
// webhook requests with a static secret hash (not a computed signature)
// sent in the verif-hash header — set to match FLUTTERWAVE_WEBHOOK_SECRET_HASH
// under Settings > Webhooks in the Flutterwave dashboard, alongside this
// route's URL.
//
// This is one of two independent paths that can confirm an XP booking —
// the other is the checkout redirect back to /events/[id] — so it always
// responds 200 once authenticated, even if confirmXpPayment itself fails
// internally, to avoid Flutterwave's aggressive retry behavior for a
// transient issue the redirect path may already have resolved.
export async function POST(request: Request) {
  const signature = request.headers.get("verif-hash");
  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const txRef = body?.data?.tx_ref;
  const transactionId = body?.data?.id;

  if (typeof txRef === "string" && transactionId != null) {
    await confirmXpPayment(txRef, String(transactionId)).catch((err) => {
      console.error("XP webhook confirm failed", err);
    });
  }

  return NextResponse.json({ ok: true });
}
