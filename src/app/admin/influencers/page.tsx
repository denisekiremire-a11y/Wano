import Link from "next/link";
import { getInfluencersWithMonetizablePosts } from "@/lib/data/admin";
import { INFLUENCER_FOLLOWER_THRESHOLD, MONETIZABLE_POST_LIKE_THRESHOLD } from "@/lib/influencer";

export default async function AdminInfluencersPage() {
  const influencers = await getInfluencersWithMonetizablePosts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Influencers</h1>
        <p className="mt-1 max-w-2xl text-sm text-forest-800/60">
          Anyone with {INFLUENCER_FOLLOWER_THRESHOLD.toLocaleString()}+ followers gets Influencer
          status. Once they have it, any of their posts that reach{" "}
          {MONETIZABLE_POST_LIKE_THRESHOLD.toLocaleString()}+ likes shows up here as earning-eligible.
          This page is eligibility tracking only — there&apos;s no payout mechanism wired up yet.
        </p>
      </div>

      {influencers.length === 0 ? (
        <p className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          No one has crossed {INFLUENCER_FOLLOWER_THRESHOLD.toLocaleString()} followers yet.
        </p>
      ) : (
        <div className="space-y-3">
          {influencers.map(({ traveller, user, followers, eligiblePosts }) => (
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
                  {eligiblePosts.length} earning-eligible {eligiblePosts.length === 1 ? "post" : "posts"}
                </span>
              </div>

              {eligiblePosts.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-forest-900/5 pt-3">
                  {eligiblePosts.map((post) => (
                    <div key={post.id} className="flex items-start justify-between gap-3 text-sm">
                      <p className="text-forest-800/80">{post.content}</p>
                      <span className="flex-none text-xs font-medium text-forest-800/50">
                        {post.likes.toLocaleString()} likes
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
