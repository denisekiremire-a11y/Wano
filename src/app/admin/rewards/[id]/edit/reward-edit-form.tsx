"use client";

import { useActionState, useState } from "react";
import { updateRewardAction } from "@/lib/actions/reward-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

type ListingOption = { id: string; title: string; businessName: string };
type EventOption = { id: string; title: string };
type DiscountType = "percent" | "fixed" | "freebie" | "spend_perk" | "points";

function toDatetimeLocal(value: Date | null) {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function RewardEditForm({
  reward,
  listingOptions,
  eventOptions,
}: {
  reward: {
    id: string;
    title: string;
    description: string | null;
    targetType: "listing" | "event";
    targetId: string;
    discountType: DiscountType;
    discountValue: string | null;
    minBillMinor: number | null;
    source: "manual" | "funzone" | "xp_draw" | "points_shop" | "referral" | "campaign";
    pointsCost: number | null;
    fundedBy: string | null;
    wanoSharePct: number | null;
    totalCap: number | null;
    perUserCap: number;
    startsAt: Date | null;
    endsAt: Date | null;
    defaultValidityDays: number;
  };
  listingOptions: ListingOption[];
  eventOptions: EventOption[];
}) {
  const [state, formAction, pending] = useActionState(updateRewardAction, initialState);
  const [discountType, setDiscountType] = useState<DiscountType>(reward.discountType);

  return (
    <form action={formAction} className="space-y-4 border border-ink/10 bg-white p-5">
      <input type="hidden" name="rewardId" value={reward.id} />

      <div>
        <label className="text-sm font-medium text-ink">Title</label>
        <input
          name="title"
          required
          defaultValue={reward.title}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Description (optional)</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={reward.description ?? ""}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Applies to</label>
        <select
          name="target"
          required
          defaultValue={`${reward.targetType}:${reward.targetId}`}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
        >
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

      {/* source isn't editable — it decides which flow issues this reward
          (self-claim, Fun Zone, XP draw, points shop) and changing it after
          the fact would strand whatever mints against the old one. */}
      <input type="hidden" name="source" value={reward.source} />

      {reward.source === "points_shop" && (
        <div>
          <label className="text-sm font-medium text-ink">Cost in points</label>
          <input
            name="pointsCost"
            type="number"
            min={1}
            required
            defaultValue={reward.pointsCost ?? undefined}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-ink">Discount type</label>
          <select
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount (UGX)</option>
            <option value="freebie">Freebie</option>
            <option value="spend_perk">Spend-based perk (restaurants/bars)</option>
            <option value="points">Points</option>
          </select>
        </div>
        {discountType !== "freebie" && (
          <div>
            <label className="text-sm font-medium text-ink">
              {discountType === "fixed"
                ? "Amount (UGX)"
                : discountType === "points"
                  ? "Points granted"
                  : "Percent"}
            </label>
            <input
              name="discountValue"
              type="number"
              min={1}
              required
              defaultValue={reward.discountValue ?? undefined}
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
        )}
      </div>

      {discountType === "spend_perk" && (
        <div>
          <label className="text-sm font-medium text-ink">Minimum bill (UGX)</label>
          <input
            name="minBillMinor"
            type="number"
            min={0}
            required
            defaultValue={reward.minBillMinor ?? undefined}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-ink">Valid for (days)</label>
          <input
            name="defaultValidityDays"
            type="number"
            min={1}
            defaultValue={reward.defaultValidityDays}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Funded by (optional)</label>
          <select
            name="fundedBy"
            defaultValue={reward.fundedBy ?? ""}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="">Undecided</option>
            <option value="wano">Wano</option>
            <option value="venue">Venue</option>
            <option value="split">Split</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-ink">Wano&apos;s share (%)</label>
          <input
            name="wanoSharePct"
            type="number"
            min={0}
            max={100}
            defaultValue={reward.wanoSharePct ?? undefined}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Total cap (optional)</label>
          <input
            name="totalCap"
            type="number"
            min={1}
            defaultValue={reward.totalCap ?? undefined}
            placeholder="Unlimited"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Per-traveller cap</label>
          <input
            name="perUserCap"
            type="number"
            min={1}
            defaultValue={reward.perUserCap}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-ink">Starts (optional)</label>
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={toDatetimeLocal(reward.startsAt)}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Ends (optional)</label>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={toDatetimeLocal(reward.endsAt)}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
