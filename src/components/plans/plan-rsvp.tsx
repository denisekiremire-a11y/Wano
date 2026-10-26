"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToPlanAction } from "@/lib/actions/plan-actions";
import type { PlanStatus } from "@/lib/data/plans";

const LABELS: Record<PlanStatus, string> = { going: "Going", maybe: "Maybe", no: "Can't make it" };

export function PlanRsvp({ token, current, goTo }: { token: string; current: PlanStatus | null; goTo?: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(LABELS) as PlanStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const { planId } = await respondToPlanAction(token, s);
              if (goTo) router.push(`/plans/${planId}`);
              else router.refresh();
            })
          }
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            current === s ? "border-ink bg-ink text-white" : "border-ink/20 text-ink hover:border-ink"
          }`}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  );
}
