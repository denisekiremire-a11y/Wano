import Link from "next/link";
import type { PlanView } from "@/lib/data/plans";
import { formatKampalaDateTime } from "@/lib/kampala-time";

export function PlanCard({ plan }: { plan: PlanView }) {
  const going = plan.members.filter((m) => m.status === "going").length;
  return (
    <Link href={`/plans/${plan.id}`} className="block border border-ink/10 bg-white p-4 transition hover:border-ember">
      <p className="eyebrow text-ember">{formatKampalaDateTime(plan.startsAt)}</p>
      <p className="font-serif-editorial mt-1 text-lg text-ink">{plan.title}</p>
      <p className="mt-1 text-sm text-ink/60">
        {plan.placeName ? `${plan.placeName} · ` : ""}
        {going} going{plan.bookingId ? " · Booked" : ""}
      </p>
    </Link>
  );
}
