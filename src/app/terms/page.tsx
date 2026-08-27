// [ASSUMPTION] Placeholder legal text — not reviewed by counsel.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-forest-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-forest-800/60">Last updated: [ASSUMPTION — set on launch]</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-forest-800/80">
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">What Wano is</h2>
          <p className="mt-2">
            Wano discovers, curates, and verifies businesses in Uganda. Every booking made through
            Wano is a direct contract between you and the accredited business — Wano is not the
            party fulfilling the stay, meal, or experience, and does not process payment for it.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Verification</h2>
          <p className="mt-2">
            A "Wano Verified" badge means the business passed our KYC review (registration, ID, and
            supporting documents). It is not a guarantee of the quality of any specific booking, and
            it is not a refund or insurance policy.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Cancellations & disputes</h2>
          <p className="mt-2">
            Cancellation and refund terms are set by the individual business, not Wano. If something
            goes wrong, contact the business directly first; Wano support can help mediate but
            doesn't guarantee a specific outcome. [ASSUMPTION — replace once a real resolution
            process exists.]
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Account conduct</h2>
          <p className="mt-2">
            Reviews must come from a completed booking. Vendors must provide accurate information
            during verification. Wano may suspend accounts that violate these terms.
          </p>
        </section>
      </div>
    </main>
  );
}
