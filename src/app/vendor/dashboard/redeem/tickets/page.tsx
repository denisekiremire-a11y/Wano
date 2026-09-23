import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getVendorProfileByUserId, getVendorTicketCheckInsToday } from "@/lib/data/vendor";
import { LookupTicketByRef } from "./lookup-ticket-by-ref";

export default async function VendorTicketsPage() {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return null;

  const checkedInToday = await getVendorTicketCheckInsToday(vendorProfile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Tickets</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          A traveller&apos;s camera opens their ticket QR straight to your venue&apos;s check-in page —
          or type their confirmation code in below if a scan fails.
        </p>
        <Link href="/vendor/dashboard/redeem" className="mt-2 inline-block text-sm text-nile-700 hover:underline">
          ← Redeeming a reward voucher instead?
        </Link>
      </div>

      <section className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Enter a confirmation code</h2>
        <LookupTicketByRef />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Checked in today</h2>
        {checkedInToday.length === 0 ? (
          <p className="text-sm text-forest-800/60">No one checked in yet today.</p>
        ) : (
          checkedInToday.map((row) => (
            <div
              key={row.booking.id}
              className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-forest-900">{row.traveller.displayName}</p>
                <p className="text-xs text-forest-800/50">{row.listing?.title ?? row.event?.title}</p>
              </div>
              <p className="text-xs text-forest-800/50">
                {row.booking.checkedInAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
