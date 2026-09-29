import Link from "next/link";
import { getAllJourneysForAdmin, journeyHasCostRange } from "@/lib/data/journeys";
import { formatCostRange } from "@/lib/currency";
import { requireAdminPage } from "@/lib/auth";

const STATUS_STYLE: Record<string, string> = {
  draft: "text-ink/40",
  in_review: "text-ember",
  published: "text-ink",
  unlisted: "text-ink/30",
  rejected: "text-red-600",
};

export default async function AdminJourneysPage() {
  await requireAdminPage("/admin/journeys");
  const rows = await getAllJourneysForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Journeys</h1>
        <p className="mt-1 text-sm text-ink/60">
          The trip itineraries that thread Explore, Journal, and the booking loop together. A journey
          needs a cost range and at least one stop before it can publish.
        </p>
      </div>

      <div className="border-t border-ink/10">
        {rows.map(({ journey, stopCount }) => (
          <Link
            key={journey.id}
            href={`/admin/journeys/${journey.id}`}
            className="flex items-center justify-between gap-4 border-b border-ink/10 py-4 transition-colors hover:text-ember"
          >
            <div>
              <p className="text-ink">
                {journey.name}
                {journey.isFeatured && <span className="eyebrow ml-2 text-ember">Featured</span>}
              </p>
              <p className="font-mono-data mt-0.5 text-xs text-ink/50">
                {journey.kind} · {stopCount} {stopCount === 1 ? "stop" : "stops"} ·{" "}
                {journeyHasCostRange(journey)
                  ? formatCostRange(journey.estCostMinMinor!, journey.estCostMaxMinor!, journey.currency)
                  : "no cost range yet"}
              </p>
            </div>
            <span className={`eyebrow flex-none ${STATUS_STYLE[journey.status] ?? "text-ink/40"}`}>
              {journey.status.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
