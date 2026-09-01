"use client";

import Link from "next/link";
import { useTransition } from "react";
import { reviewClubAction } from "@/lib/actions/club-actions";

const statusStyles: Record<string, string> = {
  pending: "bg-marigold-100 text-marigold-800",
  approved: "bg-forest-100 text-forest-800",
  rejected: "bg-red-100 text-red-700",
};

export function ClubReviewRow({
  clubId,
  name,
  description,
  interestLabel,
  vendorBusinessName,
  status,
}: {
  clubId: string;
  name: string;
  description: string;
  interestLabel: string;
  vendorBusinessName: string | null;
  status: "pending" | "approved" | "rejected";
}) {
  return (
    <Link
      href={`/admin/clubs/${clubId}`}
      className="flex items-start justify-between gap-3 rounded-xl border border-forest-900/10 p-3 hover:border-forest-900/20"
    >
      <div>
        <p className="text-sm font-medium text-forest-900">{name}</p>
        <p className="text-xs text-forest-800/50">
          {interestLabel}
          {vendorBusinessName ? ` · Run by ${vendorBusinessName}` : ""}
        </p>
        <p className="mt-1 text-xs text-forest-800/70">{description}</p>
      </div>
      <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}>
        {status}
      </span>
    </Link>
  );
}

/** Lives on the club's own admin detail page — approve is disabled until
 * the club has a host and an upcoming meetup (see reviewClubAction, which
 * enforces the same rule server-side as a backstop). */
export function ApproveRejectRow({
  clubId,
  status,
  ready,
  host,
}: {
  clubId: string;
  status: "pending" | "approved" | "rejected";
  ready: boolean;
  host: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-4">
      <div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}>{status}</span>
        {!ready && status !== "approved" && (
          <p className="mt-1 text-xs text-forest-800/60">
            {!host
              ? "Assign a host and schedule an upcoming meetup before publishing."
              : "Schedule an upcoming meetup before publishing."}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || status === "approved" || !ready}
          onClick={() => startTransition(() => reviewClubAction(clubId, "approved"))}
          className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Approve & publish
        </button>
        <button
          type="button"
          disabled={pending || status === "rejected"}
          onClick={() => startTransition(() => reviewClubAction(clubId, "rejected"))}
          className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
