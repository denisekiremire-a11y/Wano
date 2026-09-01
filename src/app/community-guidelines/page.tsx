export default function CommunityGuidelinesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Community Guidelines</h1>
      <p className="mt-2 text-sm text-forest-800/60">Plain English, no legalese. Last updated 2026.</p>

      <div className="mt-6 space-y-5 text-sm text-forest-800/90">
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Be real</h2>
          <p className="mt-1">
            Post your own photos and experiences. Don&apos;t impersonate someone else, fake a review, or
            pretend to be a business you&apos;re not connected to.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Be kind</h2>
          <p className="mt-1">
            No harassment, hate speech, or targeted abuse — of members, businesses, or anyone else. Disagree
            with a review or a take without attacking the person behind it.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Keep it safe</h2>
          <p className="mt-1">
            Nothing illegal, no sexual content involving minors, no threats or incitement to violence. We
            report anything that legally requires it.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">No spam</h2>
          <p className="mt-1">
            Don&apos;t flood the feed with repeated posts, unrelated links, or promotional content that
            isn&apos;t yours to post. Businesses should use their vendor account, not fake traveller posts.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">What happens if you don&apos;t</h2>
          <p className="mt-1">
            Reported content gets reviewed by an admin, who can dismiss the report, hide or remove the
            content, warn the account, or suspend it. A first post from a brand-new account is held for
            review automatically before it&apos;s visible to anyone else — that&apos;s normal, not a
            punishment.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-forest-900">Report and block</h2>
          <p className="mt-1">
            Every post, comment, and profile has a report option. Blocking someone hides their posts and
            comments from you, and yours from them, in both directions — no notification is sent to them.
          </p>
        </section>
      </div>
    </main>
  );
}
