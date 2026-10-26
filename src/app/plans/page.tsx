import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getMyPlans } from "@/lib/data/plans";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { kampalaDateIso } from "@/lib/drops";
import { PlanCard } from "@/components/plans/plan-card";
import { PlanForm } from "@/components/plans/plan-form";

export default async function PlansPage() {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) return null;
  const { upcoming, past } = await getMyPlans(traveller.id);

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-2xl space-y-8 px-4 py-10 md:px-6">
      <div>
        <p className="eyebrow text-ember">Plans</p>
        <h1 className="font-serif-editorial mt-2 text-3xl text-ink">Going out together</h1>
        <p className="mt-2 text-sm text-ink/60">
          Make a plan, share the link on WhatsApp, and see who&apos;s in. You can also start one from any place or
          event page.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-xl text-ink">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink/60">
            No plans yet. <Link href="/events" className="text-ember hover:underline">See what&apos;s on</Link> or make one below.
          </p>
        ) : (
          upcoming.map((p) => <PlanCard key={p.id} plan={p} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-xl text-ink">New plan</h2>
        <PlanForm defaultDate={kampalaDateIso(new Date())} />
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif-editorial text-xl text-ink/60">Past</h2>
          {past.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </section>
      )}
    </main>
  );
}
