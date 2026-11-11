"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";

/** Shared keyboard-navigable pill tab bar, driven by `?tab=` on `basePath`
 * — used for both Passport's tabs and the Rewards page's. */
export function TabPills<K extends string>({
  tabs,
  active,
  basePath,
  ariaLabel,
}: {
  tabs: readonly { key: K; label: string }[];
  active: K;
  basePath: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const focusAndGo = (index: number) => {
    const target = tabs[(index + tabs.length) % tabs.length];
    const targetIndex = tabs.findIndex((t) => t.key === target.key);
    tabRefs.current[targetIndex]?.focus();
    router.push(`${basePath}?tab=${target.key}`);
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
      focusAndGo(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-forest-50 p-1"
    >
      {tabs.map((tab, index) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`${basePath}?tab=${tab.key}`}
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
