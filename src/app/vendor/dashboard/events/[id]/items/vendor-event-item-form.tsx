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
  priceMinor: number | null;
  priceUnit: string | null;
};

/** Create/edit form for one ticket tier — the event-ticket counterpart of
 * VendorItemForm, minus the section/duration/capacity fields a ticket
 * tier doesn't need. */
export function VendorEventItemForm({ eventId, existing }: { eventId: string; existing?: ExistingItem }) {
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
        router.push(`/vendor/dashboard/events/${eventId}/items`);
      } else {
        formRef.current?.reset();
        router.refresh();
      }
    }
    wasPending.current = pending;
  }, [pending, state, router, existing, eventId]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      {existing && <input type="hidden" name="itemId" value={existing.id} />}

      <div>
        <label className="text-sm font-medium text-forest-900">Ticket name</label>
        <input
          name="name"
          required
          placeholder="e.g. General Admission, VIP"
          defaultValue={existing?.name}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
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
          <label className="text-sm font-medium text-forest-900">Price — whole UGX</label>
          <input
            name="priceMinor"
            type="number"
            min={0}
            step={1}
            required
            placeholder="e.g. 40000"
            defaultValue={existing?.priceMinor ?? ""}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Price unit (optional)</label>
          <input
            name="priceUnit"
            placeholder="e.g. /person"
            defaultValue={existing?.priceUnit ?? ""}
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
          {pending ? "Saving…" : existing ? "Save changes" : "Add ticket"}
        </button>
        {existing && (
          <a
            href={`/vendor/dashboard/events/${eventId}/items`}
            className="text-sm font-medium text-forest-800/60 hover:text-forest-900"
          >
            Cancel
          </a>
        )}
      </div>
    </form>
  );
}
