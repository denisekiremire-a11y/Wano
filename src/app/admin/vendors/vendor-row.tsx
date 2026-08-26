import Link from "next/link";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";

const statusStyles = {
  trusted: "bg-forest-100 text-forest-800",
  pending: "bg-marigold-100 text-marigold-800",
  rejected: "bg-red-100 text-red-700",
} as const;

export function VendorRow({
  vendorProfileId,
  businessName,
  contactEmail,
  location,
  status,
  listingType,
  journeyNames,
  pendingDocCount,
}: {
  vendorProfileId: string;
  businessName: string;
  contactEmail: string;
  location: string;
  status: "trusted" | "pending" | "rejected";
  listingType: ListingType | null;
  journeyNames: string[];
  pendingDocCount: number;
}) {
  return (
    <Link
      href={`/admin/vendors/${vendorProfileId}`}
      className="flex flex-col gap-3 rounded-2xl border border-forest-900/10 bg-white p-4 transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-medium text-forest-900">{businessName}</p>
        <p className="text-sm text-forest-800/60">
          {listingType ? listingTypeLabels[listingType] : "No listing yet"} · {location}
          {journeyNames.length > 0 && ` · ${journeyNames.join(", ")}`}
        </p>
        <p className="text-xs text-forest-800/45">{contactEmail}</p>
      </div>
      <div className="flex items-center gap-2">
        {pendingDocCount > 0 && (
          <span className="rounded-full bg-nile-100 px-2.5 py-1 text-xs font-medium text-nile-800">
            {pendingDocCount} doc{pendingDocCount === 1 ? "" : "s"} to review
          </span>
        )}
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
          {status}
        </span>
      </div>
    </Link>
  );
}
