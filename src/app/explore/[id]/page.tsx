import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingItemCard } from "@/components/listing-item-card";
import { ImageLightbox } from "@/components/image-lightbox";
import { PostComposer } from "@/components/post-composer";
import { RatingBadge } from "@/components/rating-badge";
import { SaveButton } from "@/components/save-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { GettingThere, type TransportOption } from "@/components/afcon/getting-there";
import { getBirthdayPerksForListing } from "@/lib/data/birthday";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/booking-config";
import { formatListingPrice, formatMinor } from "@/lib/currency";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
import {
  getInterestedTravellers,
  getJourneysFeaturingListing,
  getListingById,
  getListingTypeDetails,
  searchListings,
} from "@/lib/data/journeys";
import { getListingImageIdsFor } from "@/lib/data/listing-images";
import { getListingItemImageIds, getListingItems } from "@/lib/data/listing-items";
import { getListingSlots } from "@/lib/data/slots";
import { getRatingSummary, getReviewsForListing } from "@/lib/data/reviews";
import { withRlsContext } from "@/lib/db-context";
import { getClaimableRewardsForTarget, getMyClaimedRewardsForTarget } from "@/lib/data/rewards";
import { BookingForm } from "@/components/booking/booking-form";
import { SlotPicker } from "@/components/booking/slot-picker";
import { bookingActionLabel, computeBookingTotals, decodeBookingDraft } from "@/lib/booking-shared";
import {
  getCommentsForPost,
  getEngagementCounts,
  getLikedPostIds,
  getMediaPostsFor,
  getPostImageIds,
  getSavedPostIds,
} from "@/lib/data/social";
import { PostCard } from "@/components/post-card";
import {
  getSavedListingsForTraveller,
  getTravellerBookings,
  getTravellerProfileByUserId,
} from "@/lib/data/traveller";
import { listingItemSectionLabel, listingTypeGradient, listingTypeLabels, type ListingType } from "@/lib/listing-type";
import { getSession } from "@/lib/session";
import { logEvent } from "@/lib/analytics";
import { bookListingFormAction } from "@/lib/actions/booking-actions";
import { TargetRewardsSection } from "@/components/target-rewards-section";

const socialLinks = [
  { key: "instagramUrl", label: "Instagram" },
  { key: "facebookUrl", label: "Facebook" },
  { key: "tiktokUrl", label: "TikTok" },
  { key: "websiteUrl", label: "Website" },
] as const;

