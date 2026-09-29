import Link from "next/link";

const steps = [
  {
    title: "Discover",
    body:
      "Browse places, experiences, events and the five curated Wano Journeys across Kampala and beyond. Every business on Wano has gone through our verification process.",
  },
  {
    title: "Connect",
    body:
      "Follow people, see who's going to an event, join the conversation, and find your community through Wano Clubs.",
  },
  {
    title: "Experience",
    body:
      "Show up — to a restaurant, a watch party, a gorilla trek, a concert. Mark yourself Going, Interested or Maybe on any event.",
  },
  {
    title: "Book",
    body:
      "When you book through Wano, you're entering a direct contract with the verified business — the platform never operates transport, accommodation, tours, or venues itself. Each completed booking earns one Wano Passport stamp for that journey.",
  },
  {
    title: "Share, then discover again",
    body:
      "Post about what you did, tag the place or event, and help the next person discover it. Collect all five Passport stamps for a shot at the grand prize.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <p className="eyebrow text-ember">How it works</p>
        <h1 className="font-serif-editorial mt-3 text-4xl text-ink md:text-5xl">
          Discover. Connect. Experience.
        </h1>
        <p className="mt-4 max-w-xl text-ink/70">
          Wano curates and connects — it doesn&apos;t operate transport, accommodation, or tours
          itself. Every booking made through Wano is a direct contract between you and a verified
          business.
        </p>

        <div className="mt-10 border-t border-ink/10">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="grid grid-cols-[2.5rem_1fr] items-start gap-5 border-b border-ink/10 py-8 sm:grid-cols-[4rem_1fr] sm:gap-8"
            >
              <span className="font-serif-editorial text-3xl text-ink/25 sm:text-5xl">
                0{i + 1}
              </span>
              <div>
                <h2 className="font-serif-editorial text-2xl text-ink sm:text-3xl">{step.title}</h2>
                <p className="mt-2 text-sm text-ink/60 sm:text-base">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 border border-ink/10 bg-white p-6">
          <h2 className="font-serif-editorial text-2xl text-ink">Ready to get started?</h2>
          <p className="mt-1 text-sm text-ink/60">It&apos;s free, and takes under a minute.</p>
          <Link
            href="/signup"
            className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
          >
            Create your account
          </Link>
        </div>
      </section>
    </main>
  );
}
