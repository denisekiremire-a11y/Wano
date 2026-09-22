"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { DiscoverListingCard } from "@/components/discover/discover-listing-card";
import { DiscoverPersonCard } from "@/components/discover/discover-person-card";
import type { MapPin } from "@/components/discover/discover-map";
import type { Coordinates } from "@/lib/afcon/anchors";
import { sortByAnchor } from "@/lib/afcon/distance";
import type { TrendingListing } from "@/lib/data/discover";
import { journeyTheme } from "@/lib/journey-theme";
import type { journalPosts, journeys } from "@/db/schema";

const DiscoverMap = dynamic(() => import("@/components/discover/discover-map").then((m) => m.DiscoverMap), {
  ssr: false,
});

type Journey = typeof journeys.$inferSelect;
type JournalPost = typeof journalPosts.$inferSelect;
type Person = {
  traveller: { id: string; displayName: string; city: string | null };
  user: { username: string | null; avatarUrl: string | null };
  following: boolean;
};

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "nearby", label: "Nearby" },
  { key: "people", label: "People" },
  { key: "guides", label: "Guides" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function DiscoverTabs({
  listings,
  listingImages,
  savedListingIds,
  journeys: trendingJourneys,
  people,
  journalPosts: guides,
  mapboxToken,
  canSaveListings,
  canFollow,
}: {
  listings: TrendingListing[];
  listingImages: Map<string, string[]>;
  savedListingIds: Set<string>;
  journeys: Journey[];
  people: Person[];
  journalPosts: JournalPost[];
  mapboxToken: string | null;
  canSaveListings: boolean;
  canFollow: boolean;
}) {
  const [tab, setTab] = useState<Tab>("trending");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Your browser doesn't support location.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Couldn't get your location — check your browser's location permission.");
        setGeoLoading(false);
      },
    );
  }

  const nearbyListings = useMemo(
    () =>
      sortByAnchor(coords, listings, (item) =>
        item.latitude != null && item.longitude != null
          ? { latitude: item.latitude, longitude: item.longitude }
          : null,
      ),
    [coords, listings],
  );

  const activeListings = tab === "nearby" ? nearbyListings : listings;
  const pins: MapPin[] = activeListings
    .filter((item): item is TrendingListing & { latitude: number; longitude: number } => item.latitude != null && item.longitude != null)
    .map((item) => ({ id: item.listing.id, lat: item.latitude, lng: item.longitude, label: item.listing.title }));

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "border-forest-800 bg-forest-800 text-white"
                : "border-forest-900/15 text-forest-800 hover:bg-forest-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "trending" || tab === "nearby") && mapboxToken && pins.length > 0 && (
        <div className="mt-4">
          <DiscoverMap pins={pins} token={mapboxToken} />
        </div>
      )}

      {tab === "trending" && (
        <div className="mt-4 space-y-6">
          {trendingJourneys.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-forest-800/60">
                Featured journeys
              </h2>
              <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
                {trendingJourneys.map((journey) => {
                  const theme = journeyTheme(journey.slug);
                  return (
                    <Link
                      key={journey.id}
                      href={`/journeys/${journey.slug}`}
                      className="flex-none overflow-hidden rounded-2xl border border-forest-900/10 bg-white"
                    >
                      <div className="relative h-24 w-40" style={{ backgroundColor: theme.hero }}>
                        {theme.image && (
                          <Image src={theme.image} alt="" fill className="object-cover" sizes="160px" />
                        )}
                      </div>
                      <p className="w-40 truncate px-2.5 py-2 text-sm font-medium text-forest-900">{journey.name}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {listings.length === 0 ? (
            <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
              Nothing trending yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {listings.map((item) => (
                <DiscoverListingCard
                  key={item.listing.id}
                  item={item}
                  coverImageId={listingImages.get(item.listing.id)?.[0]}
                  saved={savedListingIds.has(item.listing.id)}
                  canSave={canSaveListings}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "nearby" && (
        <div className="mt-4">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {geoLoading ? "Finding you…" : coords ? "Update my location" : "Use my location"}
          </button>
          {geoError && <p className="mt-2 text-xs text-red-700">{geoError}</p>}
          {!coords && !geoError && (
            <p className="mt-2 text-xs text-forest-800/50">
              Share your location to sort these by distance — otherwise they&rsquo;re in the same order as Trending.
            </p>
          )}
          {nearbyListings.length === 0 ? (
            <p className="mt-4 rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
              Nothing nearby yet — check back soon.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {nearbyListings.map((item) => (
                <DiscoverListingCard
                  key={item.listing.id}
                  item={item}
                  coverImageId={listingImages.get(item.listing.id)?.[0]}
                  saved={savedListingIds.has(item.listing.id)}
                  canSave={canSaveListings}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "people" && (
        <div className="mt-4 space-y-2">
          {people.length === 0 ? (
            <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
              No one to show yet.
            </p>
          ) : (
            people.map((p) => (
              <DiscoverPersonCard
                key={p.traveller.id}
                traveller={p.traveller}
                user={p.user}
                following={p.following}
                canFollow={canFollow}
              />
            ))
          )}
        </div>
      )}

      {tab === "guides" && (
        <div className="mt-4">
          {guides.length === 0 ? (
            <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
              No guides published yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {guides.map((post) => (
                <Link
                  key={post.id}
                  href={`/journal/${post.slug}`}
                  className="overflow-hidden rounded-2xl border border-forest-900/10 bg-white"
                >
                  {post.coverImage && (
                    <div className="relative h-32 w-full">
                      <Image src={post.coverImage} alt="" fill className="object-cover" sizes="400px" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-medium text-forest-900">{post.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-forest-800/60">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
