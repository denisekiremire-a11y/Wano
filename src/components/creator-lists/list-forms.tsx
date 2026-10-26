"use client";

import { useActionState } from "react";
import {
  addCreatorListItemAction,
  createCreatorListAction,
  reviewCreatorListAction,
  submitCreatorListAction,
  updateCreatorListAction,
} from "@/lib/actions/creator-list-actions";

const field = "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember";
const primary =
  "rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60";

type Details = { title: string; intro: string; area: string | null };

function Feedback({ state, saved }: { state: { error?: string; ok?: boolean } | undefined; saved?: string }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.ok && saved) return <p className="text-xs text-ink/50">{saved}</p>;
  return null;
}

function DetailFields({ current }: { current?: Details }) {
  return (
    <>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Title</span>
        <input name="title" required maxLength={80} defaultValue={current?.title} placeholder="5 rooftops for a Friday" className={field} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Why these picks?</span>
        <textarea
          name="intro"
          rows={3}
          maxLength={600}
          defaultValue={current?.intro}
          placeholder="Where I take friends visiting Kampala for the first time…"
          className={field}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Area (optional)</span>
        <input name="area" maxLength={60} defaultValue={current?.area ?? ""} placeholder="Kololo" className={field} />
      </label>
    </>
  );
}

export function NewListForm() {
  const [state, action, pending] = useActionState(createCreatorListAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <DetailFields />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Creating…" : "Start the list"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function EditListForm({ listId, current }: { listId: string; current: Details }) {
  const [state, action, pending] = useActionState(updateCreatorListAction.bind(null, listId), undefined);
  return (
    <form action={action} className="space-y-3">
      <DetailFields current={current} />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Saving…" : "Save"}
      </button>
      <Feedback state={state} saved="Saved." />
    </form>
  );
}

export function AddPickForm({
  listId,
  places,
  upcoming,
}: {
  listId: string;
  places: { id: string; title: string; vendorName: string }[];
  upcoming: { id: string; title: string; when: string }[];
}) {
  const [state, action, pending] = useActionState(addCreatorListItemAction.bind(null, listId), undefined);
  return (
    <form action={action} className="space-y-3">
      <select name="pick" required defaultValue="" className={field}>
        <option value="" disabled>
          Pick a place or event…
        </option>
        <optgroup label="Places">
          {places.map((p) => (
            <option key={p.id} value={`listing:${p.id}`}>
              {p.title} · {p.vendorName}
            </option>
          ))}
        </optgroup>
        <optgroup label="Upcoming events">
          {upcoming.map((e) => (
            <option key={e.id} value={`event:${e.id}`}>
              {e.title} · {e.when}
            </option>
          ))}
        </optgroup>
      </select>
      <input name="note" maxLength={200} placeholder="Your tip, e.g. ask for the rooftop table" className={field} />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Adding…" : "Add to list"}
      </button>
      <Feedback state={state} saved="Added." />
    </form>
  );
}

export function SubmitListButton({ listId }: { listId: string }) {
  const [state, action, pending] = useActionState(submitCreatorListAction.bind(null, listId), undefined);
  return (
    <form action={action} className="space-y-2">
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Sending…" : "Send to Wano for review"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function ReviewListForm({ listId }: { listId: string }) {
  const [pubState, publish, publishing] = useActionState(reviewCreatorListAction.bind(null, listId, "publish"), undefined);
  const [rejState, reject, rejecting] = useActionState(reviewCreatorListAction.bind(null, listId, "reject"), undefined);
  return (
    <div className="space-y-3">
      <form action={publish}>
        <button type="submit" disabled={publishing} className={primary}>
          {publishing ? "Publishing…" : "Publish"}
        </button>
        <Feedback state={pubState} />
      </form>
      <form action={reject} className="space-y-2">
        <input name="note" maxLength={300} placeholder="What should the creator change?" className={field} />
        <button
          type="submit"
          disabled={rejecting}
          className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60"
        >
          {rejecting ? "Sending back…" : "Send back with note"}
        </button>
        <Feedback state={rejState} />
      </form>
    </div>
  );
}
