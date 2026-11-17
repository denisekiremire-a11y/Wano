import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift as GiftIcon, KeyRound } from "lucide-react";
import { CopyButton } from "@/components/registry/CopyButton";
import { GiftImage } from "@/components/registry/GiftImage";
import { PriceNotice } from "@/components/site/Notices";
import { formatAED, formatUGX } from "@/lib/currency";
import { getGuestPledges } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { readGuestKey } from "@/lib/guest-key";
import { getRegistry } from "@/lib/registry-cache";
import { siteUrl } from "@/lib/site-url";
import type { ReservationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "My gifts", robots: { index: false, follow: false } };

const STATUS: Record<ReservationStatus, { label: string; cls: string }> = {
  active: { label: "Reserved — still to buy", cls: "bg-blush text-clay-dark" },
  purchased: { label: "Purchased — thank you!", cls: "bg-sage-50 text-sage-700" },
  cancelled: { label: "Cancelled by the family", cls: "bg-linen text-muted" },
  released: { label: "Released by the family", cls: "bg-linen text-muted" },
  expired: { label: "Expired", cls: "bg-linen text-muted" },
};

type Props = { searchParams: Promise<{ link?: string }> };

export default async function MyGiftsPage({ searchParams }: Props) {
  const [sp, key, data] = await Promise.all([searchParams, readGuestKey(), getRegistry()]);
  const pledges = key ? await getGuestPledges(key) : [];
  const live = pledges.filter((p) => p.status === "active" || p.status === "purchased");
  const closed = pledges.filter((p) => !(p.status === "active" || p.status === "purchased"));
  const toBuy = live.filter((p) => p.status === "active").length;
  const total = live.reduce((a, p) => a + (p.price_aed ?? 0), 0);
  const rate = data.settings.aed_to_ugx_rate;
  const personalLink = key ? `${await siteUrl()}/my-gifts/${key}` : null;
  const giftById = new Map(data.gifts.map((g) => [g.id, g]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-testid="my-gifts">
      <p className="eyebrow">My gifts</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">
        {live.length === 0 ? "You haven’t pledged any gifts yet" : `You’ve pledged ${live.length} ${live.length === 1 ? "gift" : "gifts"}`}
      </h1>

      {sp.link === "invalid" && (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          That link isn’t complete. Please open it again from your confirmation email or page.
        </p>
      )}

      {live.length > 0 && (
        <p className="mt-3 text-ink-soft" data-testid="pledge-summary">
          {toBuy > 0 ? `${toBuy} still to buy` : "All bought — thank you!"} · Estimated total {formatAED(total)}
          {rate ? ` (≈ ${formatUGX(total, rate)})` : ""}
        </p>
      )}

      {live.length === 0 && (
        <div className="card mt-6 flex flex-col items-center px-6 py-12 text-center">
          <GiftIcon className="size-8 text-sand" strokeWidth={1.25} aria-hidden />
          <p className="mt-3 max-w-md text-sm text-ink-soft">
            Gifts you reserve on this device appear here. If you reserved on another phone or computer, open your personal “My gifts”
            link from that device’s confirmation page or your confirmation email.
          </p>
          <Link href="/registry" className="btn-primary mt-5">
            Browse the wishlist
          </Link>
        </div>
      )}

      {live.length > 0 && (
        <ul className="mt-6 space-y-3" data-testid="pledge-list">
          {live.map((p) => {
            const gift = p.gift_id ? giftById.get(p.gift_id) : undefined;
            return (
              <li key={p.reference} className="card flex gap-4 p-4" data-testid="pledge" data-status={p.status}>
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
                  {gift ? <GiftImage gift={gift} sizes="80px" showKindTag={false} /> : <div className="size-full bg-cream" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl leading-tight">{p.gift_name}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {formatAED(p.price_aed)}
                    {rate && p.price_aed !== null ? ` · ≈ ${formatUGX(p.price_aed, rate)}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                    <span className="font-mono text-xs text-muted">{p.reference}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/reservation/${p.reference}`} className="btn-secondary px-3.5 py-1.5 text-xs">
                      Details <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                    {p.gift_slug && (
                      <Link href={`/gift/${p.gift_slug}`} className="btn-ghost px-3.5 py-1.5 text-xs">
                        Where to buy
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {closed.length > 0 && (
        <div className="mt-6 text-sm text-muted">
          <p className="font-medium text-ink-soft">No longer reserved</p>
          <ul className="mt-1 space-y-0.5">
            {closed.map((p) => (
              <li key={p.reference}>
                {p.gift_name} — {STATUS[p.status].label.toLowerCase()} · {formatDateTime(p.created_at)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {personalLink && live.length > 0 && (
        <section className="mt-8 rounded-2xl border border-sage-200 bg-sage-50 p-5" aria-labelledby="link-heading" data-testid="personal-link">
          <h2 id="link-heading" className="flex items-center gap-2 font-sans text-sm font-semibold text-sage-800">
            <KeyRound className="size-4" aria-hidden /> Your personal link
          </h2>
          <p className="mt-1 text-sm text-sage-800">
            This page is remembered on this device. To see your gifts on another phone or computer, save this link (for example, email
            it to yourself). Keep it private — anyone with it can see which gifts you pledged.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-lg bg-white px-3 py-1.5 text-xs text-ink">{personalLink}</code>
            <CopyButton text={personalLink} label="Copy link" />
          </div>
        </section>
      )}

      <div className="mt-8">
        <PriceNotice settings={data.settings} compact />
      </div>
    </main>
  );
}
