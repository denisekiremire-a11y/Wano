// [ASSUMPTION] Placeholder legal text — not reviewed by counsel. Replace
// before this app handles real user data at scale. Structured around
// Uganda's Data Protection and Privacy Act, 2019 (DPPA) obligations:
// lawful basis, data minimization, a named point of contact, and the
// rights it grants data subjects (access, correction, deletion, objection).
export default function PrivacyPage() {
  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <h1 className="font-serif-editorial text-3xl text-ink">Privacy Policy</h1>
        <p className="eyebrow mt-2 text-ink/40">Last updated: [ASSUMPTION — set on launch]</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/70">
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">What we collect</h2>
            <p className="mt-2">
              Account details you give us (name, email, password), booking and review activity, and
              for accredited business partners, KYC documents submitted for verification. We collect
              only what&apos;s needed to run bookings, verification, and rewards — not more.
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">Sensitive documents</h2>
            <p className="mt-2">
              Business verification documents (registration certificates, IDs, tax certificates) are
              stored securely and are only accessible to the submitting business and Wano admins
              reviewing accreditation. Every access is logged.
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">Your rights</h2>
            <p className="mt-2">
              Under Uganda&apos;s Data Protection and Privacy Act, 2019, you can request a copy of your
              data, ask us to correct or delete it, and object to how it&apos;s used. [ASSUMPTION — add a
              real contact address/email once one exists.]
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">Payments</h2>
            <p className="mt-2">
              Wano does not process payments — bookings are a direct contract between you and the
              accredited business. We never collect or store card details.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
