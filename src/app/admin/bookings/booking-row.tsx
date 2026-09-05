"use client";

import { useState, useTransition } from "react";
import { BookingThread } from "@/components/booking-thread";
import { adminSetBookingStatusAction } from "@/lib/actions/admin-actions";

const statusStyles: Record<string, string> = {
  pending: "bg-marigold-100 text-marigold-800",
  confirmed: "bg-forest-100 text-forest-800",
  completed: "bg-nile-100 text-nile-800",
  cancelled: "bg-red-100 text-red-700",
};

type Status = "pending" | "confirmed" | "completed" | "cancelled";

export function BookingRow({
  bookingId,
  bookingRef,
  travellerName,
  travellerEmail,
  listingTitle,
  businessName,
  journeyName,
  status,
  commission,
  createdAt,
  visitDate,
  partySize,
  birthdayInfo,
}: {
  bookingId: string;
  bookingRef: string;
  travellerName: string;
  travellerEmail: string;
  listingTitle: string;
  businessName: string;
  journeyName: string | null;
  status: Status;
  commission: string;
  createdAt: string;
  visitDate?: string | null;
  partySize?: number | null;
  birthdayInfo?: { perkTitle: string; eligible: boolean; reason: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [showThread, setShowThread] = useState(false);

  const setStatus = (next: Status) => startTransition(() => adminSetBookingStatusAction(bookingId, next));

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-forest-900">{listingTitle}</p>
          <p className="text-sm text-forest-800/70">{businessName}</p>
          <p className="text-xs text-forest-800/50">
            {journeyName ?? "General booking"} · ref {bookingRef} ·{" "}
            {new Date(createdAt).toLocaleDateString()}
          </p>
          {(visitDate || partySize) && (
            <p className="text-xs text-forest-800/50">
              {visitDate ? `Visit date ${visitDate}` : ""}
              {visitDate && partySize ? " · " : ""}
              {partySize ? `Party of ${partySize}` : ""}
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
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[status]}`}>
          {status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-forest-900/5 pt-3">
        <div className="text-sm">
          <p className="text-forest-900">{travellerName}</p>
          <p className="text-xs text-forest-800/50">
            {travellerEmail} · est. commission ${Number(commission).toFixed(2)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={pending || status === "confirmed"}
            onClick={() => setStatus("confirmed")}
            className="rounded-full bg-forest-800 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={pending || status === "completed"}
            onClick={() => setStatus("completed")}
            className="rounded-full bg-nile-700 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            Mark completed
          </button>
          <button
            type="button"
            disabled={pending || status === "cancelled"}
            onClick={() => setStatus("cancelled")}
            className="rounded-full border border-red-300 px-2.5 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowThread((v) => !v)}
            className="rounded-full border border-forest-900/15 px-2.5 py-1 text-[11px] font-semibold text-forest-800 hover:bg-forest-900/5"
          >
            {showThread ? "Hide messages" : "Messages"}
          </button>
        </div>
      </div>
      {showThread && (
        <div className="mt-3 border-t border-forest-900/5 pt-3">
          <BookingThread bookingId={bookingId} heading="Booking messages" />
        </div>
      )}
    </div>
  );
}
