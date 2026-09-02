import Link from "next/link";
import { getSupplyLeads } from "@/lib/data/journeys";
import { LeadStatusSelect } from "./lead-status-select";

export default async function SupplyLeadsPage() {
  const rows = await getSupplyLeads();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Supply leads</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Real places referenced in a journey that Wano doesn&apos;t list yet — a provider-acquisition
          queue for ops to chase.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          No open leads right now.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ lead, stop, journey }) => (
            <div key={lead.id} className="flex items-center justify-between gap-4 rounded-xl border border-forest-900/10 bg-white p-4">
              <div>
                <p className="font-medium text-forest-900">{lead.customName}</p>
                {lead.customAddress && <p className="text-xs text-forest-800/60">{lead.customAddress}</p>}
                <p className="mt-1 text-xs text-forest-800/50">
                  From{" "}
                  <Link href={`/admin/journeys/${journey.id}`} className="underline">
                    {journey.name}
                  </Link>
                  {" "}· day {stop.dayNumber}
                </p>
              </div>
              <LeadStatusSelect leadId={lead.id} status={lead.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
