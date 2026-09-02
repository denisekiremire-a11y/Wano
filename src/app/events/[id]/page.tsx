import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceButtons } from "@/components/attendance-buttons";
import { CalendarIcon } from "@/components/icons";
import { PostComposer } from "@/components/post-composer";
import {
  getAttendanceCounts,
  getEventAttendees,
  getEventById,
  getFollowedAttendees,
  getMyAttendance,
} from "@/lib/data/events";
import { getMediaPostsFor } from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getSession } from "@/lib/session";

function formatEventWhen(startAt: Date, endAt: Date | null) {
  const start = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(startAt);
  if (!endAt) return start;
  const end = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(endAt);
  return `${start} – ${end}`;
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getEventById(id);
  if (!row) notFound();
  const { event, organizer } = row;

  const [session, counts] = await Promise.all([getSession(), getAttendanceCounts([event.id])]);
  const attendanceCounts = counts.get(event.id) ?? { going: 0, interested: 0, maybe: 0 };

  let myStatus = null;
  let followedGoing: { name: string; status: string }[] = [];
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const [mine, followed] = await Promise.all([
        getMyAttendance(event.id, travellerProfile.id),
        getFollowedAttendees(event.id, travellerProfile.id),
      ]);
      myStatus = mine?.status ?? null;
      followedGoing = followed;
    }
  }

  const [attendees, media] = await Promise.all([getEventAttendees(event.id), getMediaPostsFor({ eventId: event.id })]);

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-nile-900 via-forest-800 to-marigold-600 py-16 text-white">
        <div className="relative mx-auto max-w-3xl px-4 md:px-6">
          <Link href="/events" className="text-sm text-white/80 hover:underline">
            ← All events
          </Link>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium capitalize">
            <CalendarIcon className="h-3.5 w-3.5" />
            {event.category}
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-5xl">{event.title}</h1>
          <p className="mt-2 text-white/90">{formatEventWhen(new Date(event.startAt), event.endAt ? new Date(event.endAt) : null)}</p>
          <p className="text-white/80">{event.location}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <p className="max-w-2xl text-forest-800/80">{event.description}</p>
        {organizer && (
          <p className="mt-2 text-sm text-forest-800/60">Hosted by {organizer.businessName}</p>
        )}
        <p className="mt-2 font-medium text-nile-700">{event.priceHint ?? "Free to attend"}</p>

        <div className="mt-6">
          {session?.role === "traveller" ? (
            <AttendanceButtons eventId={event.id} initialStatus={myStatus} />
          ) : (
            <Link
              href={`/login?next=/events/${event.id}`}
              className="inline-flex rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Log in to RSVP
            </Link>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">Who&apos;s going?</h2>
          <p className="mt-1 text-sm text-forest-800/60">
            {attendanceCounts.going} going · {attendanceCounts.interested} interested ·{" "}
            {attendanceCounts.maybe} maybe
          </p>
          {followedGoing.length > 0 && (
            <p className="mt-2 text-sm font-medium text-forest-800">
              {followedGoing.length} people you follow are {followedGoing[0].status}
            </p>
          )}
          {attendees.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {attendees.slice(0, 20).map((a, i) => (
                <li
                  key={i}
                  className="rounded-full bg-forest-50 px-3 py-1 text-xs font-medium capitalize text-forest-800"
                >
                  {a.displayName} · {a.status}
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">What people are saying</h2>
          <p className="mt-1 text-sm text-forest-800/60">Posts and moments shared by attendees.</p>
          {session?.role === "traveller" && (
            <div className="mt-3">
              <PostComposer
                presetContext={{ type: "event", id: event.id, label: event.title }}
                placeholder={`Share something about ${event.title}…`}
              />
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {media.length === 0 ? (
              <p className="col-span-full rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
                No media yet.
              </p>
            ) : (
              media.map(({ post, authorUser, author }) => (
                <div key={post.id} className="overflow-hidden rounded-xl border border-forest-900/10 bg-white">
                  {post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrl} alt="" className="h-40 w-full object-cover" />
                  )}
                  <div className="p-3">
                    <p className="text-sm text-forest-800/90">{post.content}</p>
                    <p className="mt-1 text-xs text-forest-800/50">
                      {author.displayName} · @{authorUser.username}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
