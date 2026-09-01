import type { feedItemTypeEnum } from "@/db/schema";

type FeedItemType = (typeof feedItemTypeEnum.enumValues)[number];

/** Tuned so a mixed feed emerges — perks and events outrank plain place
 * additions, per the milestone brief. Read this table top to bottom as the
 * whole ranking policy; nothing else adjusts relative type importance. */
const TYPE_WEIGHT: Record<FeedItemType, number> = {
  perk_expiring: 1.5,
  perk_added: 1.4,
  event_momentum: 1.35,
  event_upcoming: 1.3,
  club_meetup: 1.25,
  journal_published: 1.1,
  user_post: 1.0,
  review_posted: 0.9,
  place_added: 0.8,
};

const RECENCY_HALF_LIFE_HOURS = 36;

export function recencyDecay(createdAt: Date, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - createdAt.getTime()) / (60 * 60 * 1000));
  return Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
}

export type FeedAffinityContext = {
  city: string | null;
  followingTravellerIds: Set<string>;
  clubIds: Set<string>;
  interestKeys: Set<string>;
};

export const NEUTRAL_AFFINITY: FeedAffinityContext = {
  city: null,
  followingTravellerIds: new Set(),
  clubIds: new Set(),
  interestKeys: new Set(),
};

export type ScorableFeedItem = {
  type: FeedItemType;
  createdAt: Date;
  city: string | null;
  subjectTravellerId: string | null;
  clubId: string | null;
  interestKey: string | null;
};

export function affinityBoost(item: ScorableFeedItem, viewer: FeedAffinityContext): number {
  let boost = 1;
  if (viewer.city && item.city && viewer.city.trim().toLowerCase() === item.city.trim().toLowerCase()) {
    boost *= 1.2;
  }
  if (item.subjectTravellerId && viewer.followingTravellerIds.has(item.subjectTravellerId)) {
    boost *= 1.5;
  }
  if (item.clubId && viewer.clubIds.has(item.clubId)) {
    boost *= 1.3;
  }
  if (item.interestKey && viewer.interestKeys.has(item.interestKey)) {
    boost *= 1.15;
  }
  return boost;
}

export function scoreFeedItem(
  item: ScorableFeedItem,
  viewer: FeedAffinityContext,
  now: Date = new Date(),
): number {
  return TYPE_WEIGHT[item.type] * recencyDecay(item.createdAt, now) * affinityBoost(item, viewer);
}
