import Link from "next/link";
import { verifyTicketTokenForVendor } from "@/lib/actions/ticket-actions";
import { TicketCheckInPanel } from "../../ticket-checkin-panel";

export default async function TicketTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await verifyTicketTokenForVendor(token);

  return (
    <div className="mx-auto max-w-md space-y-4 py-6">
      <Link href="/vendor/dashboard/redeem/tickets" className="text-sm text-forest-700 hover:underline">
        ← Tickets
      </Link>
      <TicketCheckInPanel check={check} bookingId={check.bookingId} />
    </div>
  );
}
