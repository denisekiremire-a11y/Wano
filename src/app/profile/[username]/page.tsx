import { notFound } from "next/navigation";
import { UserIcon } from "@/components/icons";
import { PassportGrid } from "@/components/passport-grid";
import { FollowButton } from "@/components/follow-button";
import { ReportBlockMenu } from "@/components/report-block-menu";
import { AudienceChip, PostContextCard } from "@/components/post-context-card";
import { getSession } from "@/lib/session";
import { getPassportProgress, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getFollowCounts, getPostsByTraveller, getTravellerByUsername, isFollowing } from "@/lib/data/social";
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

  const [session, { progress }, followCounts, postRows] = await Promise.all([
    getSession(),
    getPassportProgress(traveller.id),
    getFollowCounts(traveller.id),
    getPostsByTraveller(traveller.id),
  ]);
  const contextMap = await resolvePostContexts(
    postRows
      .filter((r) => r.post.contextType && r.post.contextId)
      .map((r) => ({ type: r.post.contextType as PostContextType, id: r.post.contextId as string })),
  );

  let viewerFollows = false;
  let isOwnProfile = false;
  if (session?.role === "traveller") {
    const viewerProfile = await getTravellerProfileByUserId(session.userId);
    if (viewerProfile) {
      isOwnProfile = viewerProfile.id === traveller.id;
      if (!isOwnProfile) viewerFollows = await isFollowing(viewerProfile.id, traveller.id);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-forest-100 text-forest-500">
          <UserIcon className="h-8 w-8" />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-forest-900">
            {traveller.displayName}
          </h1>
          <p className="text-sm text-forest-800/60">
            @{user.username} · {followCounts.followers} followers · {followCounts.following} following
          </p>
        </div>
        {!isOwnProfile && session?.role === "traveller" && (
          <div className="relative flex flex-none items-center gap-2">
            <FollowButton targetTravellerId={traveller.id} initialFollowing={viewerFollows} />
            <ReportBlockMenu
              targetType="user"
              targetId={traveller.id}
              targetTravellerId={traveller.id}
              targetLabel={traveller.displayName}
            />
          </div>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">Wano Passport</h2>
        <div className="mt-4">
          <PassportGrid progress={progress} />
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Posts</h2>
        {(() => {
          const visiblePosts = isOwnProfile ? postRows : postRows.filter((r) => r.post.status === "visible");
          if (visiblePosts.length === 0) return <p className="text-sm text-forest-800/60">No posts yet.</p>;
          return visiblePosts.map(({ post, audienceClub }) => {
            const context =
              post.contextType && post.contextId
                ? (contextMap.get(`${post.contextType}:${post.contextId}`) ?? null)
                : null;
            return (
              <div key={post.id} className="rounded-xl border border-forest-900/10 bg-white p-4">
                {audienceClub && (
                  <div className="mb-1.5">
                    <AudienceChip clubId={audienceClub.id} clubName={audienceClub.name} />
                  </div>
                )}
                <p className="text-sm text-forest-900">{post.content}</p>
                {context && <PostContextCard context={context} />}
              </div>
            );
          });
        })()}
      </section>
    </main>
  );
}
