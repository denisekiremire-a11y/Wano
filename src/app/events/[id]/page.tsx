import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarIcon } from "@/components/icons";
import { ListingItemCard } from "@/components/listing-item-card";
import { ListingTypeIcon } from "@/components/listing-type-icon";
import { EventTicketForm } from "@/components/booking/event-ticket-form";
import { PostComposer } from "@/components/post-composer";
import {
  getEventBookers,
  getEventBookingCounts,
  getEventById,
  getFollowedEventBookers,
  getMyEventBooking,
} from "@/lib/data/events";
import { getEventItems, getListingItemImageIds } from "@/lib/data/listing-items";
import { withRlsContext } from "@/lib/db-context";
import { getClaimableRewardsForTarget, getMyClaimedRewardsForTarget } from "@/lib/data/rewards";
import { getMediaPostsFor } from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { getMyXpBookingsForMatch, getSeatsRemainingForMatch } from "@/lib/data/xp";
import { confirmXpPayment } from "@/lib/actions/xp-actions";
import { computeBookingTotals, decodeBookingDraft } from "@/lib/booking-shared";
import { buyEventTicketsAction } from "@/lib/actions/booking-actions";
import { formatMinor } from "@/lib/currency";
import { getSession } from "@/lib/session";
import { MATCH_DAY_CATEGORY } from "@/lib/xp-config";
import { TargetRewardsSection } from "@/components/target-rewards-section";
import { XpBookingPanel } from "@/components/xp-booking-panel";

