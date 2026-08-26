import Link from "next/link";
import { CalendarIcon } from "@/components/icons";
import type { events } from "@/db/schema";
import type { AttendanceCounts } from "@/lib/data/events";

type Event = typeof events.$inferSelect;

function formatEventWhen(startAt: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(startAt);
}

export function EventCard({
  event,
  organizerName,
  counts,
}: {
  event: Event;
  organizerName?: string | null;
  counts?: AttendanceCounts;
}) {
  const going = counts?.going ?? 0;
  return (
    <Link
      href={`/events/${event.id}`}
      className="block overflow-hidden rounded-2xl border border-forest-900/10 bg-white transition hover:shadow-md"
    >
      <div className="flex h-20 items-center justify-center bg-gradient-to-br from-nile-800 via-forest-700 to-marigold-500">
        <CalendarIcon className="h-7 w-7 text-white/80" />
      </div>
      <div className="p-4">
        <span className="inline-flex rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-medium capitalize text-forest-700">
          {event.category}
        </span>
        <p className="mt-1.5 font-display text-lg font-semibold text-forest-900">{event.title}</p>
        <p className="text-sm text-forest-800/70">{formatEventWhen(new Date(event.startAt))}</p>
        <p className="text-xs text-forest-800/50">{event.location}</p>
        {organizerName && <p className="mt-1 text-xs text-forest-800/50">Hosted by {organizerName}</p>}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-medium text-nile-700">{event.priceHint ?? "Free"}</p>
          {going > 0 && (
            <p className="text-xs font-medium text-forest-800/60">
              {going} going
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
