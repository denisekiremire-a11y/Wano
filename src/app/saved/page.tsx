import Link from "next/link";
import { PartnerCard } from "@/components/partner-card";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getJourneyTagsForListings, getListingById } from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getRatingSummaries } from "@/lib/data/reviews";
import {
  getPassportProgress,
  getSavedListingsForTraveller,
  getTravellerProfileByUserId,
} from "@/lib/data/traveller";
import { requireRole } from "@/lib/auth";

export const metadata = {
  title: "Saved places — Wano",
  description: "Every place you've saved on Wano, in one list.",
};

export default async function SavedPage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);

  if (!travellerProfile) {
    return (
      <main className="font-editorial-body mx-auto max-w-4xl px-4 py-12 md:px-6">
        <p className="text-ink/60">Traveller profile not found.</p>
      </main>
    );
  }

  const [saved, { progress }] = await Promise.all([
    getSavedListingsForTraveller(travellerProfile.id),
    getPassportProgress(travellerProfile.id),
  ]);
  const unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));

  const items = (
    await Promise.all(saved.map((s) => getListingById(s.listing.id)))
  ).filter((item) => item != null);

  const listingIds = items.map((i) => i.listing.id);
  const [journeyTagsByListing, ratings, birthdayPerks, imagesByListing] = await Promise.all([
    getJourneyTagsForListings(listingIds),
    getRatingSummaries(listingIds),
    getBirthdayPerksForListings(listingIds),
    getListingImageIds(listingIds),
  ]);

  return (
    <main className="font-editorial-body mx-auto max-w-6xl px-4 py-12 md:px-6">
      <p className="eyebrow text-ember">My Uganda</p>
      <h1 className="font-editorial mt-2 text-3xl text-ink md:text-4xl">Saved places</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Everywhere you&apos;ve tapped the heart on, in one list. Save a few more while you browse
        and start building your trip.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const tags = journeyTagsByListing.get(item.listing.id) ?? [];
          const unlocked = tags.length === 0 || tags.some((t) => unlockedJourneyIds.has(t.id));
          return (
            <PartnerCard
              key={item.listing.id}
              item={item}
              tags={tags}
              unlocked={unlocked}
              session={session}
              rating={ratings.get(item.listing.id)}
              saved
              birthdayPerk={birthdayPerks.get(item.listing.id)?.[0]}
              coverImageId={imagesByListing.get(item.listing.id)?.[0]}
            />
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full rounded-2xl border border-line bg-white p-8 text-center">
            <p className="text-ink">Nothing saved yet.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Tap the heart on any place to add it here.
            </p>
            <Link
              href="/explore"
              className="mt-4 inline-flex rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink"
            >
              Start exploring
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
