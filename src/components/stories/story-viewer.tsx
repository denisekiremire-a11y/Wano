"use client";

import { useEffect, useRef, useState } from "react";
import { HeartIcon, SendIcon } from "@/components/icons";
import { deleteStoryAction, markStoryViewedAction, replyToStoryAction } from "@/lib/actions/story-actions";

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
 * outside — no synchronous setState-in-effect. `paused` (read via a ref,
 * not a dependency) freezes the fill without losing elapsed progress, so
 * typing a reply doesn't lose your place when you're done. */
function SlideProgress({ onComplete, paused }: { onComplete: () => void; paused: boolean }) {
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const start = Date.now();
    let pausedMs = 0;
    let pauseStartedAt: number | null = null;
    const tick = setInterval(() => {
      if (pausedRef.current) {
        if (pauseStartedAt === null) pauseStartedAt = Date.now();
        return;
      }
      if (pauseStartedAt !== null) {
        pausedMs += Date.now() - pauseStartedAt;
        pauseStartedAt = null;
      }
      const elapsed = Date.now() - start - pausedMs;
      const pct = Math.min(100, (elapsed / SLIDE_MS) * 100);
      setProgress(pct);
      if (pct >= 100) onComplete();
    }, 50);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="h-full bg-white transition-none" style={{ width: `${progress}%` }} />;
}

/** The reply box + heart-react for one slide. Mounted fresh (via the same
 * `key` trick as SlideProgress) each time the active slide changes, so its
 * text/feedback/reacted state starts clean with no reset effect needed. */
function ReplyBar({ storyId, onFocusChange }: { storyId: string; onFocusChange: (focused: boolean) => void }) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reacted, setReacted] = useState(false);

  async function sendReply(content: string) {
    if (sending) return;
    setSending(true);
    const result = await replyToStoryAction(storyId, content);
    setSending(false);
    if (result.error) {
      setFeedback(result.error);
    } else {
      setReplyText("");
      setFeedback("Sent!");
      setTimeout(() => setFeedback(null), 2000);
    }
  }

  function handleHeart() {
    if (reacted) return;
    setReacted(true);
    void sendReply("❤️");
  }

  return (
    <div className="relative flex items-center gap-2 bg-black p-3">
      <input
        type="text"
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && replyText.trim()) void sendReply(replyText);
        }}
        placeholder="Send a message…"
        className="flex-1 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/50 focus:border-white/60"
      />
      <button
        type="button"
        onClick={handleHeart}
        aria-label="React with heart"
        className="flex h-9 w-9 flex-none items-center justify-center text-white"
      >
        <HeartIcon className="h-6 w-6" filled={reacted} />
      </button>
      <button
        type="button"
        onClick={() => replyText.trim() && sendReply(replyText)}
        disabled={!replyText.trim() || sending}
        aria-label="Send"
        className="flex h-9 w-9 flex-none items-center justify-center text-white disabled:opacity-40"
      >
        <SendIcon className="h-6 w-6" />
      </button>
      {feedback && <span className="absolute bottom-14 right-3 text-xs text-white/80">{feedback}</span>}
    </div>
  );
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
  const [replyFocused, setReplyFocused] = useState(false);

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
                <SlideProgress key={`${reelIndex}-${storyIndex}`} onComplete={goNext} paused={replyFocused} />
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

        {!reel.isMine && (
          <ReplyBar key={`${reelIndex}-${storyIndex}`} storyId={story.id} onFocusChange={setReplyFocused} />
        )}
      </div>
    </div>
  );
}
