import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

const firstActionByPersona = {
  newcomer: {
    title: "Book your airport transfer",
    body: "Landing soon? Sort a ride before you arrive so there's no scramble at the airport.",
    href: "/explore?type=transport",
    cta: "Find transport",
  },
  tourist: {
    title: "Explore top experiences near you",
    body: "Five curated Wano Journeys, verified partners, and real traveller reviews.",
    href: "/journeys",
    cta: "See the Journeys",
  },
  local: {
    title: "Find what's new this week",
    body: "Fresh events, deals, and newly-verified places around you.",
    href: "/events",
    cta: "See what's on",
  },
} as const;

export default async function OnboardingDonePage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  const persona = travellerProfile?.persona ?? "local";
  const action = firstActionByPersona[persona];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12 text-center md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">You're all set</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900">{action.title}</h1>
      <p className="mt-2 text-sm text-forest-800/70">{action.body}</p>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={action.href}
          className="rounded-full bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
        >
          {action.cta}
        </Link>
        <Link href="/home" className="text-sm font-medium text-forest-800/60 hover:text-forest-900">
          Just take me to Home →
        </Link>
      </div>
    </main>
  );
}
