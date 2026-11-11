import Link from "next/link";
import { verifyTicketTokenForVendor } from "@/lib/actions/ticket-actions";
import { TicketCheckInPanel } from "@/app/vendor/dashboard/redeem/tickets/ticket-checkin-panel";

// Outside the vendor-only /vendor/dashboard layout on purpose: this is the
// page a traveller's ticket QR opens directly (see generateTicketQrAction),
// and it needs to work for a staff-link session too, not just a logged-in
// vendor — verifyTicketTokenForVendor itself (requireVendorAccess) is what
// actually gates it.
export default async function TicketScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await verifyTicketTokenForVendor(token);

  return (
    <div className="font-editorial-body bg-paper min-h-screen">
      <div className="mx-auto max-w-md space-y-4 px-4 py-8">
        <Link href={check.backHref} className="eyebrow text-ink/40 hover:text-ink">
          ← Tickets
        </Link>
        <TicketCheckInPanel check={check} bookingId={check.bookingId} />
      </div>
    </div>
  );
}
