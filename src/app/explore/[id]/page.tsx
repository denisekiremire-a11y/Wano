import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingTypeIcon } from "@/components/listing-type-icon";
import { PostComposer } from "@/components/post-composer";
import { RatingBadge } from "@/components/rating-badge";
import { SaveButton } from "@/components/save-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { getBirthdayPerksForListing } from "@/lib/data/birthday";
import {
  getInterestedTravellers,
  getJourneyTagsForListing,
  getListingById,
  getListingTypeDetails,
} from "@/lib/data/journeys";
import { getRatingSummary, getReviewsForListing } from "@/lib/data/reviews";
import { getMediaPostsFor } from "@/lib/data/social";
import {
  getSavedListingsForTraveller,
  getTravellerBookings,
  getTravellerProfileByUserId,
} from "@/lib/data/traveller";
import { listingTypeGradient, listingTypeLabels, type ListingType } from "@/lib/listing-type";
import { getSession } from "@/lib/session";
import { logEvent } from "@/lib/analytics";
import { bookListingFormAction } from "@/lib/actions/booking-actions";

const socialLinks = [
  { key: "instagramUrl", label: "Instagram" },
  { key: "facebookUrl", label: "Facebook" },
  { key: "tiktokUrl", label: "TikTok" },
  { key: "websiteUrl", label: "Website" },
] as const;

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getListingById(id);
  if (!row) notFound();
  const { listing, offer, vendor, promo } = row;
  const type = listing.type as ListingType;

  const session = await getSession();
  await logEvent("listing_viewed", {
    userId: session?.userId,
    role: session?.role,
    metadata: { listingId: listing.id, type },
  });
  let saved = false;
  let hasBirthdaySet = false;
  let myBookings: Awaited<ReturnType<typeof getTravellerBookings>> = [];
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const [savedRows, allBookings] = await Promise.all([
        getSavedListingsForTraveller(travellerProfile.id),
        getTravellerBookings(travellerProfile.id),
      ]);
      saved = savedRows.some((s) => s.listing.id === listing.id);
      hasBirthdaySet = travellerProfile.dateOfBirth != null;
      myBookings = allBookings.filter((b) => b.listing.id === listing.id);
    }
  }

  const [tags, birthdayPerks, rating, reviews, interested, media, typeDetails] = await Promise.all([
    getJourneyTagsForListing(listing.id),
    getBirthdayPerksForListing(listing.id),
    getRatingSummary(listing.id),
    getReviewsForListing(listing.id),
    getInterestedTravellers(listing.id),
    getMediaPostsFor({ listingId: listing.id }),
    getListingTypeDetails(listing.id),
  ]);

  const activeSocials = socialLinks.filter((s) => vendor[s.key]);
  const myUpcoming = myBookings.filter((b) => b.booking.status === "pending" || b.booking.status === "confirmed");
  const myPast = myBookings.filter((b) => b.booking.status === "completed" || b.booking.status === "cancelled");

  return (
    <main>
      <section className={`bg-gradient-to-br ${listingTypeGradient[type]} py-14 text-white`}>
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Link href="/explore" className="text-sm text-white/80 hover:underline">
            ← Explore
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <ListingTypeIcon type={type} className="h-6 w-6 text-white/80" />
            <span className="text-sm font-medium">{listingTypeLabels[type]}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{listing.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-white/90">
              {vendor.businessName} · {vendor.location}
            </p>
            <VerifiedBadge status={vendor.accreditationStatus} className="bg-white/15 text-white" />
          </div>
          {rating.count > 0 && (
            <div className="mt-2">
              <RatingBadge average={rating.average} count={rating.count} />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-2xl text-forest-800/80">{listing.description}</p>
          {session?.role === "traveller" && <SaveButton listingId={listing.id} initialSaved={saved} />}
        </div>
        <p className="mt-2 font-medium text-nile-700">{listing.priceHint}</p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link
                key={t.id}
                href={`/journeys/${t.slug}`}
                className="rounded-full bg-marigold-50 px-2 py-0.5 text-[11px] font-medium text-marigold-800"
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}

        {offer && (
          <div className="mt-4 rounded-xl bg-forest-50 px-4 py-3">
            <p className="text-sm font-medium text-forest-900">{offer.discountText}</p>
            {offer.freebieText && <p className="text-sm text-forest-800/70">{offer.freebieText}</p>}
          </div>
        )}
        {promo && (
          <div className="mt-2 rounded-xl bg-marigold-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-marigold-700">Wano Deal</p>
            <p className="text-sm font-medium text-marigold-900">
              {promo.code} — {promo.discountText}
            </p>
          </div>
        )}

        {/* Type-specific services/menu — applies to every partner type, just
            renders whichever detail table (if any) matches this listing. */}
        {(typeDetails.hotel || typeDetails.restaurant || typeDetails.experience) && (
          <div className="mt-4 rounded-xl border border-forest-900/10 bg-white p-4">
            <h2 className="font-display text-sm font-semibold text-forest-900">
              {type === "hotel" ? "Rooms & amenities" : type === "restaurant" ? "Menu & hours" : "What's included"}
            </h2>
            {typeDetails.hotel && (
              <dl className="mt-2 space-y-1 text-sm text-forest-800/80">
                {typeDetails.hotel.roomTypes && <p>🛏️ {typeDetails.hotel.roomTypes}</p>}
                {typeDetails.hotel.amenities && <p>✨ {typeDetails.hotel.amenities}</p>}
                {(typeDetails.hotel.checkInTime || typeDetails.hotel.checkOutTime) && (
                  <p>
                    🕒 Check-in {typeDetails.hotel.checkInTime ?? "—"} · Check-out{" "}
                    {typeDetails.hotel.checkOutTime ?? "—"}
                  </p>
                )}
              </dl>
            )}
            {typeDetails.restaurant && (
              <dl className="mt-2 space-y-1 text-sm text-forest-800/80">
                {typeDetails.restaurant.cuisine && <p>🍽️ {typeDetails.restaurant.cuisine}</p>}
                {typeDetails.restaurant.priceRange && <p>💵 {typeDetails.restaurant.priceRange}</p>}
                {typeDetails.restaurant.hours && <p>🕒 {typeDetails.restaurant.hours}</p>}
              </dl>
            )}
            {typeDetails.experience && (
              <dl className="mt-2 space-y-1 text-sm text-forest-800/80">
                {typeDetails.experience.durationText && <p>⏱️ {typeDetails.experience.durationText}</p>}
                {typeDetails.experience.groupSizeText && <p>👥 {typeDetails.experience.groupSizeText}</p>}
                {typeDetails.experience.whatsIncluded && <p>✅ {typeDetails.experience.whatsIncluded}</p>}
              </dl>
            )}
          </div>
        )}

        <div className="mt-6">
          {session?.role === "traveller" ? (
            <form action={bookListingFormAction} className="space-y-2">
              <input type="hidden" name="listingId" value={listing.id} />
              {birthdayPerks.length > 0 && (
                <div className="space-y-1.5 rounded-lg bg-marigold-50 p-3">
                  <p className="text-xs font-medium text-marigold-900">
                    🎂 {birthdayPerks[0].title} — add these to redeem on your birthday:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      name="visitDate"
                      aria-label="Visit date"
                      className="flex-1 rounded-md border border-forest-900/15 px-2 py-1 text-xs outline-none focus:border-forest-600"
                    />
                    <input
                      type="number"
                      name="partySize"
                      min={1}
                      aria-label="Party size"
                      placeholder="Party size"
                      className="w-24 rounded-md border border-forest-900/15 px-2 py-1 text-xs outline-none focus:border-forest-600"
                    />
                  </div>
                  {!hasBirthdaySet && (
                    <p className="text-[11px] text-marigold-800/80">
                      <Link href="/passport?tab=account" className="underline">
                        Add your birthday to your profile
                      </Link>{" "}
                      so the venue can confirm it&apos;s really your day.
                    </p>
                  )}
                </div>
              )}
              <button
                type="submit"
                className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
              >
                Book directly
              </button>
            </form>
          ) : (
            <Link
              href={`/login?next=/explore/${listing.id}`}
              className="inline-flex rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Log in to book
            </Link>
          )}
        </div>

        {myBookings.length > 0 && (
          <section className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-forest-900">Your bookings here</h2>
            <div className="mt-3 space-y-2">
              {[...myUpcoming, ...myPast].map(({ booking }) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-xl border border-forest-900/10 p-3"
                >
                  <p className="text-sm text-forest-800/80">ref {booking.bookingRef}</p>
                  <span className="rounded-full bg-forest-100 px-2.5 py-1 text-xs font-medium capitalize text-forest-800">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">About {vendor.businessName}</h2>
          <p className="mt-2 text-sm text-forest-800/80">{vendor.description}</p>
          {activeSocials.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {activeSocials.map((s) => (
                <a
                  key={s.key}
                  href={vendor[s.key]!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-nile-700 hover:underline"
                >
                  {s.label} ↗
                </a>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">People interested</h2>
          <p className="mt-1 text-sm text-forest-800/60">
            {interested.length} {interested.length === 1 ? "person has" : "people have"} saved this place.
          </p>
          {interested.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {interested.slice(0, 20).map((i) => (
                <li
                  key={i.traveller.id}
                  className="rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-800"
                >
                  {i.traveller.displayName}
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">Reviews</h2>
          <div className="mt-3 space-y-3">
            {reviews.length === 0 ? (
              <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
                No reviews yet.
              </p>
            ) : (
              reviews.map(({ review, travellerUser }) => (
                <div key={review.id} className="rounded-xl border border-forest-900/10 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-forest-900">@{travellerUser.username}</p>
                    <span className="text-sm font-medium text-marigold-700">{"★".repeat(review.rating)}</span>
                  </div>
                  {review.safetyRating != null && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-forest-800/60 sm:grid-cols-4">
                      <span>Safety {review.safetyRating}★</span>
                      <span>Reliability {review.reliabilityRating}★</span>
                      <span>Value {review.valueRating}★</span>
                      <span>Communication {review.communicationRating}★</span>
                    </div>
                  )}
                  {review.comment && <p className="mt-2 text-sm text-forest-800/80">{review.comment}</p>}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">What people are saying</h2>
          <p className="mt-1 text-sm text-forest-800/60">Posts and moments shared by travellers about this place.</p>
          {session?.role === "traveller" && (
            <div className="mt-3">
              <PostComposer
                presetContext={{ type: "listing", id: listing.id, label: listing.title }}
                placeholder={`Share something about ${listing.title}…`}
              />
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {media.length === 0 ? (
              <p className="col-span-full rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
                No media yet.
              </p>
            ) : (
              media.map(({ post, authorUser, author }) => (
                <div key={post.id} className="overflow-hidden rounded-xl border border-forest-900/10 bg-white">
                  {post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrl} alt="" className="h-40 w-full object-cover" />
                  )}
                  <div className="p-3">
                    <p className="text-sm text-forest-800/90">{post.content}</p>
                    <p className="mt-1 text-xs text-forest-800/50">
                      {author.displayName} · @{authorUser.username}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
