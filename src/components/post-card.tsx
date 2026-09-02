"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartIcon } from "@/components/icons";
import { ReportBlockMenu } from "@/components/report-block-menu";
import { AudienceChip, PostContextCard } from "@/components/post-context-card";
import {
  addCommentAction,
  changePostAudienceAction,
  deletePostAction,
  editPostAction,
  togglePostLikeAction,
} from "@/lib/actions/social-actions";
import type { PostContextCard as PostContextCardData } from "@/lib/data/post-context";
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
  context = null,
  audience = null,
  own = false,
  clubOptions = [],
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
  context?: PostContextCardData | null;
  audience?: { clubId: string; clubName: string } | null;
  own?: boolean;
  clubOptions?: { id: string; name: string }[];
}) {
  const [isLiked, setOptimisticLiked] = useOptimistic(liked);
  const [count, setOptimisticCount] = useOptimistic(likeCount);
  const [, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const [commentState, setCommentState] = useState<ActionState>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editState, setEditState] = useState<ActionState>({});
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm("Delete this post?")) return;
    startTransition(async () => {
      await deletePostAction(postId);
      router.refresh();
    });
  }

  function handleAudienceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null;
    startTransition(async () => {
      await changePostAudienceAction(postId, value);
      router.refresh();
    });
  }

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
          {own && (
            <>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-medium text-forest-800/60 hover:text-forest-800"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-medium text-forest-800/60 hover:text-red-700"
              >
                Delete
              </button>
            </>
          )}
          {canInteract && !own && (
            <ReportBlockMenu
              targetType="post"
              targetId={postId}
              targetTravellerId={authorTravellerId}
              targetLabel={authorName}
            />
          )}
        </div>
      </div>

      {audience && !isEditing && (
        <div className="mt-1.5">
          <AudienceChip clubId={audience.clubId} clubName={audience.clubName} />
        </div>
      )}

      {isEditing ? (
        <form
          action={async (formData) => {
            const result = await editPostAction(editState, formData);
            setEditState(result);
            if (!result.error) {
              setIsEditing(false);
              router.refresh();
            }
          }}
          className="mt-2 space-y-2"
        >
          <input type="hidden" name="postId" value={postId} />
          <textarea
            name="content"
            required
            maxLength={500}
            rows={2}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full resize-none rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
          {editState.error && <p className="text-xs text-red-700">{editState.error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditContent(content);
              }}
              className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-medium text-forest-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2 text-sm text-forest-800/90">{content}</p>
      )}
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

      {context && <PostContextCard context={context} />}

      {own && clubOptions.length > 0 && !isEditing && (
        <label className="mt-2 flex items-center gap-2 text-xs text-forest-800/50">
          Visible to
          <select
            value={audience?.clubId ?? ""}
            onChange={handleAudienceChange}
            className="rounded-lg border border-forest-900/15 bg-white px-2 py-1 text-xs text-forest-800"
          >
            <option value="">Everyone (public feed)</option>
            {clubOptions.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name} only
              </option>
            ))}
          </select>
        </label>
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
