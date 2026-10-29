import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete your Wano account",
};

const CONTACT_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "hello@wano.app";

// Public page the app stores link to: explains how to delete an account,
// including for someone who no longer has the app installed.
export default function DeleteAccountInfoPage() {
  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <h1 className="font-serif-editorial text-3xl text-ink">Delete your Wano account</h1>

        <div className="mt-6 space-y-5 text-sm text-ink/80">
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">In the app or on the website</h2>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                <Link href="/login?next=%2Fpassport%3Ftab%3Daccount" className="text-ink underline">
                  Sign in
                </Link>{" "}
                to Wano.
              </li>
              <li>Go to Passport, then Account.</li>
              <li>Under &ldquo;Delete account&rdquo;, choose Delete my account, type DELETE and confirm.</li>
            </ol>
            <p className="mt-2">It happens straight away and you are signed out.</p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">Can&apos;t sign in?</h2>
            <p className="mt-1">
              Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20Wano%20account`} className="text-ink underline">
                {CONTACT_EMAIL}
              </a>{" "}
              from the address on your account and we&apos;ll delete it within 7 days.
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">What gets deleted</h2>
            <p className="mt-1">
              Your name, email, phone number, birthday, photo, posts, stories, comments, reviews, follows and saved
              places. Your Passport XP and stamps are lost.
            </p>
          </section>
          <section>
            <h2 className="font-serif-editorial text-lg text-ink">What we keep</h2>
            <p className="mt-1">
              Records of past bookings and venue visits, with your name and contact details removed, so partner
              venues&apos; records and our accounts stay correct. See our{" "}
              <Link href="/privacy" className="text-ink underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
