"use client";

import { useState, useTransition } from "react";
import { BookingThread } from "@/components/booking-thread";
import { adminSetBookingStatusAction } from "@/lib/actions/admin-actions";
import { formatCommission } from "@/lib/currency";
import { formatRewardDiscount } from "@/lib/reward-format";

const statusStyles: Record<string, string> = {
  held: "text-ember",
  pending: "text-ember",
  confirmed: "text-ink",
  completed: "text-ink/60",
  cancelled: "text-red-600",
  expired: "text-ink/30",
};

type Status = "held" | "pending" | "confirmed" | "completed" | "cancelled" | "expired";

export function BookingRow({
  bookingId,
  bookingRef,
  travellerName,
  travellerEmail,
  listingTitle,
  category,
  businessName,
  journeyName,
  status,
  commission,
  createdAt,
  bookingName,
  visitDate,
  visitTime,
  partySize,
  notes,
  appliedReward,
  birthdayInfo,
  flaggedForSupport,
}: {
  bookingId: string;
  bookingRef: string;
  travellerName: string;
  travellerEmail: string;
  listingTitle: string;
  category: string;
  businessName: string;
  journeyName: string | null;
  status: Status;
  commission: string;
  createdAt: string;
  bookingName?: string | null;
  visitDate?: string | null;
  visitTime?: string | null;
  partySize?: number | null;
  notes?: string | null;
  appliedReward?: { title: string; discountType: "percent" | "fixed" | "freebie"; discountValue: string | null } | null;
  birthdayInfo?: { perkTitle: string; eligible: boolean; reason: string } | null;
  flaggedForSupport?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [showThread, setShowThread] = useState(false);

  const setStatus = (next: "confirmed" | "completed" | "cancelled") =>
    startTransition(() => adminSetBookingStatusAction(bookingId, next));

  return (
    <div className="border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{listingTitle}</p>
          <p className="text-sm text-ink/70">
            {businessName} <span className="text-ink/40">· {category}</span>
          </p>
          <p className="font-mono-data text-xs text-ink/50">
            {journeyName ?? "General booking"} · ref {bookingRef} ·{" "}
            {new Date(createdAt).toLocaleDateString()}
          </p>
          {bookingName && bookingName !== travellerName && (
            <p className="text-xs text-ink/50">Reservation under: {bookingName}</p>
          )}
          {(visitDate || partySize) && (
            <p className="font-mono-data text-xs text-ink/50">
              {visitDate ? `${visitDate}${visitTime ? ` at ${visitTime}` : ""}` : ""}
              {visitDate && partySize ? " · " : ""}
              {partySize ? `Party of ${partySize}` : ""}
            </p>
          )}
          {notes && <p className="text-xs italic text-ink/50">&quot;{notes}&quot;</p>}
          {appliedReward && (
            <p className="text-xs font-medium text-ember">
              {appliedReward.title} — {formatRewardDiscount(appliedReward.discountType, appliedReward.discountValue)}
            </p>
          )}
          {birthdayInfo && (
            <p
              className={`eyebrow mt-1 ${
                birthdayInfo.eligible ? "text-ember" : "text-ink/40"
              }`}
            >
              {birthdayInfo.eligible ? `Eligible — ${birthdayInfo.perkTitle}` : birthdayInfo.reason}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`eyebrow capitalize ${statusStyles[status]}`}>
            {status}
          </span>
          {flaggedForSupport && (
            <span className="eyebrow text-red-600">
              Flagged — vendor cancelled
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3">
        <div className="text-sm">
          <p className="text-ink">{travellerName}</p>
          <p className="font-mono-data text-xs text-ink/50">
            {travellerEmail} · est. commission {formatCommission(commission)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={pending || status === "confirmed" || status === "held" || status === "expired"}
            onClick={() => setStatus("confirmed")}
            className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-40"
            title={status === "held" ? "Still mid-checkout — wait for payment to confirm it, or let it expire" : undefined}
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={pending || status === "completed" || status === "held" || status === "expired"}
            onClick={() => setStatus("completed")}
            className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-40"
          >
            Mark completed
          </button>
          <button
            type="button"
            disabled={pending || status === "cancelled" || status === "expired"}
            onClick={() => setStatus("cancelled")}
            className="rounded-full border border-red-300 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowThread((v) => !v)}
            className="rounded-full border border-ink/20 px-2.5 py-1 text-[11px] font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            {showThread ? "Hide messages" : "Messages"}
          </button>
        </div>
      </div>
      {showThread && (
        <div className="mt-3 border-t border-ink/10 pt-3">
          <BookingThread bookingId={bookingId} heading="Booking messages" />
        </div>
      )}
    </div>
  );
}
