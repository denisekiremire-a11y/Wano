import { ByJourneyView } from "./by-journey-view";
import { AnchorBar } from "@/components/afcon/anchor-bar";
import { getAllPublicListings } from "@/lib/data/journeys";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
import { getPassportProgress, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getSession } from "@/lib/session";

export default async function JourneysPage() {
  const session = await getSession();

  let unlockedJourneyIds = new Set<string>();
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const { progress } = await getPassportProgress(travellerProfile.id);
      unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));
    }
  }

  const journeysWithPartners = await getAllPublicListings();

  return (
    <main className="font-editorial-body mx-auto max-w-4xl bg-paper px-4 py-12 md:px-6">
      <p className="eyebrow text-ember">The five Wano Journeys</p>
      <h1 className="font-editorial mt-2 text-3xl font-bold text-ink md:text-4xl">
        Find the trip that matches why you&apos;re here.
      </h1>
      <p className="mt-3 max-w-2xl text-ink/70">
        Every business below is Wano-verified. Expand a journey to see who&apos;s on it — sign up
        and book to unlock that journey&apos;s member deals.
      </p>

      {AFCON_CLUB_ENABLED && (
        <div className="mt-6">
          <AnchorBar showStadiums={false} />
        </div>
      )}

      <div className="mt-6">
        <ByJourneyView
          journeysWithPartners={journeysWithPartners}
          unlockedJourneyIds={unlockedJourneyIds}
          session={session}
        />
      </div>
    </main>
  );
}
