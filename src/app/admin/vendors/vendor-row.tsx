import Link from "next/link";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";

const statusTextStyles = {
  trusted: "text-ink",
  pending: "text-ember",
  rejected: "text-red-600",
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
      className="flex flex-col gap-3 border border-ink/10 bg-white p-4 transition-colors hover:border-ink/25 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-medium text-ink">{businessName}</p>
        <p className="text-sm text-ink/60">
          {listingType ? listingTypeLabels[listingType] : "No listing yet"} · {location}
          {journeyNames.length > 0 && ` · ${journeyNames.join(", ")}`}
        </p>
        <p className="text-xs text-ink/45">{contactEmail}</p>
      </div>
      <div className="flex items-center gap-3">
        {pendingDocCount > 0 && (
          <span className="eyebrow text-ember">
            {pendingDocCount} doc{pendingDocCount === 1 ? "" : "s"} to review
          </span>
        )}
        <span className={`eyebrow ${statusTextStyles[status]}`}>{status}</span>
      </div>
    </Link>
  );
}
