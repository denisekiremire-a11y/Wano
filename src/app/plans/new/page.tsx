import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, listings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { kampalaDateIso } from "@/lib/drops";
import { formatKampalaDateTime } from "@/lib/kampala-time";
import { PlanForm } from "@/components/plans/plan-form";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; eventId?: string }>;
}) {
  await requireRole("traveller");
  const { listingId, eventId } = await searchParams;
  const [listing] = listingId
    ? await db.select({ id: listings.id, title: listings.title }).from(listings).where(eq(listings.id, listingId)).limit(1)
    : [];
  const [event] = eventId
    ? await db
        .select({ id: events.id, title: events.title, startAt: events.startAt, location: events.location })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1)
    : [];

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-xl space-y-6 px-4 py-10 md:px-6">
      <div>
        <p className="eyebrow text-ember">New plan</p>
        <h1 className="font-serif-editorial mt-2 text-3xl text-ink">{event?.title ?? listing?.title ?? "Make a plan"}</h1>
        {event && (
          <p className="mt-1 text-sm text-ink/60">
            {formatKampalaDateTime(event.startAt)} · {event.location}
          </p>
        )}
        <p className="mt-2 text-sm text-ink/60">
          After you make it, share the link with friends. A plan doesn&apos;t hold seats: book for the group once you know
          who&apos;s coming.
        </p>
      </div>
      <PlanForm
        listingId={listing?.id}
        eventId={event?.id}
        placeName={event?.title ?? listing?.title}
        defaultDate={kampalaDateIso(new Date())}
      />
    </main>
  );
}
