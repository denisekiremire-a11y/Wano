import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubButton } from "@/components/club-button";
import { CornerMarks } from "@/components/corner-marks";
import { EventCard } from "@/components/event-card";
import { PostComposer } from "@/components/post-composer";
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
    <main className="font-editorial-body mx-auto max-w-2xl bg-paper px-4 py-8 md:px-6">
      <Link href={`/social/clubs/category/${interest.key}`} className="eyebrow text-ink/40 hover:text-ink">
        ← {interest.label}
      </Link>

      {club.coverImage && (
        <div className="relative mt-4 aspect-[16/9] overflow-hidden border border-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={club.coverImage} alt="" className="h-full w-full object-cover" />
          <CornerMarks className="text-white/70" />
        </div>
      )}

      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-editorial text-4xl text-ink md:text-5xl">{club.name}</h1>
          <p className="mt-2 max-w-xl text-ink/60">{club.description}</p>
          <p className="font-mono-data mt-3 text-[11px] uppercase tracking-[0.15em] text-ink/40">
            {[
              vendorProfile ? `Run by ${vendorProfile.businessName}` : null,
              club.city,
              club.cadence,
              `${members.length} ${members.length === 1 ? "member" : "members"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <ClubButton clubId={club.id} initialJoined={joined} />
      </div>

      {host && (
        <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="eyebrow text-ink/40">Hosted by</p>
          <p className="mt-1 text-sm font-medium text-ink">{host.name}</p>
        </div>
      )}

      {joined && club.whatsappInviteUrl && (
        <a
          href={club.whatsappInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block border border-ink/20 bg-ink/5 p-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink/10"
        >
          Join the WhatsApp group →
        </a>
      )}

      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="font-serif-editorial text-2xl text-ink">Next meetup</h2>
        {meetups.upcoming.length === 0 ? (
          <p className="mt-4 border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
            No meetup scheduled right now.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {meetups.upcoming.map((event) => (
              <EventCard key={event.id} event={event} counts={meetupCounts.get(event.id)} />
            ))}
          </div>
        )}
        {meetups.past.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-ink/60 hover:text-ink">
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

      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="font-serif-editorial text-2xl text-ink">Members</h2>
        {members.length === 0 ? (
          <p className="mt-4 border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
            No members yet — be the first to join.
          </p>
        ) : (
          <div className="mt-4 border-t border-ink/10">
            {members.map(({ traveller, user }) => (
              <div key={traveller.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{traveller.displayName}</p>
                  <p className="text-xs text-ink/40">@{user.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="font-serif-editorial text-2xl text-ink">Media</h2>
        <p className="mt-1 text-sm text-ink/50">Photos and moments shared by members.</p>
        {joined && (
          <div className="mt-3">
            <PostComposer
              presetContext={{ type: "club", id: club.id, label: club.name }}
              presetAudienceClubId={club.id}
              placeholder={`Share something with ${club.name}…`}
            />
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {media.length === 0 ? (
            <p className="col-span-full border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
              No media yet.
            </p>
          ) : (
            media.map(({ post, authorName, authorUsername }) => (
              <div key={post.id} className="overflow-hidden border border-ink/10 bg-white">
                {post.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.imageUrl} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-3">
                  <p className="text-sm text-ink/80">{post.content}</p>
                  <p className="mt-1 text-xs text-ink/40">
                    {authorName}
                    {authorUsername ? ` · @${authorUsername}` : ""}
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
