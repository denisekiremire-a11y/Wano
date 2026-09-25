"use client";

import { useState, useTransition } from "react";
import { BookingThread } from "@/components/booking-thread";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast/toast-provider";
import { respondToBookingAction, vendorCancelConfirmedBookingAction } from "@/lib/actions/vendor-booking-actions";
import { formatRewardDiscount } from "@/lib/reward-format";

const statusStyles: Record<string, string> = {
  held: "bg-nile-100 text-nile-800",
  pending: "bg-marigold-100 text-marigold-800",
  confirmed: "bg-forest-100 text-forest-800",
  completed: "bg-forest-100 text-forest-800",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-forest-50 text-forest-800/50",
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
    <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-forest-900">{travellerName}</p>
          {subjectLabel && <p className="text-sm font-medium text-nile-700">{subjectLabel}</p>}
          <p className="text-sm text-forest-800/60">
            {journeyName ?? "General booking"} · ref {bookingRef}
          </p>
          <p className="text-xs text-forest-800/45">{travellerEmail}</p>
          {bookingName && bookingName !== travellerName && (
            <p className="mt-1 text-xs text-forest-800/60">Reservation under: {bookingName}</p>
          )}
          {(visitDate || partySize) && (
            <p className="mt-1 text-xs text-forest-800/50">
              {visitDate ? `${visitDate}${visitTime ? ` at ${visitTime}` : ""}` : ""}
              {visitDate && partySize ? " · " : ""}
              {partySize ? `Party of ${partySize}` : ""}
            </p>
          )}
          {notes && <p className="mt-1 text-xs italic text-forest-800/50">&quot;{notes}&quot;</p>}
          {appliedReward && (
            <p className="mt-1 text-xs font-medium text-marigold-800">
              🎟️ {appliedReward.title} — {formatRewardDiscount(appliedReward.discountType, appliedReward.discountValue)}
            </p>
          )}
          {birthdayInfo && (
            <p
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                birthdayInfo.eligible ? "bg-marigold-100 text-marigold-800" : "bg-forest-50 text-forest-800/60"
              }`}
            >
              🎂 {birthdayInfo.eligible ? `Eligible — ${birthdayInfo.perkTitle}` : birthdayInfo.reason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[status]}`}>
            {status}
          </span>
          <button
            type="button"
            onClick={() => setShowThread((v) => !v)}
            className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800 transition hover:bg-forest-900/5"
          >
            {showThread ? "Hide messages" : "Messages"}
          </button>
          {status === "pending" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => respondToBookingAction(bookingId, "confirmed"))}
                className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => respondToBookingAction(bookingId, "cancelled"))}
                className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
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
                  className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {pending ? "Cancelling…" : "Cancel booking"}
                </button>
              )}
            />
          )}
        </div>
      </div>
      {cancelError && <p className="mt-2 text-right text-xs text-red-700">{cancelError}</p>}
      {showThread && (
        <div className="mt-3">
          <BookingThread bookingId={bookingId} heading={`Messages with ${travellerName}`} />
        </div>
      )}
    </div>
  );
}
