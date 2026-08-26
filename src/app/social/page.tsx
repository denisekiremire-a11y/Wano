import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { requireRole } from "@/lib/auth";
import {
  getClubs,
  getCommentsForPost,
  getEngagementCounts,
  getFeedPosts,
  getLikedPostIds,
  getSuggestedPeople,
  isFollowing,
} from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { FollowButton } from "@/components/follow-button";
import { ClubButton } from "@/components/club-button";

export default async function SocialPage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const feed = await getFeedPosts();
  const postIds = feed.map((f) => f.post.id);
  const [{ likeMap, commentMap }, likedIds, suggested, clubs] = await Promise.all([
    getEngagementCounts(postIds),
    getLikedPostIds(travellerProfile.id, postIds),
    getSuggestedPeople(travellerProfile.id),
    getClubs(travellerProfile.id),
  ]);

  const commentsByPost = await Promise.all(
    feed.map((f) => getCommentsForPost(f.post.id).then((comments) => [f.post.id, comments] as const)),
  );
  const commentsMap = new Map(commentsByPost);

  const suggestedWithFollow = await Promise.all(
    suggested.map(async (s) => ({
      ...s,
      following: await isFollowing(travellerProfile.id, s.traveller.id),
    })),
  );

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:grid-cols-[1fr_260px] md:px-6">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Social</h1>
          <p className="mt-1 text-sm text-forest-800/60">
            See what people are up to across Wano — book, review, and share your own moments.
          </p>
        </div>

        <PostComposer />

        <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
          <h2 className="font-display text-sm font-semibold text-forest-900">Wano Clubs</h2>
          <p className="mt-0.5 text-xs text-forest-800/60">Find your people — join a club by interest.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {clubs.map(({ interest, memberCount, joined }) => (
              <div
                key={interest.id}
                className="flex items-center gap-2 rounded-full border border-forest-900/10 bg-forest-50/50 py-1 pr-1 pl-3"
              >
                <Link href={`/social/clubs/${interest.key}`} className="text-xs font-medium text-forest-900">
                  {interest.label}{" "}
                  <span className="font-normal text-forest-800/50">
                    · {memberCount} {memberCount === 1 ? "member" : "members"}
                  </span>
                </Link>
                <ClubButton clubKey={interest.key} initialJoined={joined} />
              </div>
            ))}
          </div>
        </div>

        {feed.length === 0 ? (
          <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            No posts yet — be the first to share something.
          </p>
        ) : (
          feed.map(({ post, author, authorUser, listing, event }) => (
            <PostCard
              key={post.id}
              postId={post.id}
              authorName={author.displayName}
              authorUsername={authorUser.username}
              content={post.content}
              imageUrl={post.imageUrl}
              placeTitle={listing?.title}
              eventTitle={event?.title}
              createdAt={new Date(post.createdAt)}
              likeCount={likeMap.get(post.id) ?? 0}
              commentCount={commentMap.get(post.id) ?? 0}
              liked={likedIds.has(post.id)}
              canInteract
              comments={commentsMap.get(post.id) ?? []}
            />
          ))
        )}
      </div>

      <aside className="space-y-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-forest-800/60">
          People you may know
        </h2>
        {suggestedWithFollow.map(({ traveller, user, following }) => (
          <div
            key={traveller.id}
            className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3"
          >
            <div>
              <p className="text-sm font-medium text-forest-900">{traveller.displayName}</p>
              <p className="text-xs text-forest-800/50">@{user.username}</p>
            </div>
            <FollowButton targetTravellerId={traveller.id} initialFollowing={following} />
          </div>
        ))}
      </aside>
    </main>
  );
}
