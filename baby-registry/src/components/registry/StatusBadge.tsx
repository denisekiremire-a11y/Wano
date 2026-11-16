import { Check, Gift as GiftIcon, Lock } from "lucide-react";
import type { GiftStatus } from "@/lib/types";

const STYLES: Record<GiftStatus, { label: string; cls: string; Icon: typeof Check }> = {
  available: { label: "Available", cls: "bg-sage-50 text-sage-700 ring-sage-200", Icon: GiftIcon },
  reserved: { label: "Reserved", cls: "bg-blush text-clay-dark ring-clay/30", Icon: Lock },
  purchased: { label: "Purchased", cls: "bg-linen text-ink-soft ring-sand", Icon: Check },
};

export function StatusBadge({ status, className = "" }: { status: GiftStatus; className?: string }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.cls} ${className}`}
      data-status={status}
    >
      <s.Icon className="size-3.5" aria-hidden />
      {s.label}
    </span>
  );
}
