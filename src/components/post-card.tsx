"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import { addCommentAction, togglePostLikeAction } from "@/lib/actions/social-actions";
import type { ActionState } from "@/lib/validation";

type Comment = { comment: { id: string; content: string }; author: { displayName: string } };

export function PostCard({
  postId,
  authorName,
  authorUsername,
  content,
  imageUrl,
  placeTitle,
  eventTitle,
  createdAt,
  likeCount,
  commentCount,
  liked,
  canInteract,
  comments,
}: {
  postId: string;
  authorName: string;
  authorUsername: string | null;
  content: string;
  imageUrl?: string | null;
  placeTitle?: string | null;
  eventTitle?: string | null;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  canInteract: boolean;
  comments: Comment[];
}) {
  const [isLiked, setOptimisticLiked] = useOptimistic(liked);
  const [count, setOptimisticCount] = useOptimistic(likeCount);
  const [, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const [commentState, setCommentState] = useState<ActionState>({});

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <Link
          href={authorUsername ? `/profile/${authorUsername}` : "#"}
          className="font-medium text-forest-900 hover:underline"
        >
          {authorName}
        </Link>
        <span className="text-xs text-forest-800/50">
          {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(createdAt)}
        </span>
      </div>
      <p className="mt-2 text-sm text-forest-800/90">{content}</p>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mt-3 max-h-80 w-full rounded-xl object-cover" />
      )}
      {placeTitle && <p className="mt-2 text-xs text-forest-800/50">📍 {placeTitle}</p>}
      {eventTitle && <p className="mt-2 text-xs text-forest-800/50">🎟️ {eventTitle}</p>}

      <div className="mt-3 flex items-center gap-4 border-t border-forest-900/5 pt-3">
        <button
          type="button"
          disabled={!canInteract}
          onClick={() =>
            startTransition(async () => {
              setOptimisticLiked(!isLiked);
              setOptimisticCount(isLiked ? count - 1 : count + 1);
              await togglePostLikeAction(postId);
            })
          }
          className={`flex items-center gap-1.5 text-sm font-medium transition ${
            isLiked ? "text-red-500" : "text-forest-800/60 hover:text-forest-800"
          } disabled:opacity-50`}
        >
          <HeartIcon className="h-4 w-4" filled={isLiked} />
          {count}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="text-sm font-medium text-forest-800/60 hover:text-forest-800"
        >
          💬 {commentCount}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-forest-900/5 pt-3">
          {comments.map(({ comment, author }) => (
            <p key={comment.id} className="text-sm">
              <span className="font-medium text-forest-900">{author.displayName}</span>{" "}
              <span className="text-forest-800/80">{comment.content}</span>
            </p>
          ))}
          {canInteract && (
            <form
              action={async (formData) => {
                const result = await addCommentAction(commentState, formData);
                setCommentState(result);
              }}
              className="flex gap-2"
            >
              <input type="hidden" name="postId" value={postId} />
              <input
                name="content"
                placeholder="Add a comment…"
                required
                className="flex-1 rounded-lg border border-forest-900/15 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
              />
              <button
                type="submit"
                className="rounded-lg bg-forest-800 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Post
              </button>
            </form>
          )}
          {commentState.error && <p className="text-xs text-red-700">{commentState.error}</p>}
        </div>
      )}
    </div>
  );
}
