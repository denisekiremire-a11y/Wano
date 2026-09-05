import Link from "next/link";
import { formatMinor } from "@/lib/currency";
import { getInfluencersWithMonetizablePosts } from "@/lib/data/admin";
import {
  EARNINGS_PER_TIER_MINOR,
  INFLUENCER_FOLLOWER_THRESHOLD,
  LIKES_PER_EARNINGS_TIER,
  MONETIZABLE_POST_LIKE_THRESHOLD,
} from "@/lib/influencer";
import { SeedInfluencerButton } from "./seed-influencer-button";

export default async function AdminInfluencersPage() {
  const influencers = await getInfluencersWithMonetizablePosts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Influencers</h1>
        <p className="mt-1 max-w-2xl text-sm text-forest-800/60">
          Anyone with {INFLUENCER_FOLLOWER_THRESHOLD.toLocaleString()}+ followers gets Influencer
          status. Once they have it, any of their posts that reach{" "}
          {MONETIZABLE_POST_LIKE_THRESHOLD.toLocaleString()}+ likes earns{" "}
          {formatMinor(EARNINGS_PER_TIER_MINOR)} for every {LIKES_PER_EARNINGS_TIER.toLocaleString()} likes it
          has. This page shows what that adds up to — there&apos;s no actual payout mechanism wired up yet.
        </p>
      </div>

      <SeedInfluencerButton />

      {influencers.length === 0 ? (
        <p className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          No one has crossed {INFLUENCER_FOLLOWER_THRESHOLD.toLocaleString()} followers yet.
        </p>
      ) : (
        <div className="space-y-3">
          {influencers.map(({ traveller, user, followers, eligiblePosts, totalEarningsMinor }) => (
            <div key={traveller.id} className="rounded-2xl border border-forest-900/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={user.username ? `/profile/${user.username}` : "#"}
                    className="font-medium text-forest-900 hover:underline"
                  >
                    {traveller.displayName}
                  </Link>
                  <p className="text-xs text-forest-800/50">
                    @{user.username} · {followers.toLocaleString()} followers
                  </p>
                </div>
                <span className="rounded-full bg-marigold-100 px-2.5 py-1 text-xs font-semibold text-marigold-800">
                  {formatMinor(totalEarningsMinor)}
                </span>
              </div>

              {eligiblePosts.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-forest-900/5 pt-3">
                  {eligiblePosts.map((post) => (
                    <div key={post.id} className="flex items-start justify-between gap-3 text-sm">
                      <p className="text-forest-800/80">{post.content}</p>
                      <span className="flex-none text-right text-xs font-medium text-forest-800/50">
                        {post.likes.toLocaleString()} likes
                        <br />
                        {formatMinor(post.earningsMinor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
