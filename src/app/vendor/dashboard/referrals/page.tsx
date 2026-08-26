import Link from "next/link";
import { getVendorProfileByUserId, getVendorReferralStats } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";

export default async function VendorReferralsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const stats = await getVendorReferralStats(vendorProfile.id);

  const cards = [
    { label: "Confirmed bookings", value: stats.totalBookings },
    { label: "Estimated commission owed", value: `$${stats.totalCommission.toFixed(2)}` },
    { label: "Listing views", value: stats.totalViews },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Referral stats</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Bookings made through Wano for your listing. Fulfillment happens directly
          between you and the member — this is the referral and commission record. Only
          confirmed bookings count toward commission owed.
        </p>
      </div>

      {stats.pendingCount > 0 && (
        <Link
          href="/vendor/dashboard/bookings"
          className="block rounded-xl border border-marigold-300 bg-marigold-50 p-4 text-sm text-marigold-900 hover:bg-marigold-100"
        >
          {stats.pendingCount} booking request{stats.pendingCount === 1 ? "" : "s"} waiting on your
          response →
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-forest-900/10 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-forest-800/50">
              {card.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-forest-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
