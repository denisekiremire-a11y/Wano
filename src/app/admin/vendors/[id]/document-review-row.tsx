"use client";

import { useTransition } from "react";
import { reviewVendorDocumentAction } from "@/lib/actions/admin-actions";

const docTypeLabels: Record<string, string> = {
  business_registration: "Business registration certificate",
  owner_id: "Owner/manager ID",
  tax_certificate: "Tax certificate",
  other: "Other",
};

const statusStyles: Record<string, string> = {
  pending: "bg-marigold-100 text-marigold-800",
  approved: "bg-forest-100 text-forest-800",
  rejected: "bg-red-100 text-red-700",
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
    <div className="flex items-center justify-between rounded-xl border border-forest-900/10 p-3">
      <div>
        <p className="text-sm font-medium text-forest-900">{docTypeLabels[docType] ?? docType}</p>
        <a
          href={`/api/vendor-documents/${documentId}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-nile-700 hover:underline"
        >
          {fileName ?? "View document"}
        </a>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]}`}>
          {status}
        </span>
        <button
          type="button"
          disabled={pending || status === "approved"}
          onClick={() => startTransition(() => reviewVendorDocumentAction(documentId, "approved"))}
          className="rounded-full bg-forest-800 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
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
