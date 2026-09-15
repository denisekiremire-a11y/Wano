import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Contact Wano — plan a trip or get verified",
  description:
    "Join as a member, plan a journey, or get your business verified and listed on Wano. We'll get back to you within two business days.",
};

// Reuses the same address admin notification emails already go to (see
// ADMIN_NOTIFICATION_EMAIL in .env.example) — that's documented there as
// doubling as the site's public support address. Falls back to a
// placeholder if unset.
const CONTACT_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "hello@wano.app";

export default function ContactPage() {
  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-4xl px-4 pt-14 md:px-6">
        <p className="eyebrow text-ember">Contact</p>
        <h1 className="font-editorial mt-3 text-4xl font-bold leading-[0.95] text-ink md:text-5xl">
          Let&apos;s talk Wano.
        </h1>
        <p className="mt-4 max-w-xl text-ink/70">
          Join as a member, plan a journey, or get your business verified and listed. We&apos;ll
          get back to you within two business days.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="eyebrow text-ink/45">Email</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block font-editorial text-lg font-bold text-ink">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="eyebrow text-ink/45">Based in</p>
              <p className="mt-1 font-editorial text-lg font-bold text-ink">Kampala, Uganda</p>
            </div>
            <div className="rounded-2xl bg-ink p-5 text-white">
              <p className="eyebrow text-ember">List your business</p>
              <p className="font-editorial mt-1.5 text-lg font-bold">Get verified on Wano</p>
              <p className="mt-1.5 text-sm text-white/70">
                Restaurants, stays, salons, tour operators and experiences — reach travellers and
                locals who book directly with you.
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-flex rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember-hover"
              >
                Get started
              </Link>
            </div>
          </div>

          <ContactForm toEmail={CONTACT_EMAIL} />
        </div>
      </section>
    </main>
  );
}
