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
        <h1 className="font-serif-editorial text-2xl text-ink">Tickets</h1>
        <p className="mt-1 text-sm text-ink/60">
          A traveller&apos;s camera opens their ticket QR straight to your venue&apos;s check-in page —
          or type their confirmation code in below if a scan fails.
        </p>
        <Link href="/vendor/dashboard/redeem" className="mt-2 inline-block text-sm text-ember hover:underline">
          ← Redeeming a reward voucher instead?
        </Link>
      </div>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Enter a confirmation code</h2>
        <LookupTicketByRef />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">Checked in today</h2>
        {checkedInToday.length === 0 ? (
          <p className="text-sm text-ink/60">No one checked in yet today.</p>
        ) : (
          <div className="border-t border-ink/10">
            {checkedInToday.map((row) => (
              <div key={row.booking.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{row.traveller.displayName}</p>
                  <p className="text-xs text-ink/50">{row.listing?.title ?? row.event?.title}</p>
                </div>
                <p className="font-mono-data text-xs text-ink/50">
                  {row.booking.checkedInAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
