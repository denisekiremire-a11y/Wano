/** Surfaces the vendor's existing accreditation status as a trust badge —
 * no new verification data, just making what's already tracked (KYC review,
 * accreditationStatus) visible to travellers on cards and detail pages. */
export function VerifiedBadge({
  status,
  className = "",
}: {
  status: "pending" | "trusted" | "rejected";
  className?: string;
}) {
  if (status !== "trusted") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-nile-50 px-2 py-0.5 text-[11px] font-medium text-nile-700 ${className}`}
      title="Verified — this business passed Wano's KYC review"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
        <path
          fillRule="evenodd"
          d="M10 1.5l2.2 1.6 2.7-.1 1 2.5 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-1 2.5-2.7-.1L10 18.5l-2.2-1.6-2.7.1-1-2.5-2.2-1.6.8-2.6-.8-2.6 2.2-1.6 1-2.5 2.7.1L10 1.5zm3.7 6.6a.75.75 0 00-1.1-1l-3.6 3.9-1.6-1.6a.75.75 0 00-1 1.1l2.2 2.1c.3.3.8.3 1 0l4.1-4.5z"
          clipRule="evenodd"
        />
      </svg>
      Wano Verified
    </span>
  );
}
