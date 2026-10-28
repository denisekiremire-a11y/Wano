"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/validation";

/** The review screen's final confirm button — step 2 of booking, shared by
 * the listing (bookListingFormAction) and event (buyEventTicketsAction)
 * flows. Both actions return ActionState instead of throwing, so a failure
 * here (slot taken in the meantime, listing/event no longer available,
 * payment couldn't start) shows inline rather than crashing the page. */
export function BookingConfirmForm({
  action,
  submitLabel,
  children,
}: {
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="mt-4">
      {children}
      {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Booking…" : `${submitLabel} →`}
      </button>
    </form>
  );
}
