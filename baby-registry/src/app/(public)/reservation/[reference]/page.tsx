import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { CopyButton, PrintButton } from "@/components/registry/CopyButton";
import { GiftImage } from "@/components/registry/GiftImage";
import { PriceBlock } from "@/components/registry/PriceBlock";
import { WhereToBuyPanel } from "@/components/registry/WhereToBuyPanel";
import { CurrencyNote, PriceNotice } from "@/components/site/Notices";
import { getPublicReservation } from "@/lib/data";
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

  const [reservation, data] = await Promise.all([getPublicReservation(ref), getRegistry()]);
  if (!reservation) notFound();
  const gift = data.gifts.find((g) => g.id === reservation.gift_id);
  const isNew = sp.new === "1";
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

      <div className="mt-6 space-y-2">
        <PriceNotice settings={data.settings} compact />
        <CurrencyNote settings={data.settings} />
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
      <p className="mt-6 text-xs text-muted">Bookmark this page — its address is your link back to this reservation.</p>
    </main>
  );
}
