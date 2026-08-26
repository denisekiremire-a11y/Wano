"use client";

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
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-forest-900/10 p-3">
      <div>
        <p className="text-sm font-medium text-forest-900">{name}</p>
        <p className="text-xs text-forest-800/50">
          {interestLabel}
          {vendorBusinessName ? ` · Run by ${vendorBusinessName}` : ""}
        </p>
        <p className="mt-1 text-xs text-forest-800/70">{description}</p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}>
          {status}
        </span>
        <button
          type="button"
          disabled={pending || status === "approved"}
          onClick={() => startTransition(() => reviewClubAction(clubId, "approved"))}
          className="rounded-full bg-forest-800 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending || status === "rejected"}
          onClick={() => startTransition(() => reviewClubAction(clubId, "rejected"))}
          className="rounded-full border border-red-300 px-2.5 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
