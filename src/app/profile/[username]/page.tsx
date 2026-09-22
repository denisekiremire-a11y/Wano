import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BriefcaseIcon,
  CompassIcon,
  PaletteIcon,
  TagIcon,
  TrophyIcon,
  UtensilsIcon,
} from "@/components/icons";
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

const INTEREST_ICONS: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  food: UtensilsIcon,
  adventure: CompassIcon,
  business: BriefcaseIcon,
  art: PaletteIcon,
};

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
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="flex items-start gap-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-20 w-20 flex-none rounded-full object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <span className="flex h-20 w-20 flex-none items-center justify-center rounded-full bg-forest-100 text-2xl font-semibold text-forest-700 sm:h-24 sm:w-24">
            {traveller.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-forest-900">{traveller.displayName}</h1>
            {isInfluencer && (
              <span className="inline-flex items-center gap-1 rounded-full bg-marigold-100 px-2 py-0.5 text-[11px] font-semibold text-marigold-800">
                <TrophyIcon className="h-3 w-3" />
                Influencer
              </span>
            )}
          </div>
          <p className="text-sm text-forest-800/60">@{user.username}</p>
          {user.bio && <p className="mt-2 max-w-md text-sm text-forest-800/80">{user.bio}</p>}

          <div className="mt-3 flex items-center gap-5 text-sm">
            <span>
              <span className="font-semibold text-forest-900">{visiblePosts.length}</span>{" "}
              <span className="text-forest-800/60">{visiblePosts.length === 1 ? "post" : "posts"}</span>
            </span>
            <span>
              <span className="font-semibold text-forest-900">{followCounts.followers}</span>{" "}
              <span className="text-forest-800/60">followers</span>
            </span>
            <span>
              <span className="font-semibold text-forest-900">{followCounts.following}</span>{" "}
              <span className="text-forest-800/60">following</span>
            </span>
          </div>

          {interestRows.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {interestRows.map((interest) => {
                const Icon = INTEREST_ICONS[interest.key] ?? TagIcon;
                return (
                  <span
                    key={interest.key}
                    className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-medium text-forest-800"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {interest.label}
                  </span>
                );
              })}
            </div>
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

      <section className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Wano Passport</h2>
        <div className="mt-4">
          <PassportGrid progress={progress} />
        </div>
      </section>

      {gridThumbnails.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">Photos</h2>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {gridThumbnails.map(({ postId, imageId }) => (
              <Link
                key={postId}
                href={`#post-${postId}`}
                className="aspect-square overflow-hidden bg-forest-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/post-images/${imageId}`}
                  alt=""
                  className="h-full w-full object-cover transition hover:opacity-90"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Posts</h2>
        {visiblePosts.length === 0 ? (
          <p className="text-sm text-forest-800/60">No posts yet.</p>
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
                {monetizable && (
                  <span className="mb-1.5 inline-flex items-center rounded-full bg-marigold-100 px-2 py-0.5 text-[11px] font-semibold text-marigold-800">
                    💰 Earning eligible
                  </span>
                )}
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
