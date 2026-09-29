"use client";

import { useTransition } from "react";
import { reviewVendorDocumentAction } from "@/lib/actions/admin-actions";

const docTypeLabels: Record<string, string> = {
  business_registration: "Business registration certificate",
  owner_id: "Owner/manager ID",
  tax_certificate: "Tax certificate",
  other: "Other",
};

const statusTextStyles: Record<string, string> = {
  pending: "text-ember",
  approved: "text-ink",
  rejected: "text-red-600",
};

export function DocumentReviewRow({
  documentId,
  docType,
  fileName,
  status,
}: {
  documentId: string;
  docType: string;
  fileName: string | null;
  status: "pending" | "approved" | "rejected";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-4 border border-ink/10 p-3">
      <div>
        <p className="text-sm font-medium text-ink">{docTypeLabels[docType] ?? docType}</p>
        <a
          href={`/api/vendor-documents/${documentId}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ember hover:underline"
        >
          {fileName ?? "View document"}
        </a>
      </div>
      <div className="flex items-center gap-2">
        <span className={`eyebrow ${statusTextStyles[status]}`}>{status}</span>
        <button
          type="button"
          disabled={pending || status === "approved"}
          onClick={() => startTransition(() => reviewVendorDocumentAction(documentId, "approved"))}
          className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending || status === "rejected"}
          onClick={() => startTransition(() => reviewVendorDocumentAction(documentId, "rejected"))}
          className="rounded-full border border-red-300 px-2.5 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
