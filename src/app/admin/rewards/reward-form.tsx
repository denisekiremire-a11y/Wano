"use client";

import { useActionState, useState } from "react";
import { createRewardAction } from "@/lib/actions/reward-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

type ListingOption = { id: string; title: string; businessName: string };
type EventOption = { id: string; title: string };

export function RewardForm({
  listingOptions,
  eventOptions,
}: {
  listingOptions: ListingOption[];
  eventOptions: EventOption[];
}) {
  const [state, formAction, pending] = useActionState(createRewardAction, initialState);
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "freebie">("percent");
  const [source, setSource] = useState<"manual" | "funzone" | "xp_draw" | "points_shop">("manual");

  return (
    <form action={formAction} className="space-y-4 border border-ink/10 bg-white p-5">
      <h2 className="font-serif-editorial text-lg text-ink">Add a reward</h2>

      <div>
        <label className="text-sm font-medium text-ink">Title</label>
        <input
          name="title"
          required
          placeholder="27% off your stay"
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Description (optional)</label>
        <textarea
          name="description"
          rows={2}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Applies to</label>
        <select
          name="target"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
        >
          <option value="" disabled>
            Choose a place or event
          </option>
          <optgroup label="Places">
            {listingOptions.map((l) => (
              <option key={l.id} value={`listing:${l.id}`}>
                {l.title} ({l.businessName})
              </option>
            ))}
          </optgroup>
          <optgroup label="Events">
            {eventOptions.map((e) => (
              <option key={e.id} value={`event:${e.id}`}>
                {e.title}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Source</label>
        <select
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
        >
          <option value="manual">Campaign — travellers claim it on the place/event page</option>
          <option value="funzone">Fun Zone — staff issue it to a game winner</option>
          <option value="xp_draw">XP draw — awarded to a match-day draw winner</option>
          <option value="points_shop">Points shop — travellers spend points to redeem</option>
        </select>
      </div>

      {source === "points_shop" && (
        <div>
          <label className="text-sm font-medium text-ink">Cost in points</label>
          <input
            name="pointsCost"
            type="number"
            min={1}
            required
            placeholder="1500"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <p className="mt-1 text-xs text-ink/50">
            Travellers can redeem this again and again, any time their points balance covers the cost.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-ink">Discount type</label>
          <select
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount (UGX)</option>
            <option value="freebie">Freebie</option>
          </select>
        </div>
        {discountType !== "freebie" && (
          <div>
            <label className="text-sm font-medium text-ink">
              {discountType === "percent" ? "Percent" : "Amount (UGX)"}
            </label>
            <input
              name="discountValue"
              type="number"
              min={1}
              required
              placeholder={discountType === "percent" ? "27" : "50000"}
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-ink">Valid for (days)</label>
          <input
            name="defaultValidityDays"
            type="number"
            min={1}
            defaultValue={30}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <p className="mt-1 text-xs text-ink/50">
            Ignored for event-targeted rewards — those expire when the event ends.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Funded by (optional)</label>
          <select
            name="fundedBy"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="">Undecided</option>
            <option value="wano">Wano</option>
            <option value="venue">Venue</option>
            <option value="split">Split</option>
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add reward"}
      </button>
    </form>
  );
}
