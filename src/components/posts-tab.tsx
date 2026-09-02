"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import type { clubs, posts } from "@/db/schema";
import type { PostContextCard as PostContextCardData } from "@/lib/data/post-context";

type Post = typeof posts.$inferSelect;
type Club = typeof clubs.$inferSelect;
type Comment = { comment: { id: string; content: string }; author: { displayName: string } };

type FilterKey = "all" | "places" | "events" | "clubs" | "untagged";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "places", label: "Places" },
  { key: "events", label: "Events" },
  { key: "clubs", label: "Clubs" },
  { key: "untagged", label: "Untagged" },
];

function matchesFilter(post: Post, filter: FilterKey) {
  switch (filter) {
    case "all":
      return true;
    case "places":
      return post.contextType === "listing";
    case "events":
      return post.contextType === "event";
    case "clubs":
      return post.contextType === "club" || Boolean(post.audienceClubId);
    case "untagged":
      return !post.contextType && !post.audienceClubId;
  }
}

export function PostsTab({
  postRows,
  authorTravellerId,
  authorName,
  authorUsername,
  likeMap,
  commentMap,
  likedPostIds,
  commentsMap,
  imageIdsMap,
  contextMap,
  myClubs,
}: {
  postRows: { post: Post; audienceClub: Club | null }[];
  authorTravellerId: string;
  authorName: string;
  authorUsername: string | null;
  likeMap: Map<string, number>;
  commentMap: Map<string, number>;
  likedPostIds: Set<string>;
  commentsMap: Map<string, Comment[]>;
  imageIdsMap: Map<string, string[]>;
  contextMap: Map<string, PostContextCardData>;
  myClubs: Club[];
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const places = useMemo(() => {
    const counts = new Map<string, { card: PostContextCardData; count: number }>();
    for (const { post } of postRows) {
      if (post.contextType !== "listing" && post.contextType !== "event") continue;
      if (!post.contextId) continue;
      const card = contextMap.get(`${post.contextType}:${post.contextId}`);
      if (!card) continue;
      const existing = counts.get(card.id);
      if (existing) existing.count += 1;
      else counts.set(card.id, { card, count: 1 });
    }
    return [...counts.values()];
  }, [postRows, contextMap]);

  const visiblePosts = postRows.filter((r) => matchesFilter(r.post, filter));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-forest-900">Your posts</h2>
        <p className="mt-1 text-sm text-forest-800/60">Everything you&apos;ve shared across Wano.</p>
      </div>

      {places.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-forest-800/50">
            Places you&apos;ve posted about
          </h3>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {places.map(({ card, count }) => (
              <Link
                key={`${card.type}:${card.id}`}
                href={card.href}
                className="flex-none rounded-xl border border-forest-900/10 bg-white px-3 py-2 hover:border-forest-900/20"
              >
                <p className="whitespace-nowrap text-sm font-medium text-forest-900">{card.title}</p>
                <p className="text-xs text-forest-800/50">
                  {count} {count === 1 ? "post" : "posts"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f.key
                ? "border-forest-800 bg-forest-800 text-white"
                : "border-forest-900/15 text-forest-800 hover:bg-forest-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {postRows.length === 0 ? (
        <div className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center">
          <p className="text-sm text-forest-800/60">
            You haven&apos;t posted anything yet — find something worth sharing first.
          </p>
          <Link
            href="/explore"
            className="mt-3 inline-flex rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Explore
          </Link>
        </div>
      ) : visiblePosts.length === 0 ? (
        <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          No posts in this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {visiblePosts.map(({ post, audienceClub }) => (
            <PostCard
              key={post.id}
              postId={post.id}
              authorTravellerId={authorTravellerId}
              authorName={authorName}
              authorUsername={authorUsername}
              content={post.content}
              imageUrl={post.imageUrl}
              imageIds={imageIdsMap.get(post.id) ?? []}
              createdAt={new Date(post.createdAt)}
              likeCount={likeMap.get(post.id) ?? 0}
              commentCount={commentMap.get(post.id) ?? 0}
              liked={likedPostIds.has(post.id)}
              canInteract
              comments={commentsMap.get(post.id) ?? []}
              context={
                post.contextType && post.contextId
                  ? (contextMap.get(`${post.contextType}:${post.contextId}`) ?? null)
                  : null
              }
              audience={audienceClub ? { clubId: audienceClub.id, clubName: audienceClub.name } : null}
              own
              clubOptions={myClubs.map((c) => ({ id: c.id, name: c.name }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
