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
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 text-center md:px-6">
      <div className="mx-auto w-full max-w-lg">
        <p className="eyebrow text-ember">You&apos;re all set</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">{action.title}</h1>
        <p className="mt-2 text-sm text-ink/60">{action.body}</p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={action.href}
            className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
          >
            {action.cta}
          </Link>
          <Link href="/explore" className="text-sm font-medium text-ink/50 hover:text-ink">
            Just take me to Explore →
          </Link>
        </div>
      </div>
    </main>
  );
}
