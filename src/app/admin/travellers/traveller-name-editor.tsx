"use client";

import { useState, useTransition } from "react";
import { updateTravellerNameAction } from "@/lib/actions/admin-actions";

export function TravellerNameEditor({
  travellerId,
  initialName,
  canEdit = true,
}: {
  travellerId: string;
  initialName: string;
  /** support-level admins can view Members but not edit — the server
   * action rejects it either way (see updateTravellerNameAction), this
   * just keeps the UI from offering something that would just error. */
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="font-medium text-ink">{name}</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-ember hover:underline"
          >
            Edit name
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="rounded-lg border border-ink/15 px-2 py-1 text-sm outline-none focus:border-ember"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await updateTravellerNameAction(travellerId, name);
              setEditing(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't save.");
            }
          })
        }
        className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setName(initialName);
          setEditing(false);
          setError(null);
        }}
        className="text-xs font-medium text-ink/60 hover:text-ink"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
