"use client";

import { useTransition } from "react";
import { respondToBookingAction } from "@/lib/actions/vendor-booking-actions";

const statusStyles: Record<string, string> = {
  pending: "bg-marigold-100 text-marigold-800",
  confirmed: "bg-forest-100 text-forest-800",
  completed: "bg-forest-100 text-forest-800",
  cancelled: "bg-red-100 text-red-700",
};

export function BookingRow({
  bookingId,
  travellerName,
  travellerEmail,
  journeyName,
  bookingRef,
  status,
  visitDate,
  partySize,
  birthdayInfo,
}: {
  bookingId: string;
  travellerName: string;
  travellerEmail: string;
  journeyName: string | null;
  bookingRef: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  visitDate?: string | null;
  partySize?: number | null;
  birthdayInfo?: { perkTitle: string; eligible: boolean; reason: string } | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-forest-900/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-forest-900">{travellerName}</p>
        <p className="text-sm text-forest-800/60">
          {journeyName ?? "General booking"} · ref {bookingRef}
        </p>
        <p className="text-xs text-forest-800/45">{travellerEmail}</p>
        {(visitDate || partySize) && (
          <p className="mt-1 text-xs text-forest-800/50">
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
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[status]}`}>
          {status}
        </span>
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
      </div>
    </div>
  );
}
