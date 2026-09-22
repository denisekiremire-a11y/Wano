"use client";

import { useEffect, useState } from "react";
import { deleteStoryAction, markStoryViewedAction } from "@/lib/actions/story-actions";

export type StoryReel = {
  travellerId: string;
  displayName: string;
  avatarUrl: string | null;
  isMine: boolean;
  stories: { id: string; createdAt: Date; caption: string | null }[];
};

const SLIDE_MS = 5000;

/** Owns the progress fill for exactly one slide. Mounted fresh (via a
 * `key` on reelIndex+storyIndex in the parent) each time the active slide
 * changes, so its own timer and 0%-start state don't need resetting from
 * outside — no synchronous setState-in-effect. */
function SlideProgress({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / SLIDE_MS) * 100);
      setProgress(pct);
      if (pct >= 100) onComplete();
    }, 50);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="h-full bg-white transition-none" style={{ width: `${progress}%` }} />;
}

export function StoryViewer({
  reels,
  startReelIndex,
  onClose,
}: {
  reels: StoryReel[];
  startReelIndex: number;
  onClose: () => void;
}) {
  const [reelIndex, setReelIndex] = useState(startReelIndex);
  const [storyIndex, setStoryIndex] = useState(0);

  const reel = reels[reelIndex];
  const story = reel?.stories[storyIndex];

  function goNextReel() {
    if (reelIndex < reels.length - 1) {
      setReelIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }

  function goPrevReel() {
    if (reelIndex > 0) {
      setReelIndex((i) => i - 1);
      setStoryIndex(0);
    }
  }

  function goNext() {
    if (!reel) return;
    if (storyIndex < reel.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else {
      goNextReel();
    }
  }

  function goPrev() {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else {
      goPrevReel();
    }
  }

  useEffect(() => {
    if (!story || reel?.isMine) return;
    markStoryViewedAction(story.id).catch(() => {});
  }, [story, reel?.isMine]);

  if (!reel || !story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="relative flex h-full w-full max-w-md flex-col sm:h-[90vh] sm:rounded-2xl sm:overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2">
          {reel.stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              {i < storyIndex ? (
                <div className="h-full w-full bg-white" />
              ) : i === storyIndex ? (
                <SlideProgress key={`${reelIndex}-${storyIndex}`} onComplete={goNext} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-5 z-20 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            {reel.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reel.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/40" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
                {reel.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-sm font-semibold text-white">{reel.displayName}</span>
            <span className="text-xs text-white/70">
              {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(story.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {reel.isMine && (
              <button
                type="button"
                onClick={() => {
                  deleteStoryAction(story.id).then(() => {
                    if (reel.stories.length <= 1) goNextReel();
                    else goNext();
                  });
                }}
                className="text-xs font-medium text-white/80 hover:text-white"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
            >
              ×
            </button>
          </div>
        </div>

        <div className="relative flex-1 bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/story-images/${story.id}`} alt="" className="h-full w-full object-contain" />
          {story.caption && (
            <p className="absolute bottom-6 left-0 right-0 px-4 text-center text-sm text-white">
              {story.caption}
            </p>
          )}
          <button
            type="button"
            aria-label="Previous"
            onClick={goPrev}
            className="absolute inset-y-0 left-0 w-1/3"
          />
          <button
            type="button"
            aria-label="Next"
            onClick={goNext}
            className="absolute inset-y-0 right-0 w-2/3"
          />
        </div>
      </div>
    </div>
  );
}
