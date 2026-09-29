"use client";

import { useState, useTransition } from "react";
import { BookingThread } from "@/components/booking-thread";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast/toast-provider";
import { respondToBookingAction, vendorCancelConfirmedBookingAction } from "@/lib/actions/vendor-booking-actions";
import { formatRewardDiscount } from "@/lib/reward-format";

const statusStyles: Record<string, string> = {
  held: "text-ember",
  pending: "text-ember",
  confirmed: "text-ink",
  completed: "text-ink/60",
  cancelled: "text-red-600",
  expired: "text-ink/30",
};

export function BookingRow({
  bookingId,
  travellerName,
  travellerEmail,
  subjectLabel,
  journeyName,
  bookingRef,
  status,
  bookingName,
  visitDate,
  visitTime,
  partySize,
  notes,
  appliedReward,
  birthdayInfo,
}: {
  bookingId: string;
  travellerName: string;
  travellerEmail: string;
  subjectLabel?: string;
  journeyName: string | null;
  bookingRef: string;
  status: "held" | "pending" | "confirmed" | "completed" | "cancelled" | "expired";
  bookingName?: string | null;
  visitDate?: string | null;
  visitTime?: string | null;
  partySize?: number | null;
  notes?: string | null;
  appliedReward?: { title: string; discountType: "percent" | "fixed" | "freebie"; discountValue: string | null } | null;
  birthdayInfo?: { perkTitle: string; eligible: boolean; reason: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [showThread, setShowThread] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { push } = useToast();

  function doVendorCancel() {
    startTransition(async () => {
      const result = await vendorCancelConfirmedBookingAction(bookingId);
      if (result.error) {
        setCancelError(result.error);
      } else {
        setCancelError(null);
        push("Booking cancelled and traveller notified.");
      }
    });
  }

  return (
    <div className="border border-ink/10 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-ink">{travellerName}</p>
          {subjectLabel && <p className="text-sm font-medium text-ember">{subjectLabel}</p>}
          <p className="font-mono-data text-sm text-ink/60">
            {journeyName ?? "General booking"} · ref {bookingRef}
          </p>
          <p className="text-xs text-ink/40">{travellerEmail}</p>
          {bookingName && bookingName !== travellerName && (
            <p className="mt-1 text-xs text-ink/60">Reservation under: {bookingName}</p>
          )}
          {(visitDate || partySize) && (
            <p className="font-mono-data mt-1 text-xs text-ink/50">
              {visitDate ? `${visitDate}${visitTime ? ` at ${visitTime}` : ""}` : ""}
              {visitDate && partySize ? " · " : ""}
              {partySize ? `Party of ${partySize}` : ""}
            </p>
          )}
          {notes && <p className="mt-1 text-xs italic text-ink/50">&quot;{notes}&quot;</p>}
          {appliedReward && (
            <p className="mt-1 text-xs font-medium text-ember">
              {appliedReward.title} — {formatRewardDiscount(appliedReward.discountType, appliedReward.discountValue)}
            </p>
          )}
          {birthdayInfo && (
            <p className={`mt-1 text-xs font-medium ${birthdayInfo.eligible ? "text-ember" : "text-ink/40"}`}>
              {birthdayInfo.eligible ? `Eligible — ${birthdayInfo.perkTitle}` : birthdayInfo.reason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`eyebrow capitalize ${statusStyles[status]}`}>{status}</span>
          <button
            type="button"
            onClick={() => setShowThread((v) => !v)}
            className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            {showThread ? "Hide messages" : "Messages"}
          </button>
          {status === "pending" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => respondToBookingAction(bookingId, "confirmed"))}
                className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => respondToBookingAction(bookingId, "cancelled"))}
                className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Decline
              </button>
            </>
          )}
          {status === "confirmed" && (
            <ConfirmDialog
              title="Cancel this booking?"
              body={
                <p>
                  The traveller will be refunded and notified, and this will be flagged for Wano support. This
                  can&apos;t be undone.
                </p>
              }
              confirmLabel="Cancel booking"
              onConfirm={doVendorCancel}
              trigger={(open) => (
                <button
                  type="button"
                  disabled={pending}
                  onClick={open}
                  className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {pending ? "Cancelling…" : "Cancel booking"}
                </button>
              )}
            />
          )}
        </div>
      </div>
      {cancelError && <p className="mt-2 text-right text-xs text-red-600">{cancelError}</p>}
      {showThread && (
        <div className="mt-3">
          <BookingThread bookingId={bookingId} heading={`Messages with ${travellerName}`} />
        </div>
      )}
    </div>
  );
}
