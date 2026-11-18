import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ExternalLink, ShoppingBag } from "lucide-react";
import { primaryBuyLink } from "@/lib/links";
import { CopyButton, PrintButton } from "@/components/registry/CopyButton";
import { GiftImage } from "@/components/registry/GiftImage";
import { PriceBlock } from "@/components/registry/PriceBlock";
import { WhereToBuyPanel } from "@/components/registry/WhereToBuyPanel";
import { CurrencyNote, PriceNotice } from "@/components/site/Notices";
import { getGuestPledges, getPublicReservation } from "@/lib/data";
import { readGuestKey } from "@/lib/guest-key";
import { formatDateTime } from "@/lib/format";
import { getRegistry } from "@/lib/registry-cache";

export const metadata: Metadata = { title: "Your reservation", robots: { index: false, follow: false } };

type Props = { params: Promise<{ reference: string }>; searchParams: Promise<{ new?: string }> };

const STATUS_TEXT = {
  active: "Reserved — waiting for you to buy it",
  purchased: "Purchased — thank you!",
  cancelled: "Cancelled by the family",
  released: "Released by the family",
  expired: "Expired",
} as const;

export default async function ReservationPage({ params, searchParams }: Props) {
  const [{ reference }, sp] = await Promise.all([params, searchParams]);
  const ref = decodeURIComponent(reference).trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,40}$/.test(ref)) notFound();

  const [reservation, data, guestKey] = await Promise.all([getPublicReservation(ref), getRegistry(), readGuestKey()]);
  if (!reservation) notFound();
  const myPledges = guestKey ? (await getGuestPledges(guestKey)).filter((p) => p.status === "active" || p.status === "purchased") : [];
  const isMine = myPledges.some((p) => p.reference === reservation.reference);
  const gift = data.gifts.find((g) => g.id === reservation.gift_id);
  const isNew = sp.new === "1";
  const buy = gift ? primaryBuyLink(gift, data.giftRetailers, data.retailers) : null;
  const live = reservation.status === "active" || reservation.status === "purchased";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-testid="reservation-page">
      {isNew && live && (
        <div className="mb-8 flex gap-3 rounded-3xl border border-sage-200 bg-sage-50 p-5 text-sage-800" role="status">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-2xl">Thank you, {reservation.guest_first_name}! This gift is now reserved for you.</p>
            <p className="mt-1 text-sm">Everyone else will now see it as reserved, so nobody buys the same thing.</p>
          </div>
        </div>
      )}

      {isMine && (
        <Link
          href="/my-gifts"
          className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-linen bg-white p-4 text-sm hover:border-sand print:hidden"
          data-testid="my-gifts-banner"
        >
          <span>
            You’ve pledged <strong>{myPledges.length}</strong> {myPledges.length === 1 ? "gift" : "gifts"} so far. See them all, any time, in{" "}
            <strong>My gifts</strong>.
          </span>
          <span className="btn-secondary shrink-0 px-3.5 py-1.5 text-xs">My gifts →</span>
        </Link>
      )}

      <p className="eyebrow">Reservation confirmation</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">{reservation.gift_name}</h1>

      <div className="card mt-6 overflow-hidden">
        <div className="grid gap-0 sm:grid-cols-[200px_1fr]">
          {gift && (
            <div className="relative aspect-[16/10] sm:aspect-auto">
              <GiftImage gift={gift} sizes="200px" />
            </div>
          )}
          <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-3 p-5 text-sm sm:p-6">
            <dt className="text-muted">Reference</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-semibold tracking-wider text-ink" data-testid="reservation-reference">
                {reservation.reference}
              </span>
              <CopyButton text={reservation.reference} />
            </dd>
            <dt className="text-muted">Status</dt>
            <dd data-testid="reservation-status" data-status={reservation.status}>
              {STATUS_TEXT[reservation.status]}
            </dd>
            <dt className="text-muted">Reserved</dt>
            <dd>{formatDateTime(reservation.created_at)}</dd>
            <dt className="text-muted">Price</dt>
            <dd>
              {gift ? (
                <PriceBlock gift={gift} rate={data.settings.aed_to_ugx_rate} />
              ) : reservation.price_aed !== null ? (
                `AED ${reservation.price_aed}`
              ) : (
                "—"
              )}
            </dd>
          </dl>
        </div>
      </div>

      {reservation.status === "active" && (
        <div className="mt-6 flex gap-3 rounded-2xl bg-blush/70 p-5 text-clay-dark" data-testid="purchase-reminder">
          <ShoppingBag className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-sm">
            <strong className="font-semibold">Please remember to buy this gift.</strong> Reserving holds it for you on the list, but the
            purchase is up to you — use the shopping links below or any shop you like. Keep your reference in case you need to contact the
            family.
          </p>
        </div>
      )}
      {reservation.status === "active" && buy && (
        <a href={buy.href} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 w-full py-3 text-[15px] sm:w-auto sm:px-8" data-testid="buy-link">
          <ExternalLink className="size-4" aria-hidden /> Buy it now at {buy.retailer}
        </a>
      )}

      <div className="mt-6 space-y-2">
        <PriceNotice settings={data.settings} compact />
        <CurrencyNote />
      </div>

      {gift && (
        <section className="mt-10" aria-labelledby="wtb">
          <h2 id="wtb" className="mb-4 text-3xl">
            Where to buy
          </h2>
          <WhereToBuyPanel gift={gift} giftRetailers={data.giftRetailers} retailers={data.retailers} locations={data.locations} />
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-3 print:hidden">
        <PrintButton />
        <Link href="/registry" className="btn-ghost">
          Back to the wishlist
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted">
        You can always find this reservation again under <Link href="/my-gifts" className="underline">My gifts</Link> on this device, or by
        bookmarking this page.
      </p>
    </main>
  );
}
