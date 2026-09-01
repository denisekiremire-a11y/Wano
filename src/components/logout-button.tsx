"use client";

import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth-actions";

export function LogoutButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        Log out
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-900">Log out of Wano?</p>
      <div className="mt-3 flex gap-2">
        <form action={logoutAction} className="flex-1">
          <button
            type="submit"
            className="w-full rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Log out
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-full border border-forest-900/15 px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
