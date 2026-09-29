import Link from "next/link";
import { FollowButton } from "@/components/follow-button";
import { PeopleToFollowRail } from "@/components/people-to-follow-rail";
import { PostComposer } from "@/components/post-composer";
import { MatchCard } from "@/components/season/match-card";
import { SocialFeed } from "@/components/social-feed";
import { StoriesBar } from "@/components/stories/stories-bar";
import { UserSearch } from "@/components/user-search";
import { getSession } from "@/lib/session";
import { getRankedFeed } from "@/lib/data/feed";
import { getBlockedTravellerIds } from "@/lib/data/moderation";
import { getSuggestedAttachments, resolvePostContext, type PostContextType } from "@/lib/data/post-context";
import {
  getClubCategories,
  getFollowingTravellerIds,
  getSuggestedPeople,
  getTopInfluencers,
  isFollowing,
} from "@/lib/data/social";
import { getActiveStoryGroups, getMyActiveStories, getUserAvatarUrl } from "@/lib/data/stories";
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

  const [feed, categories, suggestedRaw, topInfluencersRaw, blockedIds, suggestions, shareContext] =
    await Promise.all([
      getRankedFeed(travellerProfile?.id ?? null, 30),
      getClubCategories(),
      travellerProfile ? getSuggestedPeople(travellerProfile.id) : Promise.resolve([]),
      // Public — a highlight rail, not personalized, so it shows for any
      // visitor (including logged out or logged in as vendor/admin), unlike
      // "People you may know" which needs a traveller viewer to mean anything.
      getTopInfluencers(travellerProfile?.id ?? null),
      travellerProfile ? getBlockedTravellerIds(travellerProfile.id) : Promise.resolve(new Set<string>()),
      travellerProfile ? getSuggestedAttachments(travellerProfile.id) : Promise.resolve([]),
      context_type && context_id && SHARE_CONTEXT_TYPES.has(context_type as PostContextType)
        ? resolvePostContext(context_type as PostContextType, context_id)
        : Promise.resolve(null),
    ]);

  const [storyGroups, myStories, myAvatarUrl, followingTravellerIds] = await Promise.all([
    getActiveStoryGroups(travellerProfile?.id ?? null),
    travellerProfile ? getMyActiveStories(travellerProfile.id) : Promise.resolve([]),
    session ? getUserAvatarUrl(session.userId) : Promise.resolve(null),
    travellerProfile ? getFollowingTravellerIds(travellerProfile.id) : Promise.resolve([]),
  ]);

  const topInfluencerIds = new Set(topInfluencersRaw.map((i) => i.traveller.id));
  const topInfluencers = await Promise.all(
    topInfluencersRaw
      .filter((i) => !blockedIds.has(i.traveller.id))
      .map(async (i) => ({
        ...i,
        following: travellerProfile ? await isFollowing(travellerProfile.id, i.traveller.id) : false,
      })),
  );

  const suggestedWithFollow = travellerProfile
    ? await Promise.all(
        suggestedRaw
          .filter((s) => !blockedIds.has(s.traveller.id) && !topInfluencerIds.has(s.traveller.id))
          .map(async (s) => ({
            ...s,
            following: await isFollowing(travellerProfile.id, s.traveller.id),
          })),
      )
    : [];

  const now = new Date();
  const peopleRail = [...topInfluencers, ...suggestedWithFollow].slice(0, 8);

  return (
    <main className="font-editorial-body mx-auto grid max-w-4xl gap-6 bg-paper px-4 py-8 md:grid-cols-[1fr_260px] md:px-6">
      <div className="min-w-0 space-y-4">
        <div>
          <p className="eyebrow text-ember">Wano</p>
          <h1 className="font-serif-editorial mt-2 text-3xl text-ink md:text-4xl">Social</h1>
          <p className="mt-2 text-sm text-ink/60">
            What&apos;s happening across Wano — new places, events picking up, perks, and what members
            are sharing.
          </p>
        </div>

        <StoriesBar
          myTravellerId={travellerProfile?.id ?? null}
          myDisplayName={travellerProfile?.displayName ?? "You"}
          myAvatarUrl={myAvatarUrl}
          myStories={myStories}
          groups={storyGroups}
          canPost={Boolean(travellerProfile)}
        />

        {travellerProfile ? (
          <PostComposer
            suggestions={suggestions}
            avatarUrl={myAvatarUrl}
            displayName={travellerProfile.displayName}
            presetContext={
              shareContext
                ? { type: shareContext.type, id: shareContext.id, label: shareContext.title }
                : undefined
            }
            placeholder={shareContext ? `Share something about ${shareContext.title}…` : undefined}
          />
        ) : (
          <div className="border border-ink/10 bg-white p-4 text-sm text-ink/70">
            <Link href="/signup" className="font-semibold text-ember hover:underline">
              Join Wano
            </Link>{" "}
            to post, follow people, and join clubs.
          </div>
        )}

        {travellerProfile && peopleRail.length > 0 && <PeopleToFollowRail people={peopleRail} />}

        {travellerProfile && (
          <div className="md:hidden">
            <UserSearch />
          </div>
        )}

        {travellerProfile && (
          <div id="clubs" className="scroll-mt-20 border border-ink/10 bg-white p-4">
            <h2 className="font-serif-editorial text-lg text-ink">Wano Clubs</h2>
            <p className="mt-0.5 text-xs text-ink/50">
              Find your people — browse a category to see its clubs, or join one directly.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {categories.map(({ interest, clubCount }) => (
                <Link
                  key={interest.id}
                  href={`/social/clubs/category/${interest.key}`}
                  className="text-sm font-medium text-ink transition-colors hover:text-ember"
                >
                  {interest.label}{" "}
                  <span className="font-mono-data text-xs text-ink/40">
                    · {clubCount} {clubCount === 1 ? "club" : "clubs"}
                  </span>
                </Link>
              ))}
              <Link
                href="/social/clubs/apply"
                className="text-sm font-medium text-ink/40 transition-colors hover:text-ink"
              >
                + Start a club
              </Link>
            </div>
          </div>
        )}

        <Link
          href="/contact"
          className="block border border-dashed border-ink/15 bg-white p-3 text-sm text-ink/70 transition hover:border-ink/30"
        >
          Own a business in Kampala?{" "}
          <span className="font-semibold text-ember">List it on Wano →</span>
        </Link>

        <MatchCard />

        {travellerProfile ? (
          <SocialFeed entries={feed} followingIds={followingTravellerIds} now={now} />
        ) : (
          <div className="relative">
            <div aria-hidden className="pointer-events-none select-none blur-sm">
              <SocialFeed entries={feed} followingIds={followingTravellerIds} now={now} />
            </div>
            <div className="absolute inset-0 flex items-start justify-center pt-10">
              <Link
                href="/signup"
                className="mx-4 flex max-w-sm flex-col items-center gap-3 border border-dashed border-ink/20 bg-white p-8 text-center transition hover:bg-ink/5"
              >
                <p className="eyebrow text-ember">Join Wano</p>
                <p className="font-serif-editorial text-2xl text-ink">Follow people and chat</p>
                <p className="text-sm text-ink/60">
                  See what members are sharing, follow the people and places you care about, and
                  join the conversation — free.
                </p>
              </Link>
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-6">
        {travellerProfile && (
          <div className="hidden md:block">
            <UserSearch />
          </div>
        )}
        {topInfluencers.length > 0 && (
          <div>
            <h2 className="eyebrow text-ink/40">Top influencers</h2>
            <div className="mt-3 border-t border-ink/10">
              {topInfluencers.map(({ traveller, user, followers, following }) => (
                <div key={traveller.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                  <Link href={user.username ? `/profile/${user.username}` : "#"} className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink hover:text-ember">
                      {traveller.displayName}
                    </p>
                    <p className="font-mono-data text-xs text-ink/50">{followers.toLocaleString()} followers</p>
                  </Link>
                  {travellerProfile ? (
                    <FollowButton targetTravellerId={traveller.id} initialFollowing={following} />
                  ) : (
                    <Link href="/signup" className="flex-none text-xs font-semibold text-ember hover:underline">
                      Follow
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {travellerProfile && suggestedWithFollow.length > 0 && (
          <div>
            <h2 className="eyebrow text-ink/40">People you may know</h2>
            <div className="mt-3 border-t border-ink/10">
              {suggestedWithFollow.map(({ traveller, user, following }) => (
                <div key={traveller.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                  <Link href={user.username ? `/profile/${user.username}` : "#"} className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink hover:text-ember">
                      {traveller.displayName}
                    </p>
                    <p className="text-xs text-ink/50">@{user.username}</p>
                  </Link>
                  <FollowButton targetTravellerId={traveller.id} initialFollowing={following} />
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
