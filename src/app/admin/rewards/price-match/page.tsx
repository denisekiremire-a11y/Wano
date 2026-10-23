import Link from "next/link";
import { getPendingPriceMatchReports } from "@/lib/data/price-match";
import { requireAdminPage } from "@/lib/auth";
import { PriceMatchRow } from "./price-match-row";

export default async function PriceMatchReportsPage() {
  await requireAdminPage("/admin/rewards/price-match");
  const reports = await getPendingPriceMatchReports();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">Price match reports</h1>
        <p className="mt-1 text-sm text-ink/60">
          A traveller found a cheaper direct price for a booking they already made. Credit the difference as
          points, or decline if the evidence doesn&apos;t hold up.
        </p>
      </div>

      <div className="space-y-3">
        {reports.length === 0 ? (
          <p className="text-sm text-ink/60">No reports waiting on review.</p>
        ) : (
          reports.map(({ report, bookingRef, travellerName, travellerEmail }) => (
            <PriceMatchRow
              key={report.id}
              reportId={report.id}
              bookingRef={bookingRef}
              travellerName={travellerName}
              travellerEmail={travellerEmail}
              details={report.details}
              createdAt={report.createdAt}
            />
          ))
        )}
      </div>
    </div>
  );
}
