// [ASSUMPTION] Placeholder legal text — not reviewed by counsel.
export default function TermsPage() {
  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <h1 className="font-serif-editorial text-3xl text-ink">Terms of Service</h1>
        <p className="eyebrow mt-2 text-ink/40">Last updated: [ASSUMPTION — set on launch]</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/70">
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">What Wano is</h2>
            <p className="mt-2">
              Wano discovers, curates, and verifies businesses in Uganda. Every booking made through
              Wano is a direct contract between you and the accredited business — Wano is not the
              party fulfilling the stay, meal, or experience, and does not process payment for it.
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">Verification</h2>
            <p className="mt-2">
              A &quot;Wano Verified&quot; badge means the business passed our KYC review (registration, ID, and
              supporting documents). It is not a guarantee of the quality of any specific booking, and
              it is not a refund or insurance policy.
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">Cancellations & disputes</h2>
            <p className="mt-2">
              Cancellation and refund terms are set by the individual business, not Wano. If something
              goes wrong, contact the business directly first; Wano support can help mediate but
              doesn&apos;t guarantee a specific outcome. [ASSUMPTION — replace once a real resolution
              process exists.]
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">Account conduct</h2>
            <p className="mt-2">
              Reviews must come from a completed booking. Vendors must provide accurate information
              during verification. Wano may suspend accounts that violate these terms.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
