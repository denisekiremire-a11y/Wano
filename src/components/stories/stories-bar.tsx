"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStoryAction } from "@/lib/actions/story-actions";
import { compressImage } from "@/lib/image-compress";
import { StoryViewer, type StoryReel } from "@/components/stories/story-viewer";
import type { StoryGroup, StoryItem } from "@/lib/data/stories";

export function StoriesBar({
  myTravellerId,
  myDisplayName,
  myAvatarUrl,
  myStories,
  groups,
  canPost,
}: {
  myTravellerId: string | null;
  myDisplayName: string;
  myAvatarUrl: string | null;
  myStories: StoryItem[];
  groups: StoryGroup[];
  canPost: boolean;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const reels: StoryReel[] = [
    ...(myTravellerId && myStories.length > 0
      ? [
          {
            travellerId: myTravellerId,
            displayName: "You",
            avatarUrl: myAvatarUrl,
            isMine: true,
            stories: myStories,
          },
        ]
      : []),
    ...groups.map((g) => ({
      travellerId: g.travellerId,
      displayName: g.displayName,
      avatarUrl: g.avatarUrl,
      isMine: false,
      stories: g.stories,
    })),
  ];
  const myReelIndex = myTravellerId && myStories.length > 0 ? 0 : -1;

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { blob } = await compressImage(file);
      const compressed = new File([blob], "story.webp", { type: "image/webp" });
      const formData = new FormData();
      formData.set("image", compressed);
      startTransition(async () => {
        const result = await createStoryAction({}, formData);
        setUploading(false);
        if (result.error) setError(result.error);
        else router.refresh();
      });
    } catch {
      setUploading(false);
      setError("Couldn't process that photo — try another.");
    }
  }

  if (!canPost && groups.length === 0) return null;

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex gap-4 overflow-x-auto">
        {canPost && (
          <div className="flex flex-none flex-col items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => (myReelIndex >= 0 ? setViewerIndex(myReelIndex) : fileInputRef.current?.click())}
                className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ${
                  myReelIndex >= 0 ? "ring-2 ring-ember ring-offset-2" : "ring-2 ring-dashed ring-forest-900/20"
                }`}
              >
                {myAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={myAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-forest-100 text-lg font-semibold text-forest-700">
                    {myDisplayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label="Add to your story"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ember text-sm font-bold text-white ring-2 ring-white disabled:opacity-60"
              >
                {uploading ? "…" : "+"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-forest-800/70">Your story</span>
          </div>
        )}

        {groups.map((g, i) => (
          <button
            key={g.travellerId}
            type="button"
            onClick={() => setViewerIndex(myReelIndex >= 0 ? i + 1 : i)}
            className="flex flex-none flex-col items-center gap-1"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ${
                g.hasUnseen ? "ring-2 ring-ember ring-offset-2" : "ring-2 ring-forest-900/15"
              }`}
            >
              {g.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-forest-100 text-lg font-semibold text-forest-700">
                  {g.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="max-w-16 truncate text-[11px] font-medium text-forest-800/70">
              {g.displayName}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {viewerIndex !== null && reels[viewerIndex] && (
        <StoryViewer reels={reels} startReelIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
