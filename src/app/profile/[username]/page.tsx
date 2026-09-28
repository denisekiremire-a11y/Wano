import Link from "next/link";
import { notFound } from "next/navigation";
import { PassportGrid } from "@/components/passport-grid";
import { FollowButton } from "@/components/follow-button";
import { MessageButton } from "@/components/message-button";
import { ReportBlockMenu } from "@/components/report-block-menu";
import { PostCard } from "@/components/post-card";
import { getSession } from "@/lib/session";
import { getPassportProgress, getTravellerInterests, getTravellerProfileByUserId } from "@/lib/data/traveller";
import {
  getCommentsForPost,
  getEngagementCounts,
  getFollowCounts,
  getLikedPostIds,
  getPostImageIds,
  getPostsByTraveller,
  getSavedPostIds,
  getTravellerByUsername,
  isFollowing,
} from "@/lib/data/social";
import { isInfluencerByFollowers, isPostMonetizable } from "@/lib/influencer";
import { resolvePostContexts, type PostContextType } from "@/lib/data/post-context";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const row = await getTravellerByUsername(username);
  if (!row) notFound();
  const { traveller, user } = row;

  const [session, { progress }, followCounts, postRows, interestRows] = await Promise.all([
    getSession(),
    getPassportProgress(traveller.id),
    getFollowCounts(traveller.id),
    getPostsByTraveller(traveller.id),
    getTravellerInterests(traveller.id),
  ]);

  let viewerFollows = false;
  let isOwnProfile = false;
  let viewerProfileId: string | null = null;
  if (session?.role === "traveller") {
    const viewerProfile = await getTravellerProfileByUserId(session.userId);
    if (viewerProfile) {
      viewerProfileId = viewerProfile.id;
      isOwnProfile = viewerProfile.id === traveller.id;
      if (!isOwnProfile) viewerFollows = await isFollowing(viewerProfile.id, traveller.id);
    }
  }

  const visiblePosts = isOwnProfile ? postRows : postRows.filter((r) => r.post.status === "visible");
  const postIds = visiblePosts.map((r) => r.post.id);

  const [contextMap, { likeMap, commentMap }, imageIdsMap, likedIds, savedIds, commentsByPost] = await Promise.all([
    resolvePostContexts(
      visiblePosts
        .filter((r) => r.post.contextType && r.post.contextId)
        .map((r) => ({ type: r.post.contextType as PostContextType, id: r.post.contextId as string })),
    ),
    getEngagementCounts(postIds),
    getPostImageIds(postIds),
    viewerProfileId ? getLikedPostIds(viewerProfileId, postIds) : Promise.resolve(new Set<string>()),
    viewerProfileId ? getSavedPostIds(viewerProfileId, postIds) : Promise.resolve(new Set<string>()),
    Promise.all(postIds.map((id) => getCommentsForPost(id).then((c) => [id, c] as const))),
  ]);
  const commentsMap = new Map(commentsByPost);
  const isInfluencer = isInfluencerByFollowers(followCounts.followers);
  const canInteract = Boolean(viewerProfileId);

  const gridThumbnails = visiblePosts
    .map((r) => ({ postId: r.post.id, imageId: imageIdsMap.get(r.post.id)?.[0] }))
    .filter((t): t is { postId: string; imageId: string } => Boolean(t.imageId));

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-4xl px-4 py-12 md:px-6">
      <div className="flex items-start gap-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-20 w-20 flex-none rounded-full object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <span className="flex h-20 w-20 flex-none items-center justify-center rounded-full bg-ink/5 text-2xl font-semibold text-ink/60 sm:h-24 sm:w-24">
            {traveller.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif-editorial text-3xl text-ink">{traveller.displayName}</h1>
            {isInfluencer && <span className="eyebrow text-ember">Influencer</span>}
          </div>
          <p className="text-sm text-ink/50">@{user.username}</p>
          {user.bio && <p className="mt-2 max-w-md text-sm text-ink/70">{user.bio}</p>}

          <div className="font-mono-data mt-3 flex items-center gap-5 text-sm">
            <span>
              <span className="font-semibold text-ink">{visiblePosts.length}</span>{" "}
              <span className="text-ink/50">{visiblePosts.length === 1 ? "post" : "posts"}</span>
            </span>
            <span>
              <span className="font-semibold text-ink">{followCounts.followers}</span>{" "}
              <span className="text-ink/50">followers</span>
            </span>
            <span>
              <span className="font-semibold text-ink">{followCounts.following}</span>{" "}
              <span className="text-ink/50">following</span>
            </span>
          </div>

          {interestRows.length > 0 && (
            <p className="mt-3 text-sm text-ink/50">
              {interestRows.map((interest) => interest.label).join(" · ")}
            </p>
          )}

          {!isOwnProfile && session?.role === "traveller" && (
            <div className="relative mt-4 flex flex-none items-center gap-2">
              <FollowButton targetTravellerId={traveller.id} initialFollowing={viewerFollows} />
              <MessageButton targetTravellerId={traveller.id} />
              <ReportBlockMenu
                targetType="user"
                targetId={traveller.id}
                targetTravellerId={traveller.id}
                targetLabel={traveller.displayName}
              />
            </div>
          )}
        </div>
      </div>

      <section className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="font-serif-editorial text-2xl text-ink">Wano Passport</h2>
        <div className="mt-4">
          <PassportGrid progress={progress} />
        </div>
      </section>

      {gridThumbnails.length > 0 && (
        <section className="mt-10 border-t border-ink/10 pt-6">
          <h2 className="font-serif-editorial text-2xl text-ink">Photos</h2>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {gridThumbnails.map(({ postId, imageId }) => (
              <Link
                key={postId}
                href={`#post-${postId}`}
                className="aspect-square overflow-hidden bg-ink/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/post-images/${imageId}`}
                  alt=""
                  className="h-full w-full object-cover transition-opacity hover:opacity-90"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 border-t border-ink/10 pt-6 space-y-6">
        <h2 className="font-serif-editorial text-2xl text-ink">Posts</h2>
        {visiblePosts.length === 0 ? (
          <p className="text-sm text-ink/50">No posts yet.</p>
        ) : (
          visiblePosts.map(({ post, audienceClub }) => {
            const context =
              post.contextType && post.contextId
                ? (contextMap.get(`${post.contextType}:${post.contextId}`) ?? null)
                : null;
            const likeCount = likeMap.get(post.id) ?? 0;
            const monetizable = isPostMonetizable(followCounts.followers, likeCount);
            return (
              <div key={post.id} id={`post-${post.id}`} className="scroll-mt-20">
                {monetizable && <p className="eyebrow mb-1.5 text-ember">Earning eligible</p>}
                <PostCard
                  postId={post.id}
                  authorTravellerId={traveller.id}
                  authorName={traveller.displayName}
                  authorUsername={user.username}
                  authorAvatarUrl={user.avatarUrl}
                  authorLocation={user.location ?? traveller.city}
                  content={post.content}
                  imageUrl={post.imageUrl}
                  imageIds={imageIdsMap.get(post.id) ?? []}
                  createdAt={new Date(post.createdAt)}
                  likeCount={likeCount}
                  commentCount={commentMap.get(post.id) ?? 0}
                  liked={likedIds.has(post.id)}
                  saved={savedIds.has(post.id)}
                  canInteract={canInteract}
                  comments={commentsMap.get(post.id) ?? []}
                  context={context}
                  audience={audienceClub ? { clubId: audienceClub.id, clubName: audienceClub.name } : null}
                  own={isOwnProfile}
                />
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
