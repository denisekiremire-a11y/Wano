import Link from "next/link";
import { getAllJourneysForAdmin, journeyHasCostRange } from "@/lib/data/journeys";
import { formatCostRange } from "@/lib/currency";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-forest-100 text-forest-800",
  in_review: "bg-marigold-100 text-marigold-800",
  published: "bg-nile-100 text-nile-800",
  unlisted: "bg-forest-900/10 text-forest-800/60",
  rejected: "bg-red-100 text-red-700",
};

export default async function AdminJourneysPage() {
  const rows = await getAllJourneysForAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Journeys</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          The trip itineraries that thread Explore, Journal, and the booking loop together. A journey
          needs a cost range and at least one stop before it can publish.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map(({ journey, stopCount }) => (
          <Link
            key={journey.id}
            href={`/admin/journeys/${journey.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-forest-900/10 bg-white p-4 hover:border-forest-900/20"
          >
            <div>
              <p className="font-medium text-forest-900">
                {journey.name}
                {journey.isFeatured && <span className="ml-2 text-xs text-marigold-700">★ featured</span>}
              </p>
              <p className="text-xs text-forest-800/50">
                {journey.kind} · {stopCount} {stopCount === 1 ? "stop" : "stops"} ·{" "}
                {journeyHasCostRange(journey)
                  ? formatCostRange(journey.estCostMinMinor!, journey.estCostMaxMinor!, journey.currency)
                  : "no cost range yet"}
              </p>
            </div>
            <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[journey.status] ?? ""}`}>
              {journey.status.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
