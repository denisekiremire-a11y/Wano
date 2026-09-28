import Link from "next/link";
import { formatMinor } from "@/lib/currency";
import { getInfluencersWithMonetizablePosts } from "@/lib/data/admin";
import {
  EARNINGS_PER_TIER_MINOR,
  INFLUENCER_FOLLOWER_THRESHOLD,
  LIKES_PER_EARNINGS_TIER,
  MONETIZABLE_POST_LIKE_THRESHOLD,
} from "@/lib/influencer";
import { requireAdminPage } from "@/lib/auth";
import { SeedInfluencerButton } from "./seed-influencer-button";

export default async function AdminInfluencersPage() {
  await requireAdminPage("/admin/influencers");
  const influencers = await getInfluencersWithMonetizablePosts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Influencers</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/60">
          Anyone with {INFLUENCER_FOLLOWER_THRESHOLD.toLocaleString()}+ followers gets Influencer
          status. Once they have it, any of their posts that reach{" "}
          {MONETIZABLE_POST_LIKE_THRESHOLD.toLocaleString()}+ likes earns{" "}
          {formatMinor(EARNINGS_PER_TIER_MINOR)} for every {LIKES_PER_EARNINGS_TIER.toLocaleString()} likes it
          has. This page shows what that adds up to — there&apos;s no actual payout mechanism wired up yet.
        </p>
      </div>

      <SeedInfluencerButton />

      {influencers.length === 0 ? (
        <p className="border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
          No one has crossed {INFLUENCER_FOLLOWER_THRESHOLD.toLocaleString()} followers yet.
        </p>
      ) : (
        <div className="space-y-3">
          {influencers.map(({ traveller, user, followers, eligiblePosts, totalEarningsMinor }) => (
            <div key={traveller.id} className="border border-ink/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={user.username ? `/profile/${user.username}` : "#"}
                    className="font-medium text-ink hover:underline"
                  >
                    {traveller.displayName}
                  </Link>
                  <p className="font-mono-data text-xs text-ink/50">
                    @{user.username} · {followers.toLocaleString()} followers
                  </p>
                </div>
                <span className="font-mono-data text-sm font-semibold text-ember">
                  {formatMinor(totalEarningsMinor)}
                </span>
              </div>

              {eligiblePosts.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
                  {eligiblePosts.map((post) => (
                    <div key={post.id} className="flex items-start justify-between gap-3 text-sm">
                      <p className="text-ink/70">{post.content}</p>
                      <span className="font-mono-data flex-none text-right text-xs text-ink/50">
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
