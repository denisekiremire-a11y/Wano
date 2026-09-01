"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { PASSPORT_TABS, type PassportTabKey } from "@/lib/passport-tabs";

export function PassportTabs({ active }: { active: PassportTabKey }) {
  const router = useRouter();
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const focusAndGo = (index: number) => {
    const target = PASSPORT_TABS[(index + PASSPORT_TABS.length) % PASSPORT_TABS.length];
    const targetIndex = PASSPORT_TABS.findIndex((t) => t.key === target.key);
    tabRefs.current[targetIndex]?.focus();
    router.push(`/passport?tab=${target.key}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAndGo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAndGo(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAndGo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAndGo(PASSPORT_TABS.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Passport sections"
      className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-forest-50 p-1"
    >
      {PASSPORT_TABS.map((tab, index) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/passport?tab=${tab.key}`}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex-none rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              selected ? "bg-forest-800 text-white" : "text-forest-800/70"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
