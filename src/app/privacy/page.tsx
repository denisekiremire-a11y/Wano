// [ASSUMPTION] Placeholder legal text — not reviewed by counsel. Replace
// before this app handles real user data at scale. Structured around
// Uganda's Data Protection and Privacy Act, 2019 (DPPA) obligations:
// lawful basis, data minimization, a named point of contact, and the
// rights it grants data subjects (access, correction, deletion, objection).
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-forest-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-forest-800/60">Last updated: [ASSUMPTION — set on launch]</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-forest-800/80">
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">What we collect</h2>
          <p className="mt-2">
            Account details you give us (name, email, password), booking and review activity, and
            for accredited business partners, KYC documents submitted for verification. We collect
            only what's needed to run bookings, verification, and rewards — not more.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Sensitive documents</h2>
          <p className="mt-2">
            Business verification documents (registration certificates, IDs, tax certificates) are
            stored securely and are only accessible to the submitting business and Wano admins
            reviewing accreditation. Every access is logged.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Your rights</h2>
          <p className="mt-2">
            Under Uganda's Data Protection and Privacy Act, 2019, you can request a copy of your
            data, ask us to correct or delete it, and object to how it's used. [ASSUMPTION — add a
            real contact address/email once one exists.]
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Payments</h2>
          <p className="mt-2">
            Wano does not process payments — bookings are a direct contract between you and the
            accredited business. We never collect or store card details.
          </p>
        </section>
      </div>
    </main>
  );
}
