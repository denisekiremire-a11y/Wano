"use client";

import Link from "next/link";
import { useTransition } from "react";
import { reviewClubAction } from "@/lib/actions/club-actions";

const statusStyles: Record<string, string> = {
  pending: "text-ember",
  approved: "text-ink",
  rejected: "text-red-600",
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
      className="flex items-start justify-between gap-3 border border-ink/10 p-3 transition-colors hover:border-ink/20"
    >
      <div>
        <p className="text-sm font-medium text-ink">{name}</p>
        <p className="text-xs text-ink/50">
          {interestLabel}
          {vendorBusinessName ? ` · Run by ${vendorBusinessName}` : ""}
        </p>
        <p className="mt-1 text-xs text-ink/70">{description}</p>
      </div>
      <span className={`eyebrow flex-none ${statusStyles[status]}`}>{status}</span>
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
    <div className="flex items-center justify-between border border-ink/10 bg-white p-4">
      <div>
        <span className={`eyebrow ${statusStyles[status]}`}>{status}</span>
        {!ready && status !== "approved" && (
          <p className="mt-1 text-xs text-ink/60">
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
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-40"
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