function formatEventWhen(startAt: Date, endAt: Date | null) {
  const start = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(startAt);
  if (!endAt) return start;
  const end = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(endAt);
  return `${start} – ${end}`;
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const { item: itemParam, tab: tabParam, xpTxRef, status: flwStatus, transaction_id: flwTransactionId } = rawSearchParams;
  const isReviewMode = tabParam === "review";
  const row = await getEventById(id);
  if (!row) notFound();
  const { event, organizer } = row;

  const session = await getSession();

  let followedGoing: { name: string }[] = [];
  let claimableRewards: Awaited<ReturnType<typeof getClaimableRewardsForTarget>> = [];
  let myClaimedRewards: Awaited<ReturnType<typeof getMyClaimedRewardsForTarget>> = [];
  let myXpBookings: Awaited<ReturnType<typeof getMyXpBookingsForMatch>> = [];
  let myEventBooking: Awaited<ReturnType<typeof getMyEventBooking>> = null;
  let travellerDisplayName = "";
  let isOrganizer = false;
  const isMatchDay = event.category === MATCH_DAY_CATEGORY;
  let xpPaymentJustConfirmed = false;
  const xpPaymentFailed = isMatchDay && Boolean(xpTxRef) && flwStatus != null && flwStatus !== "successful";
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      // The checkout redirect back from Flutterwave — one of two
      // independent confirmation paths alongside the webhook (see
      // /api/webhooks/flutterwave); confirmXpPayment is idempotent, so
      // this is a safe no-op if the webhook already confirmed it, or if
      // the traveller refreshes this page.
      if (isMatchDay && xpTxRef && flwStatus === "successful" && flwTransactionId) {
        await confirmXpPayment(xpTxRef, flwTransactionId);
        xpPaymentJustConfirmed = true;
      }

      const [followed, claimable, myClaimed, xpBookings, existingBooking] = await Promise.all([
        getFollowedEventBookers(event.id, travellerProfile.id),
        withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, (tx) =>
          getClaimableRewardsForTarget("event", event.id, tx),
        ),
        withRlsContext({ userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id }, (tx) =>
          getMyClaimedRewardsForTarget(travellerProfile.id, "event", event.id, tx),
        ),
        isMatchDay ? getMyXpBookingsForMatch(travellerProfile.id, event.id) : Promise.resolve([]),
        isMatchDay ? Promise.resolve(null) : getMyEventBooking(event.id, travellerProfile.id),
      ]);
      followedGoing = followed;
      claimableRewards = claimable;
      myClaimedRewards = myClaimed;
      myXpBookings = xpBookings;
      myEventBooking = existingBooking;
      travellerDisplayName = travellerProfile.displayName;
    }
  } else if (session?.role === "vendor" && event.organizerVendorProfileId) {
    const vendorProfile = await getVendorProfileByUserId(session.userId);
    isOrganizer = vendorProfile?.id === event.organizerVendorProfileId;
  }

  const ticketItems = !isMatchDay ? await getEventItems(event.id) : [];
  const ticketImageIds = await getListingItemImageIds(ticketItems.map((i) => i.id));
  const selectedTicket = itemParam ? ticketItems.find((i) => i.id === itemParam) : undefined;

  const reviewDraft = isReviewMode ? decodeBookingDraft(rawSearchParams) : null;
  const reviewAppliedReward = reviewDraft?.userRewardId
    ? myClaimedRewards.find((r) => r.userReward.id === reviewDraft.userRewardId)
    : undefined;
  const reviewTotals = reviewDraft
    ? computeBookingTotals(
        reviewDraft,
        ticketItems,
        null,
        reviewAppliedReward
          ? { discountType: reviewAppliedReward.reward.discountType, discountValue: reviewAppliedReward.reward.discountValue }
          : null,
      )
    : null;
  const seatsRemaining = isMatchDay ? await getSeatsRemainingForMatch(event.id) : 0;

  const [bookingCounts, bookers, media] = await Promise.all([
    getEventBookingCounts([event.id]),
    getEventBookers(event.id),
    getMediaPostsFor({ eventId: event.id }),
  ]);
  const goingCount = bookingCounts.get(event.id) ?? 0;

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-nile-900 via-forest-800 to-marigold-600 py-16 text-white">
        <div className="relative mx-auto max-w-3xl px-4 md:px-6">
          <Link href="/events" className="text-sm text-white/80 hover:underline">
            ← All events
          </Link>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium capitalize">
            <CalendarIcon className="h-3.5 w-3.5" />
            {event.category}
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-5xl">{event.title}</h1>
          <p className="mt-2 text-white/90">{formatEventWhen(new Date(event.startAt), event.endAt ? new Date(event.endAt) : null)}</p>
          <p className="text-white/80">{event.location}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        {isReviewMode && reviewDraft && reviewTotals ? (
          <div className="max-w-md">
            <Link href={`/events/${event.id}`} className="text-sm text-forest-800/60 hover:underline">
              ← Edit booking
            </Link>
            <h2 className="mt-3 font-display text-xl font-semibold text-forest-900">Your booking</h2>
            <div className="mt-3 space-y-2 rounded-2xl border border-forest-900/10 bg-white p-4 text-sm">
              <p className="font-display text-lg font-semibold text-forest-900">{event.title}</p>
              <p className="text-forest-800/80">{formatEventWhen(new Date(event.startAt), event.endAt ? new Date(event.endAt) : null)}</p>
              {reviewDraft.partySize != null && (
                <p className="text-forest-800/80">
                  {reviewDraft.partySize} {reviewDraft.partySize === 1 ? "guest" : "guests"}
                  {reviewDraft.childrenCount ? ` + ${reviewDraft.childrenCount} children` : ""}
                </p>
              )}
              {reviewDraft.notes && <p className="text-forest-800/60">“{reviewDraft.notes}”</p>}

              {reviewTotals.lineItems.length > 0 && (
                <div className="border-t border-forest-900/10 pt-2">
                  {reviewTotals.lineItems.map((li, i) => (
                    <p key={i} className="mt-1 flex justify-between text-forest-800/80">
                      <span>
                        {li.quantity} × {li.item?.name ?? "Ticket"}
                      </span>
                      {li.item?.priceMinor != null && <span>{formatMinor(li.item.priceMinor * li.quantity)}</span>}
                    </p>
                  ))}
                </div>
              )}

              {reviewTotals.subtotalMinor > 0 && (
                <div className="space-y-1 border-t border-forest-900/10 pt-2">
                  <p className="flex justify-between text-forest-800/80">
                    <span>Subtotal</span>
                    <span>{formatMinor(reviewTotals.subtotalMinor)}</span>
                  </p>
                  {reviewTotals.discountMinor > 0 && reviewAppliedReward && (
                    <p className="flex justify-between text-nile-700">
                      <span>{reviewAppliedReward.reward.title}</span>
                      <span>-{formatMinor(reviewTotals.discountMinor)}</span>
                    </p>
                  )}
                  <p className="flex justify-between text-base font-semibold text-forest-900">
                    <span>Total</span>
                    <span>{formatMinor(reviewTotals.totalMinor)}</span>
                  </p>
                </div>
              )}
            </div>

            <form action={buyEventTicketsAction} className="mt-4">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="bookingName" value={reviewDraft.bookingName ?? travellerDisplayName} />
              {reviewDraft.partySize != null && <input type="hidden" name="partySize" value={reviewDraft.partySize} />}
              {reviewDraft.childrenCount != null && (
                <input type="hidden" name="childrenCount" value={reviewDraft.childrenCount} />
              )}
              {reviewDraft.notes && <input type="hidden" name="notes" value={reviewDraft.notes} />}
              {reviewDraft.userRewardId && <input type="hidden" name="userRewardId" value={reviewDraft.userRewardId} />}
              {reviewDraft.items.length > 0 && (
                <input
                  type="hidden"
                  name="items"
                  value={reviewDraft.items.map((i) => `${i.itemId}:${i.quantity}`).join(",")}
                />
              )}
              <button
                type="submit"
                className="w-full rounded-full bg-forest-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-forest-700"
              >
                Book →
              </button>
            </form>
          </div>
        ) : (
          <>
            <p className="max-w-2xl text-forest-800/80">{event.description}</p>
            {organizer && <p className="mt-2 text-sm text-forest-800/60">Hosted by {organizer.businessName}</p>}
            {!isMatchDay && <p className="mt-2 font-medium text-nile-700">{event.priceHint ?? "Free to attend"}</p>}
            {isOrganizer && (
              <Link
                href={`/vendor/dashboard/events/${event.id}/items`}
                className="mt-2 inline-block text-sm font-medium text-nile-700 hover:underline"
              >
                Manage tickets →
              </Link>
            )}

            {!isMatchDay && ticketItems.length > 0 && (
              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-forest-900">Tickets</h2>
                {selectedTicket ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-forest-900/10 bg-white">
                    {(ticketImageIds.get(selectedTicket.id) ?? []).length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/listing-item-images/${ticketImageIds.get(selectedTicket.id)![0]}`}
                        alt={selectedTicket.name}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-nile-900 via-marigold-600 to-marigold-300">
                        <ListingTypeIcon type="event" className="h-8 w-8 text-white/70" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="font-display text-lg font-semibold text-forest-900">{selectedTicket.name}</p>
                      {selectedTicket.description && (
                        <p className="mt-1 text-sm text-forest-800/70">{selectedTicket.description}</p>
                      )}
                      {selectedTicket.priceMinor != null && (
                        <p className="mt-2 text-lg font-semibold text-ember">
                          {formatMinor(selectedTicket.priceMinor)}
                          {selectedTicket.priceUnit ?? ""}
                        </p>
                      )}
                      <Link href={`/events/${event.id}`} className="mt-3 inline-block text-sm text-forest-800/60 hover:underline">
                        ← Back to tickets
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {ticketItems.map((item) => (
                      <ListingItemCard
                        key={item.id}
                        item={item}
                        listingType="event"
                        coverImageId={ticketImageIds.get(item.id)?.[0]}
                        href={`/events/${event.id}?item=${item.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {isMatchDay ? (
              <div className="mt-6">
                {session?.role === "traveller" ? (
                  <XpBookingPanel
                    matchId={event.id}
                    matchStartAt={event.startAt.toISOString()}
                    seatsRemaining={seatsRemaining}
                    myBookings={myXpBookings}
                    paymentJustConfirmed={xpPaymentJustConfirmed}
                    paymentFailed={xpPaymentFailed}
                  />
                ) : (
                  <div className="rounded-2xl border border-forest-900/10 bg-white p-5">
                    <p className="text-sm text-forest-800/70">
                      {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} left · {event.priceHint}
                    </p>
                    <Link
                      href={`/login?next=/events/${event.id}`}
                      className="mt-3 inline-flex rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Log in to book
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6">
                {session?.role === "traveller" ? (
                  myEventBooking ? (
                    <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
                      <p className="text-sm font-medium text-forest-900">
                        You&apos;re booked — ref {myEventBooking.bookingRef}
                      </p>
                      <Link href={`/bookings/${myEventBooking.bookingRef}`} className="mt-1 inline-block text-sm text-nile-700 hover:underline">
                        View your booking →
                      </Link>
                    </div>
                  ) : (
                    <EventTicketForm
                      eventId={event.id}
                      items={ticketItems}
                      itemImageIds={ticketImageIds}
                      preselectedItemId={itemParam}
                      travellerDisplayName={travellerDisplayName}
                      myClaimedRewards={myClaimedRewards}
                    />
                  )
                ) : (
                  <Link
                    href={`/login?next=/events/${event.id}`}
                    className="inline-flex rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Log in to book
                  </Link>
                )}
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-5">
              <h2 className="font-display text-lg font-semibold text-forest-900">Who&apos;s going?</h2>
              <p className="mt-1 text-sm text-forest-800/60">
                {goingCount} {goingCount === 1 ? "person" : "people"} going
              </p>
              {followedGoing.length > 0 && (
                <p className="mt-2 text-sm font-medium text-forest-800">
                  {followedGoing.length} people you follow are going
                </p>
              )}
              {bookers.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {bookers.slice(0, 20).map((a, i) => (
                    <li key={i} className="rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-800">
                      {a.displayName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <TargetRewardsSection claimable={claimableRewards} claimed={myClaimedRewards} />

            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold text-forest-900">What people are saying</h2>
              <p className="mt-1 text-sm text-forest-800/60">Posts and moments shared by attendees.</p>
              {session?.role === "traveller" && (
                <div className="mt-3">
                  <PostComposer
                    presetContext={{ type: "event", id: event.id, label: event.title }}
                    placeholder={`Share something about ${event.title}…`}
                  />
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {media.length === 0 ? (
                  <p className="col-span-full rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
                    No media yet.
                  </p>
                ) : (
                  media.map(({ post, authorName, authorUsername }) => (
                    <div key={post.id} className="overflow-hidden rounded-xl border border-forest-900/10 bg-white">
                      {post.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.imageUrl} alt="" className="h-40 w-full object-cover" />
                      )}
                      <div className="p-3">
                        <p className="text-sm text-forest-800/90">{post.content}</p>
                        <p className="mt-1 text-xs text-forest-800/50">
                          {authorName}
                          {authorUsername ? ` · @${authorUsername}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
