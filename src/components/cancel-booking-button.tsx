"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast/toast-provider";
import { cancelBookingAction } from "@/lib/actions/booking-actions";

export function CancelBookingButton({ bookingId, refunds }: { bookingId: string; refunds: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();
  const router = useRouter();

  function doCancel() {
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        push(refunds ? "Cancelled — you've been refunded." : "Booking cancelled.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <ConfirmDialog
        title="Cancel this booking?"
        body={
          <p>
            {refunds
              ? "You're outside the cancellation window, so this is a free cancellation and you'll be refunded automatically."
              : "This booking hasn't been paid for yet, so there's nothing to refund."}
          </p>
        }
        confirmLabel="Cancel booking"
        onConfirm={doCancel}
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            disabled={pending}
            className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Cancel booking"}
          </button>
        )}
      />
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
