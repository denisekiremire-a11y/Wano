"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FeedItemCard } from "@/components/feed-item-card";
import { PostCard } from "@/components/post-card";
import type { FeedEntry } from "@/lib/data/feed";

type FilterKey = "forYou" | "following" | "photos";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "forYou", label: "For You" },
  { key: "following", label: "Following" },
  { key: "photos", label: "Photos" },
];

function hasPhoto(entry: FeedEntry) {
  return entry.kind === "user_post" && (entry.imageIds.length > 0 || Boolean(entry.post.imageUrl));
}

export function SocialFeed({
  entries,
  followingIds,
  now,
}: {
  entries: FeedEntry[];
  followingIds: string[];
  now: Date;
}) {
  const [filter, setFilter] = useState<FilterKey>("forYou");
  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  const filtered = entries.filter((entry) => {
    if (filter === "following") {
      return entry.kind === "user_post" && entry.authorTravellerId != null && followingSet.has(entry.authorTravellerId);
    }
    if (filter === "photos") return hasPhoto(entry);
    return true;
  });

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-sand-50/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:border-forest-900/10 sm:bg-white/95 sm:px-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`flex-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? "border-forest-800 bg-forest-800 text-white"
                : "border-forest-900/15 text-forest-800 hover:bg-forest-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <a
          href="#clubs"
          className="flex-none rounded-full border border-forest-900/15 px-3.5 py-1.5 text-sm font-medium text-forest-800 hover:bg-forest-50"
        >
          Clubs
        </a>
      </div>

      <div className="mt-3 space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            {filter === "following" ? (
              <>
                You&apos;re not following anyone yet.{" "}
                <Link href="/discover?tab=people" className="font-medium text-nile-700 hover:underline">
                  Find people to follow
                </Link>
                .
              </>
            ) : filter === "photos" ? (
              "No photos in the feed right now."
            ) : (
              "Nothing here yet — check back soon."
            )}
          </div>
        ) : (
          filtered.map((entry) =>
            entry.kind === "user_post" ? (
              <PostCard
                key={entry.id}
                postId={entry.post.id}
                authorTravellerId={entry.authorTravellerId ?? undefined}
                authorName={entry.authorName}
                authorUsername={entry.authorUsername}
                authorAvatarUrl={entry.authorAvatarUrl}
                authorLocation={entry.authorLocation}
                content={entry.post.content}
                imageUrl={entry.post.imageUrl}
                imageIds={entry.imageIds}
                createdAt={new Date(entry.post.createdAt)}
                likeCount={entry.likeCount}
                commentCount={entry.commentCount}
                liked={entry.liked}
                saved={entry.saved}
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
    </div>
  );
}
