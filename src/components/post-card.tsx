"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkIcon, ChatIcon, DotsIcon, HeartIcon, PinIcon, ShareIcon } from "@/components/icons";
import { ReportBlockMenu } from "@/components/report-block-menu";
import { AudienceChip, PostContextCard } from "@/components/post-context-card";
import {
  addCommentAction,
  changePostAudienceAction,
  deletePostAction,
  editPostAction,
  togglePostLikeAction,
  toggleSavePostAction,
} from "@/lib/actions/social-actions";
import type { PostContextCard as PostContextCardData } from "@/lib/data/post-context";
import type { ActionState } from "@/lib/validation";

type Comment = { comment: { id: string; content: string }; author: { displayName: string } };

function timeAgo(createdAt: Date) {
  const ms = Date.now() - createdAt.getTime();
  const minutes = Math.max(0, Math.round(ms / (60 * 1000)));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(createdAt);
}

export function PostCard({
  postId,
  authorTravellerId,
  authorName,
  authorUsername,
  authorAvatarUrl = null,
  authorLocation = null,
  content,
  imageUrl,
  imageIds,
  createdAt,
  likeCount,
  commentCount,
  liked,
  saved = false,
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
  authorAvatarUrl?: string | null;
  authorLocation?: string | null;
  content: string;
  imageUrl?: string | null;
  imageIds?: string[];
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved?: boolean;
  canInteract: boolean;
  comments: Comment[];
  context?: PostContextCardData | null;
  audience?: { clubId: string; clubName: string } | null;
  own?: boolean;
  clubOptions?: { id: string; name: string }[];
}) {
  const [isLiked, setOptimisticLiked] = useOptimistic(liked);
  const [count, setOptimisticCount] = useOptimistic(likeCount);
  const [isSaved, setOptimisticSaved] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const [commentState, setCommentState] = useState<ActionState>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editState, setEditState] = useState<ActionState>({});
  const [ownMenuOpen, setOwnMenuOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const router = useRouter();

  const profileHref = authorUsername ? `/profile/${authorUsername}` : "#";

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

  async function handleShare() {
    const url = `${window.location.origin}/social`;
    const text = `${authorName} on Wano: ${content.slice(0, 120)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Wano", text, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // clipboard unavailable — silently no-op
    }
  }

  const images = imageIds && imageIds.length > 0 ? imageIds.map((id) => `/api/post-images/${id}`) : imageUrl ? [imageUrl] : [];

  return (
    <div className="relative rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href={profileHref} className="flex-none">
            {authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={authorAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
                {authorName.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <div className="min-w-0">
            <Link href={profileHref} className="block truncate font-medium text-forest-900 hover:underline">
              {authorName}
            </Link>
            <p className="flex items-center gap-1 truncate text-xs text-forest-800/50">
              {authorLocation && (
                <>
                  <span className="truncate">{authorLocation}</span>
                  <span>·</span>
                </>
              )}
              <span>{timeAgo(createdAt)}</span>
            </p>
          </div>
        </div>

        <div className="relative flex-none">
          {own ? (
            <>
              <button
                type="button"
                onClick={() => setOwnMenuOpen((v) => !v)}
                aria-label="Post options"
                className="flex h-7 w-7 items-center justify-center rounded-full text-forest-800/40 hover:bg-forest-50 hover:text-forest-800"
              >
                <DotsIcon className="h-4.5 w-4.5" />
              </button>
              {ownMenuOpen && (
                <div className="absolute right-0 top-8 z-10 w-36 rounded-xl border border-forest-900/10 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setOwnMenuOpen(false);
                    }}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-forest-900 hover:bg-forest-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnMenuOpen(false);
                      handleDelete();
                    }}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : (
            canInteract && (
              <ReportBlockMenu
                targetType="post"
                targetId={postId}
                targetTravellerId={authorTravellerId}
                targetLabel={authorName}
              />
            )
          )}
        </div>
      </div>

      {audience && !isEditing && (
        <div className="ml-[3.15rem] mt-1.5">
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

      {images.length > 0 && (
        <div className="relative mt-3">
          <div className={`grid gap-1 overflow-hidden rounded-xl ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {images.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="max-h-80 w-full object-cover" />
            ))}
          </div>
          {context && (
            <span className="absolute bottom-2 left-2 flex max-w-[85%] items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <PinIcon className="h-3.5 w-3.5 flex-none" />
              <span className="truncate">{context.title}</span>
            </span>
          )}
        </div>
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

      <div className="mt-3 flex items-center justify-between border-t border-forest-900/5 pt-3">
        <div className="flex items-center gap-4">
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
            aria-label={isLiked ? "Unlike" : "Like"}
            className={`flex items-center gap-1.5 text-sm font-medium transition ${
              isLiked ? "text-red-500" : "text-forest-800/60 hover:text-forest-800"
            } disabled:opacity-50`}
          >
            <HeartIcon className="h-5 w-5" filled={isLiked} />
            {count}
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            aria-label="Toggle comments"
            className="flex items-center gap-1.5 text-sm font-medium text-forest-800/60 hover:text-forest-800"
          >
            <ChatIcon className="h-5 w-5" />
            {commentCount}
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share post"
            className="flex items-center gap-1.5 text-sm font-medium text-forest-800/60 hover:text-forest-800"
          >
            <ShareIcon className="h-5 w-5" />
            {shared && <span className="text-xs">Copied!</span>}
          </button>
        </div>
        <button
          type="button"
          disabled={!canInteract}
          onClick={() =>
            startTransition(async () => {
              setOptimisticSaved(!isSaved);
              await toggleSavePostAction(postId);
            })
          }
          className={`transition ${isSaved ? "text-marigold-600" : "text-forest-800/60 hover:text-forest-800"} disabled:opacity-50`}
          aria-label={isSaved ? "Remove from saved" : "Save post"}
        >
          <BookmarkIcon className="h-5 w-5" filled={isSaved} />
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
