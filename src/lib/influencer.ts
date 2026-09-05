// Influencer status and monetization eligibility. This file defines who
// *qualifies* — it does not move any money. Actual payout mechanics are a
// separate, not-yet-built decision (how much, how it's paid out, etc.).
export const INFLUENCER_FOLLOWER_THRESHOLD = 1000;
export const MONETIZABLE_POST_LIKE_THRESHOLD = 500;

export function isInfluencerByFollowers(followerCount: number): boolean {
  return followerCount >= INFLUENCER_FOLLOWER_THRESHOLD;
}

/** A post only counts toward earnings once its author is an influencer
 * (1000+ followers) AND the post itself has hit the like threshold — an
 * influencer's low-performing post doesn't qualify on its own. */
export function isPostMonetizable(authorFollowerCount: number, postLikeCount: number): boolean {
  return isInfluencerByFollowers(authorFollowerCount) && postLikeCount >= MONETIZABLE_POST_LIKE_THRESHOLD;
}
