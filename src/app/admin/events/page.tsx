import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { events, vendorProfiles } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { formatKampalaDateTime } from "@/lib/kampala-time";
import { CreateListedEventForm } from "./create-listed-event-form";
import { EndSeriesButton } from "./end-series-button";

export default async function AdminEventsPage() {
  await requireAdminPage("/admin/events");

  const [upcoming, vendors] = await Promise.all([
    db
      .select({ event: events, organizer: vendorProfiles.businessName })
      .from(events)
      .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
      .where(and(eq(events.active, true), gte(events.startAt, new Date())))
      .orderBy(asc(events.startAt))
      .limit(200),
    db
      .select({ id: vendorProfiles.id, name: vendorProfiles.businessName })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.accreditationStatus, "trusted"))
      .orderBy(asc(vendorProfiles.businessName)),
  ]);

  // A weekly regular shows once, with its next date and how many are left.
  const seen = new Map<string, number>();
  for (const row of upcoming) {
    if (row.event.seriesId) seen.set(row.event.seriesId, (seen.get(row.event.seriesId) ?? 0) + 1);
  }
  const shownSeries = new Set<string>();
  const rows = upcoming.filter((row) => {
    if (!row.event.seriesId) return true;
    if (shownSeries.has(row.event.seriesId)) return false;
    shownSeries.add(row.event.seriesId);
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Events</h1>
        <p className="mt-1 text-sm text-ink/60">
          Everything here can appear in &ldquo;Kampala, today&rdquo; on the home page. Add weekly regulars (quiz
          nights, live bands, Sunday brunch) so every day has something on. Times are Kampala time.
        </p>
      </div>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">New event</h2>
        <CreateListedEventForm vendors={vendors} />
      </section>

      <div className="border-t border-ink/10">
        {rows.map(({ event, organizer }) => (
          <div key={event.id} className="flex items-center justify-between gap-4 border-b border-ink/10 py-4">
            <div>
              <p className="text-ink">{event.title}</p>
              <p className="font-mono-data mt-0.5 text-xs text-ink/50">
                {event.seriesId ? "Next: " : ""}
                {formatKampalaDateTime(new Date(event.startAt))} · {event.location} ·{" "}
                {organizer ?? "Wano pick"}
                {event.seriesId ? ` · weekly, ${seen.get(event.seriesId)} dates left` : ""}
              </p>
            </div>
            {event.seriesId && <EndSeriesButton seriesId={event.seriesId} />}
          </div>
        ))}
        {rows.length === 0 && <p className="py-6 text-sm text-ink/60">No upcoming events yet.</p>}
      </div>
    </div>
  );
}
