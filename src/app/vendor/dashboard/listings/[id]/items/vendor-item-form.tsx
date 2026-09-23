"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createListingItemAction, updateListingItemAction } from "@/lib/actions/vendor-item-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

type ExistingItem = {
  id: string;
  name: string;
  description: string | null;
  sectionLabel: string | null;
  priceMinor: number | null;
  priceUnit: string | null;
  durationText: string | null;
  capacityText: string | null;
};

/** Create/edit form for one listingItem (a menu dish, salon service, room
 * type, vehicle, or ticket tier) — reused for both flows, matching
 * VendorListingForm's useActionState pattern one level down. */
export function VendorItemForm({ listingId, existing }: { listingId: string; existing?: ExistingItem }) {
  const [state, formAction, pending] = useActionState(
    existing ? updateListingItemAction : createListingItemAction,
    initialState,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      if (existing) {
        router.push(`/vendor/dashboard/listings/${listingId}/items`);
      } else {
        formRef.current?.reset();
        router.refresh();
      }
    }
    wasPending.current = pending;
  }, [pending, state, router, existing, listingId]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      {existing && <input type="hidden" name="itemId" value={existing.id} />}

      <div>
        <label className="text-sm font-medium text-forest-900">Name</label>
        <input
          name="name"
          required
          defaultValue={existing?.name}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Section (optional)</label>
        <input
          name="sectionLabel"
          placeholder='e.g. "Starters", "Main Courses", "Standard Package"'
          defaultValue={existing?.sectionLabel ?? ""}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <p className="mt-1 text-xs text-forest-800/50">
          Group items under a heading, e.g. &quot;Starters&quot;, &quot;Main Courses&quot;, &quot;Standard
          Package&quot;.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Description (optional)</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={existing?.description ?? ""}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-forest-900">Price — whole UGX (optional)</label>
          <input
            name="priceMinor"
            type="number"
            min={0}
            step={1}
            placeholder="e.g. 25000"
            defaultValue={existing?.priceMinor ?? ""}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Price unit (optional)</label>
          <input
            name="priceUnit"
            placeholder="/person, /night, /hour"
            defaultValue={existing?.priceUnit ?? ""}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-forest-900">Duration (optional)</label>
          <input
            name="durationText"
            placeholder="e.g. 2 hours"
            defaultValue={existing?.durationText ?? ""}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Capacity (optional)</label>
          <input
            name="capacityText"
            placeholder="e.g. Up to 5 passengers"
            defaultValue={existing?.capacityText ?? ""}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : existing ? "Save changes" : "Add item"}
        </button>
        {existing && (
          <a
            href={`/vendor/dashboard/listings/${listingId}/items`}
            className="text-sm font-medium text-forest-800/60 hover:text-forest-900"
          >
            Cancel
          </a>
        )}
      </div>
    </form>
  );
}
