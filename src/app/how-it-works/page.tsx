import Link from "next/link";
import { CalendarIcon, ChatIcon, CompassIcon, TicketIcon, TrophyIcon } from "@/components/icons";

const steps = [
  {
    icon: CompassIcon,
    title: "1. Discover",
    body:
      "Browse places, experiences, events and the five curated Wano Journeys across Kampala and beyond. Every business on Wano has gone through our verification process.",
  },
  {
    icon: ChatIcon,
    title: "2. Connect",
    body:
      "Follow people, see who's going to an event, join the conversation, and find your community through Wano Clubs.",
  },
  {
    icon: CalendarIcon,
    title: "3. Experience",
    body:
      "Show up — to a restaurant, a watch party, a gorilla trek, a concert. Mark yourself Going, Interested or Maybe on any event.",
  },
  {
    icon: TicketIcon,
    title: "4. Book",
    body:
      "When you book through Wano, you're entering a direct contract with the verified business — the platform never operates transport, accommodation, tours, or venues itself. Each completed booking earns one Wano Passport stamp for that journey.",
  },
  {
    icon: TrophyIcon,
    title: "5. Share, then discover again",
    body:
      "Post about what you did, tag the place or event, and help the next person discover it. Collect all five Passport stamps for a shot at the grand prize.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">How it works</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-forest-900 md:text-4xl">
        Discover. Connect. Experience.
      </h1>
      <p className="mt-4 text-forest-800/75">
        Wano curates and connects — it doesn&apos;t operate transport, accommodation, or tours
        itself. Every booking made through Wano is a direct contract between you and a verified
        business.
      </p>

      <ol className="mt-10 space-y-8">
        {steps.map((step) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-forest-800 text-marigold-300">
              <step.icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-forest-900">{step.title}</h2>
              <p className="mt-1 text-sm text-forest-800/75">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-2xl border border-forest-900/10 bg-forest-50 p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Ready to get started?
        </h2>
        <p className="mt-1 text-sm text-forest-800/70">It&apos;s free, and takes under a minute.</p>
        <Link
          href="/signup"
          className="mt-4 inline-flex rounded-full bg-marigold-500 px-5 py-2.5 text-sm font-semibold text-forest-950 hover:bg-marigold-400"
        >
          Create your account
        </Link>
      </div>
    </main>
  );
}
