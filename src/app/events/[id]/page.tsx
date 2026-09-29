import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingItemCard } from "@/components/listing-item-card";
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
    <main className="font-editorial-body bg-paper">
      <section className="relative overflow-hidden bg-ink py-16 text-white">
        <div className="relative mx-auto max-w-3xl px-4 md:px-6">
          <Link href="/events" className="eyebrow text-white/70 hover:text-white">
            ← All events
          </Link>
          <p className="eyebrow mt-4 text-ember">{event.category}</p>
          <h1 className="font-serif-editorial mt-3 text-4xl md:text-6xl">{event.title}</h1>
          <p className="mt-3 text-lg text-white/85">
            {formatEventWhen(new Date(event.startAt), event.endAt ? new Date(event.endAt) : null)}
          </p>
          <p className="text-white/70">{event.location}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        {isReviewMode && reviewDraft && reviewTotals ? (
          <div className="max-w-md">
            <Link href={`/events/${event.id}`} className="eyebrow text-ink/40 hover:text-ink">
              ← Edit booking
            </Link>
            <h2 className="font-serif-editorial mt-3 text-2xl text-ink">Your booking</h2>
            <div className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
              <p className="font-serif-editorial text-xl text-ink">{event.title}</p>
              <p className="text-ink/60">{formatEventWhen(new Date(event.startAt), event.endAt ? new Date(event.endAt) : null)}</p>
              {reviewDraft.partySize != null && (
                <p className="text-ink/60">
                  {reviewDraft.partySize} {reviewDraft.partySize === 1 ? "guest" : "guests"}
                  {reviewDraft.childrenCount ? ` + ${reviewDraft.childrenCount} children` : ""}
                </p>
              )}
              {reviewDraft.notes && <p className="text-ink/50">“{reviewDraft.notes}”</p>}

              {reviewTotals.lineItems.length > 0 && (
                <div className="border-t border-ink/10 pt-2">
                  {reviewTotals.lineItems.map((li, i) => (
                    <p key={i} className="font-mono-data mt-1 flex justify-between text-ink/60">
                      <span>
                        {li.quantity} × {li.item?.name ?? "Ticket"}
                      </span>
                      {li.item?.priceMinor != null && <span>{formatMinor(li.item.priceMinor * li.quantity)}</span>}
                    </p>
                  ))}
                </div>
              )}

              {reviewTotals.subtotalMinor > 0 && (
                <div className="font-mono-data space-y-1 border-t border-ink/10 pt-2">
                  <p className="flex justify-between text-ink/60">
                    <span>Subtotal</span>
                    <span>{formatMinor(reviewTotals.subtotalMinor)}</span>
                  </p>
                  {reviewTotals.discountMinor > 0 && reviewAppliedReward && (
                    <p className="flex justify-between text-ember">
                      <span>{reviewAppliedReward.reward.title}</span>
                      <span>-{formatMinor(reviewTotals.discountMinor)}</span>
                    </p>
                  )}
                  <p className="flex justify-between text-base font-semibold text-ink">
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
                className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
              >
                Book →
              </button>
            </form>
          </div>
        ) : (
          <>
            <p className="max-w-2xl text-ink/60">{event.description}</p>
            {organizer && <p className="mt-2 text-sm text-ink/50">Hosted by {organizer.businessName}</p>}
            {!isMatchDay && <p className="font-mono-data mt-2 font-medium text-ember">{event.priceHint ?? "Free to attend"}</p>}
            {isOrganizer && (
              <Link
                href={`/vendor/dashboard/events/${event.id}/items`}
                className="mt-2 inline-block text-sm font-medium text-ember hover:underline"
              >
                Manage tickets →
              </Link>
            )}

            {!isMatchDay && ticketItems.length > 0 && (
              <div className="mt-8">
                <h2 className="font-serif-editorial text-2xl text-ink">Tickets</h2>
                {selectedTicket ? (
                  <div className="mt-4 overflow-hidden border border-ink/10">
                    {(ticketImageIds.get(selectedTicket.id) ?? []).length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/listing-item-images/${ticketImageIds.get(selectedTicket.id)![0]}`}
                        alt={selectedTicket.name}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="eyebrow flex h-32 items-center justify-center bg-ink/5 text-ink/30">Ticket</div>
                    )}
                    <div className="p-4">
                      <p className="font-serif-editorial text-xl text-ink">{selectedTicket.name}</p>
                      {selectedTicket.description && (
                        <p className="mt-1 text-sm text-ink/60">{selectedTicket.description}</p>
                      )}
                      {selectedTicket.priceMinor != null && (
                        <p className="font-mono-data mt-2 text-lg font-semibold text-ember">
                          {formatMinor(selectedTicket.priceMinor)}
                          {selectedTicket.priceUnit ?? ""}
                        </p>
                      )}
                      <Link href={`/events/${event.id}`} className="mt-3 inline-block text-sm text-ink/50 hover:underline">
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
                  <div className="border border-ink/10 bg-white p-5">
                    <p className="font-mono-data text-sm text-ink/60">
                      {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} left · {event.priceHint}
                    </p>
                    <Link
                      href={`/login?next=/events/${event.id}`}
                      className="mt-3 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
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
                    <div className="border border-ink/10 bg-white p-4">
                      <p className="text-sm font-medium text-ink">
                        You&apos;re booked — ref {myEventBooking.bookingRef}
                      </p>
                      <Link href={`/bookings/${myEventBooking.bookingRef}`} className="mt-1 inline-block text-sm text-ember hover:underline">
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
                    className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Log in to book
                  </Link>
                )}
              </div>
            )}

            <div className="mt-10 border-t border-ink/10 pt-6">
              <h2 className="font-serif-editorial text-2xl text-ink">Who&apos;s going?</h2>
              <p className="mt-2 flex items-center gap-2 text-ink/50">
                <span className="live-dot text-ember" />
                <span className="font-mono-data text-[11px] uppercase tracking-[0.15em]">
                  {goingCount} {goingCount === 1 ? "person" : "people"} going
                </span>
              </p>
              {followedGoing.length > 0 && (
                <p className="mt-2 text-sm font-medium text-ink">
                  {followedGoing.length} people you follow are going
                </p>
              )}
              {bookers.length > 0 && (
                <p className="mt-3 text-sm text-ink/50">
                  {bookers.slice(0, 20).map((a) => a.displayName).join(" · ")}
                </p>
              )}
            </div>

            <TargetRewardsSection claimable={claimableRewards} claimed={myClaimedRewards} />

            <section className="mt-10 border-t border-ink/10 pt-6">
              <h2 className="font-serif-editorial text-2xl text-ink">What people are saying</h2>
              <p className="mt-1 text-sm text-ink/50">Posts and moments shared by attendees.</p>
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
                  <p className="col-span-full border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
                    No media yet.
                  </p>
                ) : (
                  media.map(({ post, authorName, authorUsername }) => (
                    <div key={post.id} className="overflow-hidden border border-ink/10 bg-white">
                      {post.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.imageUrl} alt="" className="h-40 w-full object-cover" />
                      )}
                      <div className="p-3">
                        <p className="text-sm text-ink/80">{post.content}</p>
                        <p className="mt-1 text-xs text-ink/40">
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
