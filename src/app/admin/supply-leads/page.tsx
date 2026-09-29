import Link from "next/link";
import { getSupplyLeads } from "@/lib/data/journeys";
import { requireAdminPage } from "@/lib/auth";
import { LeadStatusSelect } from "./lead-status-select";

export default async function SupplyLeadsPage() {
  await requireAdminPage("/admin/supply-leads");
  const rows = await getSupplyLeads();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink md:text-3xl">Supply leads</h1>
        <p className="mt-1 text-sm text-ink/60">
          Real places referenced in a journey that Wano doesn&apos;t list yet — a provider-acquisition
          queue for ops to chase.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
          No open leads right now.
        </p>
      ) : (
        <div className="border-t border-ink/10">
          {rows.map(({ lead, stop, journey }) => (
            <div key={lead.id} className="flex items-center justify-between gap-4 border-b border-ink/10 py-4">
              <div>
                <p className="font-medium text-ink">{lead.customName}</p>
                {lead.customAddress && <p className="text-xs text-ink/60">{lead.customAddress}</p>}
                <p className="mt-1 text-xs text-ink/50">
                  From{" "}
                  <Link href={`/admin/journeys/${journey.id}`} className="text-ember hover:underline">
                    {journey.name}
                  </Link>
                  {" "}· day <span className="font-mono-data">{stop.dayNumber}</span>
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
