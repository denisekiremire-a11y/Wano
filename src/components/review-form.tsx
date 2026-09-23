"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/toast/toast-provider";
import { submitReviewAction } from "@/lib/actions/review-actions";

const categories = [
  { name: "safetyRating", label: "Safety" },
  { name: "reliabilityRating", label: "Reliability" },
  { name: "valueRating", label: "Value" },
  { name: "communicationRating", label: "Communication" },
] as const;

function StarPicker({ name, label }: { name: string; label: string }) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-forest-800/70">{label}</legend>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} required className="peer sr-only" />
            <span className="block rounded-md border border-forest-900/15 px-2 py-1 text-xs text-forest-800/60 peer-checked:border-marigold-500 peer-checked:bg-marigold-50 peer-checked:text-marigold-800 peer-checked:font-semibold">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewForm({ bookingId, listingTitle }: { bookingId: string; listingTitle: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // Called directly rather than via useActionState's form-submit
      // lifecycle — a successful review removes this booking from
      // getReviewableBookings, unmounting this form as part of the same
      // revalidatePath, so a useEffect keyed to pending state would lose
      // that race (see claim-reward-button.tsx for the same fix).
      const result = await submitReviewAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        push("Thanks for your review!");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-3 rounded-xl border border-forest-900/10 bg-forest-50/50 p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-xs font-medium text-forest-800/70">Rate your stay at {listingTitle}</p>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((c) => (
          <StarPicker key={c.name} name={c.name} label={c.label} />
        ))}
      </div>
      <textarea
        name="comment"
        rows={2}
        maxLength={500}
        placeholder="Anything else other travellers should know? (optional)"
        className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
