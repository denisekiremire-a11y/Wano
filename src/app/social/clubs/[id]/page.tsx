import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubButton } from "@/components/club-button";
import { PostComposer } from "@/components/post-composer";
import { requireRole } from "@/lib/auth";
import { getClubById, getClubMembers, getMediaPostsFor, isClubMember } from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const { id } = await params;
  const row = await getClubById(id);
  if (!row) notFound();
  const { club, interest, vendorProfile } = row;

  const [members, joined, media] = await Promise.all([
    getClubMembers(club.id),
    isClubMember(travellerProfile.id, club.id),
    getMediaPostsFor({ clubId: club.id }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Link href={`/social/clubs/category/${interest.key}`} className="text-sm text-nile-700 hover:underline">
        ← {interest.label}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">{club.name}</h1>
          <p className="mt-1 text-sm text-forest-800/70">{club.description}</p>
          {vendorProfile && (
            <p className="mt-1 text-xs text-forest-800/50">Run by {vendorProfile.businessName}</p>
          )}
          <p className="mt-1 text-sm text-forest-800/60">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <ClubButton clubId={club.id} initialJoined={joined} />
      </div>

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
