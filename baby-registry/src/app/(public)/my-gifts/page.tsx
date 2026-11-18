import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Gift as GiftIcon } from "lucide-react";
import { signOutEmailAction } from "@/app/actions/my-gifts";
import { primaryBuyLink } from "@/lib/links";
import { GiftImage } from "@/components/registry/GiftImage";
import { PriceNotice } from "@/components/site/Notices";
import { formatPrice } from "@/lib/currency";
import { getGuestPledges, getPledgesByEmail } from "@/lib/data";
import { EmailSignInForm } from "@/components/registry/EmailSignInForm";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, verifyEmailToken } from "@/lib/email-link";
import type { GuestPledge } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { readGuestKey } from "@/lib/guest-key";
import { getRegistry } from "@/lib/registry-cache";
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
  const [sp, key, data, jar] = await Promise.all([searchParams, readGuestKey(), getRegistry(), cookies()]);
  const email = verifyEmailToken(jar.get(EMAIL_COOKIE)?.value);
  const [byDevice, byEmail] = await Promise.all([
    key ? getGuestPledges(key) : Promise.resolve([] as GuestPledge[]),
    email ? getPledgesByEmail(email).catch(() => [] as GuestPledge[]) : Promise.resolve([] as GuestPledge[]),
  ]);
  // Same reservation can be found both ways: merge by reference, newest first.
  const pledges = [...new Map([...byDevice, ...byEmail].map((p) => [p.reference, p])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const live = pledges.filter((p) => p.status === "active" || p.status === "purchased");
  const closed = pledges.filter((p) => !(p.status === "active" || p.status === "purchased"));
  const toBuy = live.filter((p) => p.status === "active").length;
  const total = live.reduce((a, p) => a + (p.price_aed ?? 0), 0);
  const giftById = new Map(data.gifts.map((g) => [g.id, g]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-testid="my-gifts">
      <p className="eyebrow">My gifts</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">
        {live.length > 0
          ? `You’ve pledged ${live.length} ${live.length === 1 ? "gift" : "gifts"}`
          : email
            ? "No gifts reserved with this email yet"
            : "Your gifts"}
      </h1>

      {email && (
        <form action={signOutEmailAction} className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted" data-testid="linked-email">
          <span>
            Signed in as <strong className="font-medium text-ink-soft">{email}</strong>
          </span>
          <span aria-hidden>·</span>
          <button type="submit" className="text-sage-700 underline-offset-2 hover:underline" data-testid="signout">
            Use a different email
          </button>
        </form>
      )}
      {sp.link === "expired" && (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          That email link has expired or isn’t complete. Just enter your email below instead.
        </p>
      )}
      {!email && (
        <div className="mt-6">
          <EmailSignInForm />
        </div>
      )}
      {sp.link === "invalid" && (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          That link isn’t complete. Please open it again from your confirmation email or page.
        </p>
      )}

      {live.length > 0 && (
        <p className="mt-3 text-ink-soft" data-testid="pledge-summary">
          {toBuy > 0 ? `${toBuy} still to buy` : "All bought — thank you!"} · Estimated total {formatPrice(total)}
        </p>
      )}

      {live.length === 0 && email && (
        <div className="card mt-6 flex flex-col items-center px-6 py-12 text-center">
          <GiftIcon className="size-8 text-sand" strokeWidth={1.25} aria-hidden />
          <p className="mt-3 max-w-md text-sm text-ink-soft">
            We couldn’t find any gifts reserved with this email. If you used a different email, tap “Use a different email” above.
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
                    {formatPrice(p.price_aed)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                    <span className="font-mono text-xs text-muted">{p.reference}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(() => {
                      const buy = p.status === "active" && gift ? primaryBuyLink(gift, data.giftRetailers, data.retailers) : null;
                      return buy ? (
                        <a href={buy.href} target="_blank" rel="noopener noreferrer" className="btn-primary px-3.5 py-1.5 text-xs" data-testid="buy-link">
                          <ExternalLink className="size-3.5" aria-hidden /> Buy at {buy.retailer}
                        </a>
                      ) : null;
                    })()}
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

      <div className="mt-8">
        <PriceNotice settings={data.settings} compact />
      </div>
    </main>
  );
}
