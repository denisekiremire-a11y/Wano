import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlanView } from "@/lib/data/plans";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { formatKampalaDateTime } from "@/lib/kampala-time";
import { getSession } from "@/lib/session";
import { PlanRsvp } from "@/components/plans/plan-rsvp";

/** Where a plan's WhatsApp invite lands. Members see the plan and answer;
 * everyone else is asked to sign in or join first. */
export default async function JoinPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const plan = await getPlanView({ token });
  if (!plan) notFound();
  const session = await getSession();
  const traveller = session?.role === "traveller" ? await getTravellerProfileByUserId(session.userId) : null;
  const mine = traveller ? plan.members.find((m) => m.travellerId === traveller.id) : null;
  if (mine) redirect(`/plans/${plan.id}`);

  const maker = plan.members.find((m) => m.travellerId === plan.creatorId)?.name ?? "A friend";
  const going = plan.members.filter((m) => m.status === "going").length;
  const next = encodeURIComponent(`/plans/join/${token}`);

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-md space-y-6 px-4 py-12 text-center md:px-6">
      <p className="eyebrow text-ember">{maker} invited you</p>
      <h1 className="font-serif-editorial text-3xl text-ink">{plan.title}</h1>
      <p className="text-sm text-ink/60">
        {formatKampalaDateTime(plan.startsAt)}
        {plan.placeName ? ` · ${plan.placeName}` : ""} · {going} going
      </p>
      {plan.cancelledAt ? (
        <p className="text-sm font-semibold text-red-700">This plan was called off.</p>
      ) : traveller ? (
        <div className="flex justify-center">
          <PlanRsvp token={token} current={null} goTo />
        </div>
      ) : (
        <div className="space-y-3">
          <Link
            href="/signup"
            className="block rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
          >
            Join Wano to answer
          </Link>
          <Link href={`/login?next=${next}`} className="block text-sm text-ink/60 hover:text-ink">
            I already have an account
          </Link>
        </div>
      )}
    </main>
  );
}
