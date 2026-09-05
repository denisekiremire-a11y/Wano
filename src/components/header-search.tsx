"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(formData: FormData) {
    const q = String(formData.get("q") ?? "").trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-label="Search"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-forest-800/70 transition hover:bg-forest-900/5 hover:text-forest-900"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <form action={submit} className="flex items-center gap-1">
      <input
        ref={inputRef}
        name="q"
        placeholder="Search places, events, journeys…"
        autoComplete="off"
        onBlur={(e) => {
          if (!e.target.value) setOpen(false);
        }}
        className="w-40 rounded-full border border-forest-900/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-forest-600 sm:w-56"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-forest-800/70 transition hover:bg-forest-900/5 hover:text-forest-900"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    </form>
  );
}
