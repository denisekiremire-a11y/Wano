"use client";

import Link from "next/link";
import { ExternalLink, Heart, MapPin } from "lucide-react";
import { primaryBuyLink } from "@/lib/links";
import type { Gift } from "@/lib/types";
import { useRegistry } from "./context";
import { GiftImage } from "./GiftImage";
import { PriceBlock } from "./PriceBlock";
import { StatusBadge } from "./StatusBadge";

export function GiftCard({ gift, priority }: { gift: Gift; priority?: boolean }) {
  const { categories, rate, openReserve, openWhereToBuy, giftRetailers, retailers } = useRegistry();
  const buy = primaryBuyLink(gift, giftRetailers, retailers);
  const category = categories.find((c) => c.id === gift.category_id);
  const available = gift.status === "available";

  return (
    <article
      className={`card group flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)] ${available ? "" : "opacity-[0.88]"}`}
      data-testid="gift-card"
      data-gift-id={gift.id}
      data-gift-slug={gift.slug}
      data-status={gift.status}
    >
      <Link href={`/gift/${gift.slug}`} className="relative block aspect-[4/3] overflow-hidden min-[480px]:aspect-[4/5]" tabIndex={-1} aria-hidden>
        <GiftImage gift={gift} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, (min-width: 480px) 45vw, 90vw" priority={priority} />
        <div className="absolute left-3 top-3">
          <StatusBadge status={gift.status} className="bg-white/95 shadow-sm backdrop-blur" />
        </div>
        {gift.tier === "premium" && (
          <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">Premium pick</span>
        )}
        {gift.tier === "budget" && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-sage-700 backdrop-blur">Budget-friendly</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="eyebrow">
          {category?.name}
          {gift.is_alternative && <span className="ml-1.5 normal-case tracking-normal text-muted">· Alternative option</span>}
        </p>
        <h3 className="mt-1 text-xl leading-snug text-ink">
          <Link href={`/gift/${gift.slug}`} className="hover:text-sage-700">
            {gift.name}
          </Link>
        </h3>
        {gift.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{gift.description}</p>}
        <div className="mt-3">
          <PriceBlock gift={gift} rate={rate} />
        </div>
        <div className="mt-auto space-y-2 pt-4">
          {available ? (
            <button type="button" className="btn-primary w-full py-3" onClick={() => openReserve(gift)} data-testid="reserve-button">
              <Heart className="size-4" aria-hidden /> Reserve this gift
            </button>
          ) : (
            <span className="btn w-full cursor-default border border-linen bg-cream py-3 text-muted" aria-disabled="true">
              {gift.status === "reserved" ? "Already reserved" : "Already purchased"}
            </span>
          )}
          {buy ? (
            <>
              <a
                href={buy.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full px-3 text-[13px]"
                data-testid="buy-link"
                title={buy.note ?? undefined}
              >
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">Buy at {buy.retailer}</span>
              </a>
              <button
                type="button"
                className="w-full py-1 text-center text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                onClick={() => openWhereToBuy(gift)}
                data-testid="where-button"
              >
                Other shops & stores
              </button>
            </>
          ) : (
            <button type="button" className="btn-secondary w-full px-3 text-[13px]" onClick={() => openWhereToBuy(gift)} data-testid="where-button">
              <MapPin className="size-3.5" aria-hidden /> Where to buy
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
