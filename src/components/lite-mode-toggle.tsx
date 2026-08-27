"use client";

import { useEffect, useState } from "react";
import { getLiteMode, setLiteMode } from "@/lib/lite-mode";

export function LiteModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getLiteMode());
  }, []);

  return (
    <label className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-4">
      <span>
        <span className="block text-sm font-medium text-forest-900">Lite mode</span>
        <span className="block text-xs text-forest-800/60">
          Smaller images, no animations — for slow connections.
        </span>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => {
          setEnabled(e.target.checked);
          setLiteMode(e.target.checked);
        }}
        className="h-5 w-5 accent-forest-700"
      />
    </label>
  );
}
