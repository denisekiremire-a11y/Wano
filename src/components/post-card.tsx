"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import { ReportBlockMenu } from "@/components/report-block-menu";
import { addCommentAction, togglePostLikeAction } from "@/lib/actions/social-actions";
import type { ActionState } from "@/lib/validation";

type Comment = { comment: { id: string; content: string }; author: { displayName: string } };

export function PostCard({
  postId,
  authorTravellerId,
  authorName,
  authorUsername,
  content,
  imageUrl,
  imageIds,
  createdAt,
  likeCount,
  commentCount,
  liked,
  canInteract,
  comments,
}: {
  postId: string;
  authorTravellerId?: string;
  authorName: string;
  authorUsername: string | null;
  content: string;
  imageUrl?: string | null;
  imageIds?: string[];
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
    <div className="relative rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <Link
          href={authorUsername ? `/profile/${authorUsername}` : "#"}
          className="font-medium text-forest-900 hover:underline"
        >
          {authorName}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-forest-800/50">
            {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(createdAt)}
          </span>
          {canInteract && (
            <ReportBlockMenu
              targetType="post"
              targetId={postId}
              targetTravellerId={authorTravellerId}
              targetLabel={authorName}
            />
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-forest-800/90">{content}</p>
      {imageIds && imageIds.length > 0 ? (
        <div className={`mt-3 grid gap-1 ${imageIds.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {imageIds.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={`/api/post-images/${id}`}
              alt=""
              className="max-h-80 w-full rounded-xl object-cover"
            />
          ))}
        </div>
      ) : (
        imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mt-3 max-h-80 w-full rounded-xl object-cover" />
        )
      )}

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
            <div key={comment.id} className="relative flex items-start justify-between gap-2">
              <p className="text-sm">
                <span className="font-medium text-forest-900">{author.displayName}</span>{" "}
                <span className="text-forest-800/80">{comment.content}</span>
              </p>
              {canInteract && (
                <ReportBlockMenu targetType="comment" targetId={comment.id} targetLabel={author.displayName} />
              )}
            </div>
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
