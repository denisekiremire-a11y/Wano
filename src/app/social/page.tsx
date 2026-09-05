import Link from "next/link";
import { FeedItemCard } from "@/components/feed-item-card";
import { FollowButton } from "@/components/follow-button";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { getSession } from "@/lib/session";
import { getRankedFeed } from "@/lib/data/feed";
import { getBlockedTravellerIds } from "@/lib/data/moderation";
import { getSuggestedAttachments, resolvePostContext, type PostContextType } from "@/lib/data/post-context";
import { getClubCategories, getSuggestedPeople, isFollowing } from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

const SHARE_CONTEXT_TYPES = new Set<PostContextType>([
  "listing",
  "event",
  "club",
  "journey",
  "perk",
  "journal_post",
]);

// Public and indexable — a signed-out visitor gets the same ranked feed,
// with affinity neutral (see getRankedFeed). Only the composer and the
// social sidebars are member-only.
export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ context_type?: string; context_id?: string }>;
}) {
  const session = await getSession();
  const travellerProfile =
    session?.role === "traveller" ? await getTravellerProfileByUserId(session.userId) : null;
  const { context_type, context_id } = await searchParams;

  const [feed, categories, suggestedRaw, blockedIds, suggestions, shareContext] = await Promise.all([
    getRankedFeed(travellerProfile?.id ?? null, 30),
    getClubCategories(),
    travellerProfile ? getSuggestedPeople(travellerProfile.id) : Promise.resolve([]),
    travellerProfile ? getBlockedTravellerIds(travellerProfile.id) : Promise.resolve(new Set<string>()),
    travellerProfile ? getSuggestedAttachments(travellerProfile.id) : Promise.resolve([]),
    context_type && context_id && SHARE_CONTEXT_TYPES.has(context_type as PostContextType)
      ? resolvePostContext(context_type as PostContextType, context_id)
      : Promise.resolve(null),
  ]);

  const suggestedWithFollow = travellerProfile
    ? await Promise.all(
        suggestedRaw
          .filter((s) => !blockedIds.has(s.traveller.id))
          .map(async (s) => ({
            ...s,
            following: await isFollowing(travellerProfile.id, s.traveller.id),
          })),
      )
    : [];

  const now = new Date();

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:grid-cols-[1fr_260px] md:px-6">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Social</h1>
          <p className="mt-1 text-sm text-forest-800/60">
            What&apos;s happening across Wano — new places, events picking up, perks, and what members
            are sharing.
          </p>
        </div>

        {travellerProfile ? (
          <PostComposer
            suggestions={suggestions}
            presetContext={
              shareContext
                ? { type: shareContext.type, id: shareContext.id, label: shareContext.title }
                : undefined
            }
            placeholder={shareContext ? `Share something about ${shareContext.title}…` : undefined}
          />
        ) : (
          <div className="rounded-2xl border border-forest-900/10 bg-white p-4 text-sm text-forest-800/70">
            <Link href="/signup" className="font-semibold text-nile-700 hover:underline">
              Join Wano
            </Link>{" "}
            to post, follow people, and join clubs.
          </div>
        )}

        {travellerProfile && (
          <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
            <h2 className="font-display text-sm font-semibold text-forest-900">Wano Clubs</h2>
            <p className="mt-0.5 text-xs text-forest-800/60">
              Find your people — browse a category to see its clubs, or join one directly.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map(({ interest, clubCount }) => (
                <Link
                  key={interest.id}
                  href={`/social/clubs/category/${interest.key}`}
                  className="rounded-full border border-forest-900/10 bg-forest-50/50 px-3 py-1.5 text-xs font-medium text-forest-900 hover:bg-forest-50"
                >
                  {interest.label}{" "}
                  <span className="font-normal text-forest-800/50">
                    · {clubCount} {clubCount === 1 ? "club" : "clubs"}
                  </span>
                </Link>
              ))}
              <Link
                href="/social/clubs/apply"
                className="rounded-full border border-dashed border-forest-900/20 px-3 py-1.5 text-xs font-medium text-forest-800/70 hover:border-forest-900/40"
              >
                + Start a club
              </Link>
            </div>
          </div>
        )}

        {feed.length === 0 ? (
          <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            Nothing here yet — check back soon.
          </p>
        ) : (
          feed.map((entry) =>
            entry.kind === "user_post" ? (
              <PostCard
                key={entry.id}
                postId={entry.post.id}
                authorTravellerId={entry.authorTravellerId}
                authorName={entry.authorName}
                authorUsername={entry.authorUsername}
                content={entry.post.content}
                imageUrl={entry.post.imageUrl}
                imageIds={entry.imageIds}
                createdAt={new Date(entry.post.createdAt)}
                likeCount={entry.likeCount}
                commentCount={entry.commentCount}
                liked={entry.liked}
                canInteract={entry.canInteract}
                comments={entry.comments}
                context={entry.context}
              />
            ) : (
              <FeedItemCard key={entry.id} entry={entry} now={now} />
            ),
          )
        )}
      </div>

      <aside className="space-y-3">
        {travellerProfile && suggestedWithFollow.length > 0 && (
          <>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-forest-800/60">
              People you may know
            </h2>
            {suggestedWithFollow.map(({ traveller, user, following }) => (
              <div
                key={traveller.id}
                className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3"
              >
                <Link href={user.username ? `/profile/${user.username}` : "#"} className="min-w-0">
                  <p className="truncate text-sm font-medium text-forest-900 hover:underline">
                    {traveller.displayName}
                  </p>
                  <p className="text-xs text-forest-800/50">@{user.username}</p>
                </Link>
                <FollowButton targetTravellerId={traveller.id} initialFollowing={following} />
              </div>
            ))}
          </>
        )}
      </aside>
    </main>
  );
}
