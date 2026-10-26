/** Admin-set "Best Price on Wano" flag on a vendor (vendorProfiles.bestPriceOnWano)
 * — surfaced the same way VerifiedBadge surfaces accreditation. */
export function BestPriceBadge({ show, className = "" }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-ember/10 px-2 py-0.5 text-[11px] font-medium text-ember ${className}`}
      title="Wano has confirmed this is the best price available for this listing"
    >
      Best Price on Wano
    </span>
  );
}
