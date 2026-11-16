"use client";

import Link from "next/link";
import { ArrowLeft, Heart, Info } from "lucide-react";
import { BASIS_EXPLANATION } from "@/lib/pricing";
import { useRegistry } from "./context";
import { GiftImage } from "./GiftImage";
import { PriceBlock } from "./PriceBlock";
import { StatusBadge } from "./StatusBadge";
import { WhereToBuyPanel } from "./WhereToBuyPanel";

export function GiftDetail({ giftId }: { giftId: string }) {
  const { giftById, categories, rate, openReserve, giftRetailers, retailers, locations } = useRegistry();
  const gift = giftById(giftId);

  if (!gift) {
    return (
      <div className="card p-10 text-center">
        <p className="font-display text-2xl">This gift has been removed from the list.</p>
        <Link href="/registry" className="btn-primary mt-5">
          Browse the wishlist
        </Link>
      </div>
    );
  }
  const category = categories.find((c) => c.id === gift.category_id);

  return (
    <article data-testid="gift-detail" data-status={gift.status}>
      <Link href={category ? `/registry/${category.slug}` : "/registry"} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {category?.name ?? "All gifts"}
      </Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
        <figure>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-linen shadow-[var(--shadow-soft)]">
            <GiftImage gift={gift} sizes="(min-width: 1024px) 40vw, 95vw" priority />
          </div>
          {gift.image_caption && <figcaption className="mt-2 text-xs text-muted">{gift.image_caption}</figcaption>}
        </figure>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={gift.status} />
            {gift.tier === "premium" && <span className="rounded-full bg-cream px-2.5 py-1 text-xs text-ink-soft">Premium pick</span>}
            {gift.tier === "budget" && <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs text-sage-700">Budget-friendly</span>}
            {gift.is_alternative && <span className="rounded-full bg-cream px-2.5 py-1 text-xs text-ink-soft">Alternative option</span>}
          </div>
          <p className="eyebrow mt-5">{category?.name}</p>
          <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">{gift.name}</h1>
          {gift.description && <p className="mt-3 text-lg text-ink-soft">{gift.description}</p>}

          <div className="mt-6 rounded-2xl border border-linen bg-white p-5">
            <PriceBlock gift={gift} rate={rate} size="lg" />
            <div className="mt-3 flex gap-2 text-xs text-muted">
              <Info className="size-3.5 shrink-0" aria-hidden />
              <p>
                {BASIS_EXPLANATION[gift.price_basis]}
                {gift.price_label ? ` As written in the original list: “${gift.price_label}”.` : ""}
              </p>
            </div>
          </div>

          {gift.notes && <p className="mt-4 rounded-2xl bg-cream/60 p-4 text-sm text-ink-soft">{gift.notes}</p>}

          <div className="mt-6">
            {gift.status === "available" ? (
              <button type="button" className="btn-primary w-full py-3 text-[15px] sm:w-auto sm:px-8" onClick={() => openReserve(gift)} data-testid="reserve-button">
                <Heart className="size-4" aria-hidden /> Reserve this gift
              </button>
            ) : (
              <p className="rounded-2xl bg-cream p-4 text-sm text-ink-soft" data-testid="unavailable-note">
                {gift.status === "reserved"
                  ? "Someone has already reserved this gift, so it can’t be reserved again. Thank you for thinking of it!"
                  : "This gift has already been purchased. Thank you for thinking of it!"}
              </p>
            )}
          </div>

          <section className="mt-10" aria-labelledby="wtb">
            <h2 id="wtb" className="mb-4 text-3xl">
              Where to buy
            </h2>
            <WhereToBuyPanel gift={gift} giftRetailers={giftRetailers} retailers={retailers} locations={locations} />
          </section>
        </div>
      </div>
    </article>
  );
}
