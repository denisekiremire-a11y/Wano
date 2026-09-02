"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createPostAction, searchMentionablesAction } from "@/lib/actions/social-actions";
import { compressImage } from "@/lib/image-compress";
import type { PostContextType, SuggestedAttachment } from "@/lib/data/post-context";
import type { ActionState } from "@/lib/validation";

const MAX_IMAGES = 4;
const MAX_CHARS = 500;

type PendingImage = { file: File; previewUrl: string; compressing: boolean };
type Attachment = { type: PostContextType; id: string; label: string };

export function PostComposer({
  presetContext,
  presetAudienceClubId,
  suggestions = [],
  placeholder = "What's happening?",
}: {
  presetContext?: Attachment;
  presetAudienceClubId?: string;
  suggestions?: SuggestedAttachment[];
  placeholder?: string;
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [state, setState] = useState<ActionState>({});
  const [posted, setPosted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [attachment, setAttachment] = useState<Attachment | null>(presetContext ?? null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<SuggestedAttachment[]>([]);

  useEffect(() => {
    if (mentionQuery === null) return;
    const handle = setTimeout(() => {
      searchMentionablesAction(mentionQuery).then(setMentionResults);
    }, 200);
    return () => clearTimeout(handle);
  }, [mentionQuery]);

  async function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, room);
    const next: PendingImage[] = picked.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      compressing: true,
    }));
    setImages((prev) => [...prev, ...next]);

    for (const pending of next) {
      try {
        const { blob } = await compressImage(pending.file);
        const compressedFile = new File([blob], pending.file.name.replace(/\.\w+$/, ".webp"), {
          type: "image/webp",
        });
        setImages((prev) =>
          prev.map((img) => (img === pending ? { ...img, file: compressedFile, compressing: false } : img)),
        );
      } catch {
        setImages((prev) => prev.filter((img) => img !== pending));
      }
    }
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);

    const cursor = e.target.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  }

  function selectMention(result: SuggestedAttachment) {
    setAttachment(result);
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? content.length;
    const upToCursor = content.slice(0, cursor);
    const replaced = upToCursor.replace(/(?:^|\s)@([^\s@]*)$/, (m) => (m.startsWith(" ") ? " " : "") + `@${result.label} `);
    const next = replaced + content.slice(cursor);
    setContent(next);
    setMentionQuery(null);
    setMentionResults([]);
  }

  function selectSuggestion(s: SuggestedAttachment) {
    setAttachment((prev) => (prev && prev.type === s.type && prev.id === s.id ? null : { type: s.type, id: s.id, label: s.label }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const formData = new FormData();
    formData.set("content", content);
    if (attachment) {
      formData.set("contextType", attachment.type);
      formData.set("contextId", attachment.id);
    }
    if (presetAudienceClubId) formData.set("audienceClubId", presetAudienceClubId);
    for (const img of images) formData.append("images", img.file);

    startTransition(async () => {
      const result = await createPostAction({}, formData);
      setState(result);
      if (!result.error) {
        setContent("");
        images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        setImages([]);
        if (!presetContext) setAttachment(null);
        setPosted(true);
        setTimeout(() => setPosted(false), 4000);
      }
    });
  }

  const stillCompressing = images.some((img) => img.compressing);

  return (
    <form onSubmit={handleSubmit} className="relative rounded-2xl border border-forest-900/10 bg-white p-4">
      {suggestions.length > 0 && !presetContext && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => {
            const isSelected = attachment?.type === s.type && attachment?.id === s.id;
            return (
              <button
                key={`${s.type}:${s.id}`}
                type="button"
                onClick={() => selectSuggestion(s)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? "border-forest-800 bg-forest-800 text-white"
                    : "border-forest-900/15 text-forest-800 hover:bg-forest-50"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          name="content"
          required
          maxLength={MAX_CHARS}
          rows={2}
          value={content}
          onChange={handleContentChange}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        {mentionQuery !== null && mentionResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-forest-900/10 bg-white shadow-md">
            {mentionResults.map((r) => (
              <button
                key={`${r.type}:${r.id}`}
                type="button"
                onClick={() => selectMention(r)}
                className="block w-full px-3 py-1.5 text-left text-sm text-forest-800 hover:bg-forest-50"
              >
                {r.label} <span className="text-xs text-forest-800/40">· {r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {attachment && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-medium text-forest-800">
            📎 {attachment.label}
            {!presetContext && (
              <button type="button" onClick={() => setAttachment(null)} className="text-forest-800/50 hover:text-forest-800">
                ×
              </button>
            )}
          </span>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between text-[11px] text-forest-800/40">
        <span>
          {content.length}/{MAX_CHARS}
        </span>
      </div>

      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div
              key={img.previewUrl}
              className="relative h-16 w-16 overflow-hidden rounded-lg border border-forest-900/15"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
              {img.compressing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white">
                  …
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] leading-none text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="rounded-full border border-forest-900/15 px-3 py-1 text-xs font-medium text-forest-800 hover:bg-forest-50 disabled:opacity-40"
          >
            📷 Photo ({images.length}/{MAX_IMAGES})
          </button>
        </div>
        <button
          type="submit"
          disabled={isPending || stillCompressing || !content.trim()}
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {isPending ? "Posting…" : stillCompressing ? "Preparing photos…" : "Post"}
        </button>
      </div>

      {state.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
      {posted && <p className="mt-1 text-xs text-forest-700">Posted!</p>}
      <p className="mt-2 text-[11px] text-forest-800/40">
        By posting you agree to the{" "}
        <Link href="/community-guidelines" className="underline">
          community guidelines
        </Link>
        .
      </p>
    </form>
  );
}
