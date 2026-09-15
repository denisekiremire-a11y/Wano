import Link from "next/link";
import { searchListings } from "@/lib/data/journeys";
import { formatListingPrice } from "@/lib/currency";
import { listingTypeLabels } from "@/lib/listing-type";

export const metadata = {
  title: "Wano Verified — trusted places, real member deals",
  description:
    "Every business on Wano is checked before it's listed. Sign up free to unlock member offers at restaurants, stays, salons and experiences.",
};

/** Real listings with a live offer attached — the same underlying data as
 * /explore, filtered to "has a discount/freebie worth showing", sorted by
 * view_count as a trending proxy. No separate "verified" flag exists in the
 * schema: accreditationStatus === "trusted" (searchListings' own filter) IS
 * what "verified" means here. */
export default async function VerifiedPage() {
  const results = await searchListings();
  const withDeals = results
    .filter((r) => r.offer && (r.offer.discountText || r.offer.freebieText))
    .sort((a, b) => b.listing.viewCount - a.listing.viewCount);

  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-4xl px-4 pt-14 md:px-6">
        <p className="eyebrow text-ember">Wano Verified</p>
        <h1 className="font-editorial mt-3 max-w-2xl text-4xl font-bold leading-[0.95] text-ink md:text-5xl">
          Trusted places. Real member deals.
        </h1>
        <p className="mt-4 max-w-xl text-ink/70">
          Every business on Wano is checked before it&apos;s listed. Sign up free to unlock member
          offers at restaurants, stays, salons and experiences.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl bg-ember p-6 text-ink">
            <p className="eyebrow opacity-70">Member deals</p>
            <p className="font-editorial mt-2 text-2xl font-bold leading-tight">
              More Kampala. Less on the bill.
            </p>
            <p className="mt-2 text-sm opacity-80">
              One free account. Instant offers. No booking fees on member deals.
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Unlock member deals
            </Link>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6">
            <p className="eyebrow text-ember">How verification works</p>
            <ol className="mt-3 space-y-3 text-sm text-ink/75">
              {[
                "We confirm the business is real and operating.",
                "We check prices are fair and transparent.",
                "We verify you can book directly — no middlemen.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="eyebrow shrink-0 text-ember">{String(i + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 md:px-6">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-ember">Trending now</p>
          <p className="eyebrow text-ink/40">{withDeals.length} listed</p>
        </div>
        <h2 className="font-editorial mt-2 text-2xl font-bold text-ink">Verified places</h2>

        {withDeals.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-line bg-white p-6 text-center text-sm text-ink/60">
            No member deals live right now — check back soon.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {withDeals.map(({ listing, vendor, offer }) => {
              const price = formatListingPrice(listing);
              const badge = offer?.discountText ?? offer?.freebieText ?? null;
              return (
                <Link
                  key={listing.id}
                  href={`/explore/${listing.id}`}
                  className="flex items-center justify-between gap-4 p-5 transition hover:bg-paper"
                >
                  <div className="min-w-0">
                    <h3 className="font-editorial text-lg font-bold text-ink">{listing.title}</h3>
                    <p className="eyebrow mt-1 text-ink/45">
                      {listingTypeLabels[listing.type]} · {vendor.location}
                      {price ? ` · ${price}` : ""}
                    </p>
                  </div>
                  {badge && (
                    <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
