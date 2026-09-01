"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { renderMarkdown, readingTimeMinutes } from "@/lib/markdown";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

type Author = { id: string; name: string };

export function JournalEditor({
  action,
  authors,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  authors: Author[];
  initial?: {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    coverImage: string | null;
    authorUserId: string;
    category: string;
    tags: string[];
    status: "draft" | "scheduled" | "published";
    publishedAt: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImage: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [body, setBody] = useState(initial?.body ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [showPreview, setShowPreview] = useState(false);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-forest-900">Title</label>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-forest-900">Slug (optional — auto from title)</label>
            <input
              name="slug"
              defaultValue={initial?.slug}
              placeholder="how-to-get-a-sim-card-in-kampala"
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-forest-900">Category</label>
              <input
                name="category"
                required
                defaultValue={initial?.category ?? "Guides"}
                className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-forest-900">Author</label>
              <select
                name="authorUserId"
                required
                defaultValue={initial?.authorUserId}
                className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
              >
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-forest-900">Tags (comma-separated)</label>
            <input
              name="tags"
              defaultValue={initial?.tags.join(", ")}
              placeholder="uganda, sim-card, kampala"
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-forest-900">Excerpt</label>
            <textarea
              name="excerpt"
              required
              rows={2}
              defaultValue={initial?.excerpt}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-forest-900">Cover image URL (optional)</label>
            <input
              name="coverImage"
              type="url"
              defaultValue={initial?.coverImage ?? ""}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>

          <details className="rounded-lg border border-forest-900/10 p-3">
            <summary className="cursor-pointer text-sm font-medium text-forest-900">SEO (optional)</summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-forest-800/70">SEO title</label>
                <input
                  name="seoTitle"
                  defaultValue={initial?.seoTitle ?? ""}
                  className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-forest-800/70">SEO description</label>
                <textarea
                  name="seoDescription"
                  rows={2}
                  defaultValue={initial?.seoDescription ?? ""}
                  className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-forest-800/70">OG image URL</label>
                <input
                  name="ogImage"
                  type="url"
                  defaultValue={initial?.ogImage ?? ""}
                  className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
              </div>
            </div>
          </details>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-forest-900">Status</label>
              <select
                name="status"
                defaultValue={initial?.status ?? "draft"}
                className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-forest-900">Publish date (for scheduled)</label>
              <input
                type="datetime-local"
                name="publishedAt"
                defaultValue={initial?.publishedAt ?? ""}
                className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-forest-900">Body (markdown)</label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="rounded-full border border-forest-900/15 px-3 py-1 text-xs font-semibold text-forest-800 hover:bg-forest-50"
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>
          {showPreview ? (
            <div
              className="journal-body min-h-[420px] rounded-lg border border-forest-900/15 bg-white p-4"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
            />
          ) : (
            <textarea
              name="body"
              required
              rows={20}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-forest-900/15 px-3 py-2 font-mono text-sm outline-none focus:border-forest-600"
            />
          )}
          <p className="text-xs text-forest-800/50">~{readingTimeMinutes(body)} min read</p>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link href="/admin/journal" className="text-sm font-medium text-forest-800/70 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
