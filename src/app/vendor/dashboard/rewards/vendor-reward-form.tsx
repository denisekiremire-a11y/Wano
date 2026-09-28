"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitRewardAction } from "@/lib/actions/reward-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

type ListingOption = { id: string; title: string };

export function VendorRewardForm({
  listingOptions,
  existing,
}: {
  listingOptions: ListingOption[];
  existing?: {
    rewardId: string;
    title: string;
    description: string;
    listingId: string;
    discountType: "percent" | "fixed" | "freebie";
    discountValue: string;
    defaultValidityDays: number;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitRewardAction, initialState);
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "freebie">(
    existing?.discountType ?? "percent",
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) router.push("/vendor/dashboard/rewards");
    wasPending.current = pending;
  }, [pending, state, router]);

  return (
    <form action={formAction} className="space-y-4 border border-ink/10 bg-white p-5">
      {existing && <input type="hidden" name="rewardId" value={existing.rewardId} />}

      <div className="border border-ink/10 bg-ink/5 p-3 text-xs text-ink/70">
        {existing
          ? "Changes go to the Wano team for review before they replace what's currently live."
          : "New rewards go to the Wano team for review before members can claim them."}
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Title</label>
        <input
          name="title"
          required
          placeholder="15% off your bill"
          defaultValue={existing?.title}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Description (optional)</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={existing?.description}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Applies to</label>
        <select
          name="listingId"
          required
          defaultValue={existing?.listingId ?? ""}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
        >
          <option value="" disabled>
            Choose one of your listings
          </option>
          {listingOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Discount type</label>
        <select
          name="discountType"
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
        >
          <option value="percent">Percent off</option>
          <option value="fixed">Fixed amount off</option>
          <option value="freebie">Freebie (no discount value)</option>
        </select>
      </div>

      {discountType !== "freebie" && (
        <div>
          <label className="text-sm font-medium text-ink">
            {discountType === "percent" ? "Percent (e.g. 15)" : "Amount in UGX"}
          </label>
          <input
            name="discountValue"
            type="number"
            min={0}
            step={discountType === "percent" ? 1 : 100}
            required
            defaultValue={existing?.discountValue}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-ink">Valid for (days after claim)</label>
        <input
          name="defaultValidityDays"
          type="number"
          min={1}
          max={365}
          defaultValue={existing?.defaultValidityDays ?? 30}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Submitting…" : existing ? "Submit changes for review" : "Submit reward for review"}
      </button>
    </form>
  );
}
