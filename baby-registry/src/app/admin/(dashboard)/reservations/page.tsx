import type { Metadata } from "next";
import { ReservationsManager } from "@/components/admin/ReservationsManager";
import { requireAdmin } from "@/lib/admin";
import { loadEvents, loadReservations } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Reservations" };

export default async function ReservationsPage() {
  const { supabase } = await requireAdmin();
  const [reservations, events] = await Promise.all([loadReservations(supabase), loadEvents(supabase, 5000)]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl">Reservations</h1>
        <p className="text-sm text-muted">Guest details are private — only administrators can see this page.</p>
      </div>
      <ReservationsManager reservations={reservations} events={events} />
    </div>
  );
}