const DETAIL_TABS = ["overview", "items", "photos", "reviews"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const { journeyId: requestedJourneyId, tab: tabParam, item: itemParam } = rawSearchParams;
  const row = await getListingById(id);
  if (!row) notFound();
  const { listing, offer, vendor, promo } = row;
  const type = listing.type as ListingType;
  const isReviewMode = tabParam === "review";
  const activeTab: DetailTab = (DETAIL_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as DetailTab)
    : "overview";
  const itemsSectionLabel = listingItemSectionLabel[type];

  function tabHref(tab: DetailTab) {
    const p = new URLSearchParams();
    if (tab !== "overview") p.set("tab", tab);
    if (requestedJourneyId) p.set("journeyId", requestedJourneyId);
    const qs = p.toString();
    return qs ? `/explore/${listing.id}?${qs}` : `/explore/${listing.id}`;
  }

  const session = await getSession();
  await logEvent("listing_viewed", {
    userId: session?.userId,
    role: session?.role,
    metadata: { listingId: listing.id, type },
  });
  let saved = false;
  let hasBirthdaySet = false;
  let travellerDisplayName = "";
  let viewerTravellerId: string | null = null;
  let myBookings: Awaited<ReturnType<typeof getTravellerBookings>> = [];
  let claimableRewards: Awaited<ReturnType<typeof getClaimableRewardsForTarget>> = [];
  let myClaimedRewards: Awaited<ReturnType<typeof getMyClaimedRewardsForTarget>> = [];
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const [savedRows, allBookings, claimable, myClaimed] = await Promise.all([
        getSavedListingsForTraveller(travellerProfile.id),
        getTravellerBookings(travellerProfile.id),
        withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, (tx) =>
          getClaimableRewardsForTarget("listing", listing.id, tx),
        ),
        withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, (tx) =>
          getMyClaimedRewardsForTarget(travellerProfile.id, "listing", listing.id, tx),
        ),
      ]);
      saved = savedRows.some((s) => s.listing.id === listing.id);
      hasBirthdaySet = travellerProfile.dateOfBirth != null;
      travellerDisplayName = travellerProfile.displayName;
      viewerTravellerId = travellerProfile.id;
      myBookings = allBookings.filter((b) => b.listing?.id === listing.id);
      claimableRewards = claimable;
      myClaimedRewards = myClaimed;
    }
  }

  const [tags, birthdayPerks, rating, reviews, interested, media, typeDetails, imageIds, transportListings, items, slots] =
    await Promise.all([
      getJourneysFeaturingListing(listing.id),
      getBirthdayPerksForListing(listing.id),
      getRatingSummary(listing.id),
      getReviewsForListing(listing.id),
      getInterestedTravellers(listing.id),
      getMediaPostsFor({ listingId: listing.id }),
      getListingTypeDetails(listing.id),
      getListingImageIdsFor(listing.id),
      AFCON_CLUB_ENABLED ? searchListings({ type: "transport" }) : Promise.resolve([]),
      getListingItems(listing.id),
      listing.bookingMode === "instant" ? getListingSlots(listing.id) : Promise.resolve([]),
    ]);
  const slotPickerElement = listing.bookingMode === "instant" ? <SlotPicker slots={slots} /> : undefined;

  const itemImageIdsMap = await getListingItemImageIds(items.map((i) => i.id));
  const itemsBySection = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.sectionLabel ?? "";
    const list = itemsBySection.get(key) ?? [];
    list.push(item);
    itemsBySection.set(key, list);
  }
  const selectedItem = itemParam ? items.find((i) => i.id === itemParam) : undefined;

  const transportOptions: TransportOption[] = transportListings
    .filter((row) => row.listing.id !== listing.id)
    .map((row) => ({
      id: row.listing.id,
      title: row.listing.title,
      priceLabel: row.listing.priceLabel,
      priceMinor: row.listing.priceMinor,
      currency: row.listing.currency,
      priceUnit: row.listing.priceUnit,
      latitude: row.listing.latitude,
      longitude: row.listing.longitude,
      vendorBusinessName: row.vendor.businessName,
      vendorContactPhone: row.vendor.contactPhone,
    }));

  const mediaPostIds = media.map((m) => m.post.id);
  const [mediaImageIdsMap, mediaEngagement, mediaLikedIds, mediaSavedIds, mediaCommentsRows] = await Promise.all([
    getPostImageIds(mediaPostIds),
    getEngagementCounts(mediaPostIds),
    viewerTravellerId ? getLikedPostIds(viewerTravellerId, mediaPostIds) : Promise.resolve(new Set<string>()),
    viewerTravellerId ? getSavedPostIds(viewerTravellerId, mediaPostIds) : Promise.resolve(new Set<string>()),
    Promise.all(mediaPostIds.map((id) => getCommentsForPost(id).then((c) => [id, c] as const))),
  ]);
  const mediaCommentsMap = new Map(mediaCommentsRows);

  const bookingJourneyId = tags.some((j) => j.id === requestedJourneyId) ? requestedJourneyId : null;

  const activeSocials = socialLinks.filter((s) => vendor[s.key]);
  const myUpcoming = myBookings.filter(
    (b) => b.booking.status === "pending" || b.booking.status === "held" || b.booking.status === "confirmed",
  );
  const myPast = myBookings.filter((b) => b.booking.status === "completed" || b.booking.status === "cancelled");

  const reviewDraft = isReviewMode ? decodeBookingDraft(rawSearchParams) : null;
  const reviewAppliedReward = reviewDraft?.userRewardId
    ? myClaimedRewards.find((r) => r.userReward.id === reviewDraft.userRewardId)
    : undefined;
  const reviewTotals = reviewDraft
    ? computeBookingTotals(
        reviewDraft,
        items,
        listing.priceMinor,
        reviewAppliedReward
          ? { discountType: reviewAppliedReward.reward.discountType, discountValue: reviewAppliedReward.reward.discountValue }
          : null,
      )
    : null;

  return (
    <main className="font-editorial-body bg-paper">
      <section className={`bg-gradient-to-br ${listingTypeGradient[type]} py-14 text-white`}>
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Link href="/explore" className="eyebrow text-white/70 hover:text-white">
            ← Explore
          </Link>
          <p className="eyebrow mt-4 text-white/70">{listingTypeLabels[type]}</p>
          <h1 className="font-serif-editorial mt-2 text-4xl md:text-5xl">{listing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-white/85">
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

      {!isReviewMode && (
        <nav className="sticky top-0 z-10 border-b border-ink/10 bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 md:px-6">
            {DETAIL_TABS.map((tab) => (
              <Link
                key={tab}
                href={tabHref(tab)}
                className={`eyebrow flex-none border-b-2 px-3 py-4 transition-colors ${
                  activeTab === tab
                    ? "border-ember text-ink"
                    : "border-transparent text-ink/40 hover:text-ink"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "items" ? itemsSectionLabel : tab === "photos" ? "Photos" : "Reviews"}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        {isReviewMode && reviewDraft && reviewTotals ? (
          <div className="max-w-md">
            <Link href={`/explore/${listing.id}#book`} className="eyebrow text-ink/40 hover:text-ink">
              ← Edit booking
            </Link>
            <h2 className="font-serif-editorial mt-3 text-2xl text-ink">Your booking</h2>
            <div className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
              <p className="font-serif-editorial text-xl text-ink">{listing.title}</p>
              {reviewDraft.visitDate && (
                <p className="text-ink/60">
                  {reviewDraft.visitDate}
                  {reviewDraft.visitTime ? ` · ${reviewDraft.visitTime}` : ""}
                  {reviewDraft.endDate ? ` → ${reviewDraft.endDate}` : ""}
                </p>
              )}
              {reviewDraft.partySize != null && (
                <p className="text-ink/60">
                  {reviewDraft.partySize} {reviewDraft.partySize === 1 ? "guest" : "guests"}
                  {reviewDraft.childrenCount ? ` + ${reviewDraft.childrenCount} children` : ""}
                </p>
              )}
              {(reviewDraft.pickupLocation || reviewDraft.dropoffLocation) && (
                <p className="text-ink/60">
                  {reviewDraft.pickupLocation} {reviewDraft.dropoffLocation ? `→ ${reviewDraft.dropoffLocation}` : ""}
                </p>
              )}
              {Object.entries(reviewDraft.details).map(([key, value]) => (
                <p key={key} className="text-ink/50">
                  {value}
                </p>
              ))}
              {reviewDraft.notes && <p className="text-ink/50">“{reviewDraft.notes}”</p>}

              {reviewTotals.lineItems.length > 0 && (
                <div className="border-t border-ink/10 pt-2">
                  <p className="eyebrow text-ink/40">Selected</p>
                  {reviewTotals.lineItems.map((li, i) => (
                    <p key={i} className="font-mono-data mt-1 flex justify-between text-ink/60">
                      <span>
                        {li.quantity} × {li.item?.name ?? "Item"}
                      </span>
                      {li.item?.priceMinor != null && <span>{formatMinor(li.item.priceMinor * li.quantity)}</span>}
                    </p>
                  ))}
                </div>
              )}

              <div className="font-mono-data space-y-1 border-t border-ink/10 pt-2">
                <p className="flex justify-between text-ink/60">
                  <span>Subtotal</span>
                  <span>{formatMinor(reviewTotals.subtotalMinor)}</span>
                </p>
                {reviewTotals.discountMinor > 0 && reviewAppliedReward && (
                  <p className="flex justify-between text-ember">
                    <span>{reviewAppliedReward.reward.title}</span>
                    <span>
                      -{formatMinor(reviewTotals.discountMinor)}
                    </span>
                  </p>
                )}
                <p className="flex justify-between text-base font-semibold text-ink">
                  <span>Total</span>
                  <span>{formatMinor(reviewTotals.totalMinor)}</span>
                </p>
              </div>
            </div>

            {listing.bookingMode === "instant" && (
              <p className="mt-4 border-l-2 border-ink/20 pl-3 text-xs text-ink/60">
                Free cancellation up to {CANCELLATION_CUTOFF_HOURS} hours before your slot. After that, this
                booking is non-refundable.
              </p>
            )}

            <form action={bookListingFormAction} className="mt-4">
              <input type="hidden" name="listingId" value={listing.id} />
              <input type="hidden" name="bookingName" value={reviewDraft.bookingName ?? travellerDisplayName} />
              {reviewDraft.visitDate && <input type="hidden" name="visitDate" value={reviewDraft.visitDate} />}
              {reviewDraft.visitTime && <input type="hidden" name="visitTime" value={reviewDraft.visitTime} />}
              {reviewDraft.endDate && <input type="hidden" name="endDate" value={reviewDraft.endDate} />}
              {reviewDraft.partySize != null && <input type="hidden" name="partySize" value={reviewDraft.partySize} />}
              {reviewDraft.childrenCount != null && (
                <input type="hidden" name="childrenCount" value={reviewDraft.childrenCount} />
              )}
              {reviewDraft.pickupLocation && <input type="hidden" name="pickupLocation" value={reviewDraft.pickupLocation} />}
              {reviewDraft.dropoffLocation && <input type="hidden" name="dropoffLocation" value={reviewDraft.dropoffLocation} />}
              {reviewDraft.notes && <input type="hidden" name="notes" value={reviewDraft.notes} />}
              {reviewDraft.userRewardId && <input type="hidden" name="userRewardId" value={reviewDraft.userRewardId} />}
              {reviewDraft.journeyId && <input type="hidden" name="journeyId" value={reviewDraft.journeyId} />}
              {reviewDraft.slotId && <input type="hidden" name="slotId" value={reviewDraft.slotId} />}
              {Object.keys(reviewDraft.details).length > 0 && (
                <input type="hidden" name="details" value={JSON.stringify(reviewDraft.details)} />
              )}
              {reviewDraft.items.length > 0 && (
                <input
                  type="hidden"
                  name="items"
                  value={reviewDraft.items.map((i) => `${i.itemId}:${i.quantity}`).join(",")}
                />
              )}
              <button
                type="submit"
                className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
              >
                {bookingActionLabel[type]} →
              </button>
            </form>
          </div>
        ) : (
          <>
        {activeTab === "overview" && (
          <>
            <div className="flex items-start justify-between gap-4">
              <p className="max-w-2xl text-ink/60">{listing.description}</p>
              {session?.role === "traveller" && <SaveButton listingId={listing.id} initialSaved={saved} />}
            </div>
            <p className="font-mono-data mt-2 font-medium text-ember">{formatListingPrice(listing)}</p>

            {imageIds.length > 0 && (
              <div className="mt-4 min-w-0">
                <div className="flex gap-2 overflow-x-auto">
                  {imageIds.slice(0, 3).map((imgId) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={imgId}
                      src={`/api/listing-images/${imgId}`}
                      alt={listing.title}
                      className="h-40 w-60 flex-none border border-ink/10 object-cover"
                    />
                  ))}
                </div>
                {imageIds.length > 3 && (
                  <Link
                    href={tabHref("photos")}
                    className="mt-2 inline-block text-sm font-medium text-ember hover:underline"
                  >
                    View all {imageIds.length} photos →
                  </Link>
                )}
              </div>
            )}

            {items.length > 0 && (
              <Link
                href={tabHref("items")}
                className="mt-4 block border border-ink/10 bg-white p-3 text-sm font-medium text-ink transition-colors hover:border-ink/25"
              >
                See {itemsSectionLabel.toLowerCase()} ({items.length}) →
              </Link>
            )}

            {tags.length > 0 && (
              <div className="mt-4">
                <p className="eyebrow text-ink/40">Featured in these journeys</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {tags.map((t) => (
                    <Link
                      key={t.id}
                      href={`/journeys/${t.slug}`}
                      className="text-sm font-medium text-ember hover:underline"
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Venue-level facts (not individually selectable/bookable —
                those live in the items tab now). */}
            {(typeDetails.hotel || typeDetails.restaurant || typeDetails.experience) && (
              <div className="mt-4 border border-ink/10 bg-white p-4">
                <h2 className="eyebrow text-ink/40">
                  {type === "hotel" ? "Amenities & hours" : type === "restaurant" ? "Cuisine & hours" : "What's included"}
                </h2>
                {typeDetails.hotel && (
                  <dl className="mt-2 space-y-1 text-sm text-ink/70">
                    {typeDetails.hotel.amenities && <p>{typeDetails.hotel.amenities}</p>}
                    {(typeDetails.hotel.checkInTime || typeDetails.hotel.checkOutTime) && (
                      <p>
                        Check-in {typeDetails.hotel.checkInTime ?? "—"} · Check-out{" "}
                        {typeDetails.hotel.checkOutTime ?? "—"}
                      </p>
                    )}
                  </dl>
                )}
                {typeDetails.restaurant && (
                  <dl className="mt-2 space-y-1 text-sm text-ink/70">
                    {typeDetails.restaurant.cuisine && <p>{typeDetails.restaurant.cuisine}</p>}
                    {typeDetails.restaurant.hours && <p>{typeDetails.restaurant.hours}</p>}
                  </dl>
                )}
                {typeDetails.experience && (
                  <dl className="mt-2 space-y-1 text-sm text-ink/70">
                    {typeDetails.experience.durationText && <p>{typeDetails.experience.durationText}</p>}
                    {typeDetails.experience.groupSizeText && <p>{typeDetails.experience.groupSizeText}</p>}
                    {typeDetails.experience.whatsIncluded && <p>{typeDetails.experience.whatsIncluded}</p>}
                  </dl>
                )}
              </div>
            )}

            <div id="book" className="mt-6 scroll-mt-20">
              {listing.externalBookingUrl ? (
                <a
                  href={listing.externalBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
                >
                  Book on {vendor.businessName} →
                </a>
              ) : session?.role === "traveller" ? (
                <BookingForm
                  listingId={listing.id}
                  journeyId={bookingJourneyId}
                  items={items}
                  itemImageIds={itemImageIdsMap}
                  listingType={type}
                  preselectedItemId={itemParam}
                  travellerDisplayName={travellerDisplayName}
                  myClaimedRewards={myClaimedRewards}
                  birthdayPerks={birthdayPerks}
                  hasBirthdaySet={hasBirthdaySet}
                  allowsPreorder={typeDetails.restaurant?.allowsPreorder ?? false}
                  slotPicker={slotPickerElement}
                />
              ) : (
                <Link
                  href={`/login?next=/explore/${listing.id}`}
                  className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Log in to book
                </Link>
              )}
            </div>

            {myBookings.length > 0 && (
              <section className="mt-10 border-t border-ink/10 pt-6">
                <h2 className="font-serif-editorial text-2xl text-ink">Your bookings here</h2>
                <div className="mt-3 border-t border-ink/10">
                  {[...myUpcoming, ...myPast].map(({ booking }) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.bookingRef}`}
                      className="flex items-center justify-between border-b border-ink/10 py-3 transition-colors hover:text-ember"
                    >
                      <p className="font-mono-data text-sm text-ink/70">ref {booking.bookingRef}</p>
                      <span className="eyebrow capitalize text-ink/40">{booking.status}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <TargetRewardsSection
              claimable={claimableRewards}
              claimed={myClaimedRewards}
              offer={offer}
              promo={promo}
            />

            <section className="mt-10 border-t border-ink/10 pt-6">
              <h2 className="font-serif-editorial text-2xl text-ink">About {vendor.businessName}</h2>
              <p className="mt-2 text-sm text-ink/60">{vendor.description}</p>
              {activeSocials.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-4">
                  {activeSocials.map((s) => (
                    <a
                      key={s.key}
                      href={vendor[s.key]!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-ember hover:underline"
                    >
                      {s.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-10 border-t border-ink/10 pt-6">
              <h2 className="font-serif-editorial text-2xl text-ink">People interested</h2>
              <p className="mt-2 flex items-center gap-2 text-ink/50">
                <span className="live-dot text-ember" />
                <span className="font-mono-data text-[11px] uppercase tracking-[0.15em]">
                  {interested.length} {interested.length === 1 ? "person has" : "people have"} saved this place
                </span>
              </p>
              {interested.length > 0 && (
                <p className="mt-3 text-sm text-ink/50">
                  {interested.slice(0, 20).map((i) => i.traveller.displayName).join(" · ")}
                </p>
              )}
            </div>

            {AFCON_CLUB_ENABLED && <GettingThere transportOptions={transportOptions} />}
          </>
        )}

        {activeTab === "items" && (
          <div>
            <h2 className="font-serif-editorial text-2xl text-ink">{itemsSectionLabel}</h2>
            {items.length === 0 ? (
              <p className="mt-4 border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
                Nothing listed here yet.
              </p>
            ) : selectedItem ? (
              <div className="mt-4">
                <Link href={tabHref("items")} className="eyebrow text-ink/40 hover:text-ink">
                  ← Back to {itemsSectionLabel.toLowerCase()}
                </Link>
                <div className="mt-3 overflow-hidden border border-ink/10 bg-white">
                  {(itemImageIdsMap.get(selectedItem.id) ?? []).length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/listing-item-images/${itemImageIdsMap.get(selectedItem.id)![0]}`}
                      alt={selectedItem.name}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="eyebrow flex h-40 items-center justify-center bg-ink/5 text-ink/30">
                      {itemsSectionLabel}
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-serif-editorial text-2xl text-ink">{selectedItem.name}</p>
                    {selectedItem.description && (
                      <p className="mt-1 text-sm text-ink/60">{selectedItem.description}</p>
                    )}
                    {(selectedItem.durationText || selectedItem.capacityText) && (
                      <p className="mt-2 text-sm text-ink/50">
                        {[selectedItem.durationText, selectedItem.capacityText].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {selectedItem.priceMinor != null && (
                      <p className="font-mono-data mt-2 text-lg font-semibold text-ember">
                        {formatMinor(selectedItem.priceMinor)}
                        {selectedItem.priceUnit ?? ""}
                      </p>
                    )}
                    <Link
                      href={`${tabHref("overview")}${tabHref("overview").includes("?") ? "&" : "?"}item=${selectedItem.id}#book`}
                      className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
                    >
                      Select →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {[...itemsBySection.entries()].map(([section, sectionItems]) => (
                  <div key={section || "_"}>
                    {section && (
                      <h3 className="eyebrow mb-2 text-ink/40">
                        {section}
                      </h3>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {sectionItems.map((item) => (
                        <ListingItemCard
                          key={item.id}
                          item={item}
                          listingType={type}
                          coverImageId={itemImageIdsMap.get(item.id)?.[0]}
                          href={`${tabHref("items")}${tabHref("items").includes("?") ? "&" : "?"}item=${item.id}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            <h2 className="font-serif-editorial text-2xl text-ink">Photos</h2>
            {imageIds.length === 0 ? (
              <p className="mt-4 border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
                No photos yet.
              </p>
            ) : (
              <div className="mt-4">
                <ImageLightbox
                  images={imageIds.map((id) => ({ id, alt: listing.title }))}
                  srcBase="/api/listing-images"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            <section>
              <h2 className="font-serif-editorial text-2xl text-ink">Reviews</h2>
              <div className="mt-3 border-t border-ink/10">
                {reviews.length === 0 ? (
                  <p className="border-b border-ink/10 py-5 text-sm text-ink/50">
                    No reviews yet.
                  </p>
                ) : (
                  reviews.map(({ review, travellerUser }) => (
                    <div key={review.id} className="border-b border-ink/10 py-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink">@{travellerUser.username}</p>
                        <span className="font-mono-data text-sm font-medium text-ember">{"★".repeat(review.rating)}</span>
                      </div>
                      {review.safetyRating != null && (
                        <div className="font-mono-data mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink/50 sm:grid-cols-4">
                          <span>Safety {review.safetyRating}★</span>
                          <span>Reliability {review.reliabilityRating}★</span>
                          <span>Value {review.valueRating}★</span>
                          <span>Communication {review.communicationRating}★</span>
                        </div>
                      )}
                      {review.comment && <p className="mt-2 text-sm text-ink/70">{review.comment}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mt-10 border-t border-ink/10 pt-6">
              <h2 className="font-serif-editorial text-2xl text-ink">What people are saying</h2>
              <p className="mt-1 text-sm text-ink/50">
                Posts and moments about this place — from travellers and from {vendor.businessName}.
              </p>
              {session?.role === "traveller" && (
                <div className="mt-3">
                  <PostComposer
                    presetContext={{ type: "listing", id: listing.id, label: listing.title }}
                    placeholder={`Share something about ${listing.title}…`}
                  />
                </div>
              )}
              <div className="mt-4 space-y-3">
                {media.length === 0 ? (
                  <p className="border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
                    Nothing posted yet.
                  </p>
                ) : (
                  media.map(({ post, authorTravellerId, authorName, authorUsername }) => (
                    <PostCard
                      key={post.id}
                      postId={post.id}
                      authorTravellerId={authorTravellerId ?? undefined}
                      authorName={authorName}
                      authorUsername={authorUsername}
                      content={post.content}
                      imageUrl={post.imageUrl}
                      imageIds={mediaImageIdsMap.get(post.id) ?? []}
                      createdAt={new Date(post.createdAt)}
                      likeCount={mediaEngagement.likeMap.get(post.id) ?? 0}
                      commentCount={mediaEngagement.commentMap.get(post.id) ?? 0}
                      liked={mediaLikedIds.has(post.id)}
                      saved={mediaSavedIds.has(post.id)}
                      canInteract={session?.role === "traveller"}
                      comments={mediaCommentsMap.get(post.id) ?? []}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
          </>
        )}
      </section>
    </main>
  );
}
