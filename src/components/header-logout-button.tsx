"use client";

import { LogOutIcon } from "@/components/icons";
import { logoutAction } from "@/lib/actions/auth-actions";

export function HeaderLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm("Log out of Wano?")) void logoutAction();
      }}
      className="flex items-center gap-1.5 rounded-full border border-forest-800/15 px-3 py-1.5 text-sm font-medium text-forest-800 transition hover:bg-forest-800/5"
    >
      <LogOutIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
