"use client";

import { useState, useTransition } from "react";
import { updateTravellerNameAction } from "@/lib/actions/admin-actions";

export function TravellerNameEditor({ travellerId, initialName }: { travellerId: string; initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="font-medium text-forest-900">{name}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-nile-700 hover:underline"
        >
          Edit name
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="rounded-lg border border-forest-900/15 px-2 py-1 text-sm outline-none focus:border-forest-600"
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
        className="rounded-full bg-forest-800 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
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
        className="text-xs font-medium text-forest-800/60 hover:text-forest-800"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
