"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSupplyLeadStatusAction } from "@/lib/actions/journey-actions";

const STATUSES = ["open", "contacted", "listed", "dismissed"] as const;

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await updateSupplyLeadStatusAction(leadId, e.target.value as (typeof STATUSES)[number]);
          router.refresh();
        })
      }
      className="rounded-lg border border-forest-900/15 bg-white px-2 py-1 text-xs text-forest-800"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
