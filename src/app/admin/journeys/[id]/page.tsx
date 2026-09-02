import Link from "next/link";
import { notFound } from "next/navigation";
import { getJourneyById, getJourneyStops, getListingOptions, journeyHasCostRange } from "@/lib/data/journeys";
import { formatMinor } from "@/lib/currency";
import { JourneyDetailsForm } from "./journey-details-form";
import { StopForm } from "./stop-form";
import { PublishControls } from "./publish-controls";
import { DeleteStopButton } from "./delete-stop-button";

const STOP_TYPE_LABEL: Record<string, string> = {
  stay: "🛏️ Stay",
  do: "🎟️ Do",
  eat: "🍽️ Eat",
  move: "🚗 Move",
  rest: "🧘 Rest",
};

export default async function AdminJourneyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const journey = await getJourneyById(id);
  if (!journey) notFound();

  const [stops, listingOptions] = await Promise.all([getJourneyStops(id), getListingOptions()]);

  const stopsByDay = new Map<number, typeof stops>();
  for (const row of stops) {
    const list = stopsByDay.get(row.stop.dayNumber) ?? [];
    list.push(row);
    stopsByDay.set(row.stop.dayNumber, list);
  }
  const days = [...stopsByDay.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/journeys" className="text-xs text-forest-800/60 hover:underline">
          ← All journeys
        </Link>
        <div className="mt-1 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-forest-900">{journey.name}</h1>
            <p className="text-sm text-forest-800/60">
              /journeys/{journey.slug} · {journey.kind} · {journey.status.replace("_", " ")}
              {!journeyHasCostRange(journey) && " · needs a cost range"}
              {stops.length === 0 && " · needs at least one stop"}
            </p>
          </div>
          <PublishControls journeyId={journey.id} status={journey.status} />
        </div>
      </div>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Details</h2>
        <JourneyDetailsForm
          journeyId={journey.id}
          initial={{
            region: journey.region ?? "",
            city: journey.city ?? "",
            durationDays: journey.durationDays?.toString() ?? "",
            budgetBand: journey.budgetBand ?? "",
            estCostMinMinor: journey.estCostMinMinor?.toString() ?? "",
            estCostMaxMinor: journey.estCostMaxMinor?.toString() ?? "",
            currency: journey.currency,
            bestSeason: journey.bestSeason ?? "",
            difficulty: journey.difficulty ?? "",
            isFeatured: journey.isFeatured,
          }}
        />
      </section>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Stops</h2>
        <div className="mt-3 space-y-4">
          {days.length === 0 && <p className="text-sm text-forest-800/60">No stops yet.</p>}
          {days.map((day) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-800/50">Day {day}</p>
              <div className="mt-2 space-y-2">
                {stopsByDay.get(day)!.map(({ stop, listing, event }) => (
                  <div
                    key={stop.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-forest-900/10 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-forest-900">
                        {STOP_TYPE_LABEL[stop.stopType] ?? stop.stopType}{" "}
                        {listing?.title ?? event?.title ?? stop.customName ?? "Untitled stop"}
                      </p>
                      {stop.note && <p className="mt-0.5 text-xs text-forest-800/60">{stop.note}</p>}
                      <p className="mt-0.5 text-[11px] text-forest-800/40">
                        {!listing && !event && "custom place — supply lead created"}
                        {stop.durationMinutes ? ` · ${stop.durationMinutes} min` : ""}
                        {stop.estCostMinor != null ? ` · ${formatMinor(stop.estCostMinor, journey.currency)}` : ""}
                      </p>
                    </div>
                    <DeleteStopButton journeyId={journey.id} stopId={stop.id} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <StopForm journeyId={journey.id} listingOptions={listingOptions} />
        </div>
      </section>
    </div>
  );
}
