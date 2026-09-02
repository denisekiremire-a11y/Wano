"use client";

import { useActionState, useState } from "react";
import { updateOfferAction } from "@/lib/actions/vendor-actions";
import { JourneyArt } from "@/components/journey-art";
import { OfferTeaser } from "@/components/offer-teaser";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function OfferEditor({
  listingId,
  listingTitle,
  businessName,
  priceHint,
  gradient,
  artSlug,
  initialDiscountText,
  initialFreebieText,
  initialActive,
}: {
  listingId: string;
  listingTitle: string;
  businessName: string;
  priceHint: string | null;
  gradient: string;
  artSlug: string;
  initialDiscountText: string;
  initialFreebieText: string;
  initialActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateOfferAction, initialState);
  const [discountText, setDiscountText] = useState(initialDiscountText);
  const [freebieText, setFreebieText] = useState(initialFreebieText);
  const [active, setActive] = useState(initialActive);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
        <input type="hidden" name="listingId" value={listingId} />

        <div>
          <label htmlFor="discountText" className="text-sm font-medium text-forest-900">
            Discount text
          </label>
          <input
            id="discountText"
            name="discountText"
            required
            value={discountText}
            onChange={(e) => setDiscountText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>

        <div>
          <label htmlFor="freebieText" className="text-sm font-medium text-forest-900">
            Freebie text (optional)
          </label>
          <input
            id="freebieText"
            name="freebieText"
            value={freebieText}
            onChange={(e) => setFreebieText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-forest-900">
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-forest-900/30"
          />
          Offer is active
        </label>

        {state.error && <p className="text-sm text-red-700">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save offer"}
        </button>
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-forest-800/50">
          Live preview
        </p>
        <div className="overflow-hidden rounded-2xl border border-forest-900/10 bg-white">
          <div className={`h-16 overflow-hidden bg-gradient-to-br ${gradient}`}>
            <JourneyArt slug={artSlug} className="h-full w-full" />
          </div>
          <div className="p-5">
            <p className="font-display text-lg font-semibold text-forest-900">{listingTitle}</p>
            <p className="text-sm text-forest-800/70">{businessName}</p>
            <p className="mt-1 text-sm font-medium text-nile-700">{priceHint}</p>
            <div className="mt-3">
              {active ? (
                <OfferTeaser
                  discountText={discountText || "Add a discount to show travellers"}
                  freebieText={freebieText}
                  unlocked
                  unlockHint=""
                />
              ) : (
                <p className="rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest-800/50">
                  Offer inactive — travellers won&apos;t see a discount for this listing.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
