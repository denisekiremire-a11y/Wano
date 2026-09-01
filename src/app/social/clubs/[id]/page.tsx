import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubButton } from "@/components/club-button";
import { EventCard } from "@/components/event-card";
import { PostComposer } from "@/components/post-composer";
import { UserIcon } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getAttendanceCounts } from "@/lib/data/events";
import { getClubById, getClubMeetups, getClubMembers, getMediaPostsFor, isClubMember } from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const { id } = await params;
  const row = await getClubById(id);
  if (!row) notFound();
  const { club, interest, vendorProfile, host } = row;

  const [members, joined, media, meetups] = await Promise.all([
    getClubMembers(club.id),
    isClubMember(travellerProfile.id, club.id),
    getMediaPostsFor({ clubId: club.id }),
    getClubMeetups(club.id),
  ]);
  const meetupCounts = await getAttendanceCounts([...meetups.upcoming, ...meetups.past].map((e) => e.id));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Link href={`/social/clubs/category/${interest.key}`} className="text-sm text-nile-700 hover:underline">
        ← {interest.label}
      </Link>

      {club.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.coverImage} alt="" className="mt-3 h-40 w-full rounded-2xl object-cover" />
      )}

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">{club.name}</h1>
          <p className="mt-1 text-sm text-forest-800/70">{club.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest-800/50">
            {vendorProfile && <span>Run by {vendorProfile.businessName}</span>}
            {club.city && <span>{club.city}</span>}
            {club.cadence && <span>{club.cadence}</span>}
            <span>
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
        <ClubButton clubId={club.id} initialJoined={joined} />
      </div>

      {host && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-forest-900/10 bg-white p-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-forest-100 text-forest-600">
            <UserIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-forest-800/50">Hosted by</p>
            <p className="text-sm font-medium text-forest-900">{host.name}</p>
          </div>
        </div>
      )}

      {joined && club.whatsappInviteUrl && (
        <a
          href={club.whatsappInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-xl border border-forest-700 bg-forest-50 p-3 text-center text-sm font-semibold text-forest-800 hover:bg-forest-100"
        >
          Join the WhatsApp group →
        </a>
      )}

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Next meetup</h2>
        {meetups.upcoming.length === 0 ? (
          <p className="mt-2 rounded-xl border border-forest-900/10 bg-white p-4 text-sm text-forest-800/60">
            No meetup scheduled right now.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {meetups.upcoming.map((event) => (
              <EventCard key={event.id} event={event} counts={meetupCounts.get(event.id)} />
            ))}
          </div>
        )}
        {meetups.past.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-forest-800/70">
              Past meetups ({meetups.past.length})
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {meetups.past.map((event) => (
                <EventCard key={event.id} event={event} counts={meetupCounts.get(event.id)} />
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Members</h2>
        <div className="mt-3 space-y-2">
          {members.length === 0 ? (
            <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
              No members yet — be the first to join.
            </p>
          ) : (
            members.map(({ traveller, user }) => (
              <div
                key={traveller.id}
                className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-medium text-forest-900">{traveller.displayName}</p>
                  <p className="text-xs text-forest-800/50">@{user.username}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-forest-900">Media</h2>
        <p className="mt-1 text-sm text-forest-800/60">Photos and moments shared by members.</p>
        {joined && (
          <div className="mt-3">
            <PostComposer clubId={club.id} placeholder={`Share something with ${club.name}…`} />
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
    </main>
  );
}
