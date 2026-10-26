import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { cancelPlanAction, startGroupBookingAction } from "@/lib/actions/plan-actions";
import { getPlanView, type PlanStatus } from "@/lib/data/plans";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { formatKampalaDateTime } from "@/lib/kampala-time";
import { PlanRsvp } from "@/components/plans/plan-rsvp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const GROUP_LABEL: Record<PlanStatus, string> = { going: "Going", maybe: "Maybe", no: "Can't make it" };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  const { id } = await params;
  const plan = await getPlanView({ id });
  if (!plan || !traveller) notFound();
  const isMaker = plan.creatorId === traveller.id;
  const mine = plan.members.find((m) => m.travellerId === traveller.id) ?? null;
  // Only the maker and people who opened the invite can see a plan.
  if (!isMaker && !mine) notFound();

  const going = plan.members.filter((m) => m.status === "going");
  const inviteUrl = `${APP_URL}/plans/join/${plan.inviteToken}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `${plan.title}, ${formatKampalaDateTime(plan.startsAt)}. Are you in? ${inviteUrl}`,
  )}`;

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-xl space-y-6 px-4 py-10 md:px-6">
      <Link href="/plans" className="eyebrow text-ink/40 hover:text-ink">
        ← Plans
      </Link>
      <div>
        <p className="eyebrow text-ember">{formatKampalaDateTime(plan.startsAt)}</p>
        <h1 className="font-serif-editorial mt-2 text-3xl text-ink">{plan.title}</h1>
        {plan.placeName && plan.placeHref && (
          <Link href={plan.placeHref} className="mt-1 inline-block text-sm text-ember hover:underline">
            {plan.placeName} →
          </Link>
        )}
        {plan.cancelledAt && <p className="mt-2 text-sm font-semibold text-red-700">This plan was called off.</p>}
        {plan.note && <p className="mt-3 text-sm text-ink/70">“{plan.note}”</p>}
      </div>

      {!plan.cancelledAt && (
        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <p className="text-sm font-medium text-ink">Are you in?</p>
          <PlanRsvp token={plan.inviteToken} current={mine?.status ?? null} />
        </section>
      )}

      <section className="space-y-2 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Who&apos;s coming</h2>
        {(["going", "maybe", "no"] as PlanStatus[]).map((s) => {
          const people = plan.members.filter((m) => m.status === s);
          if (people.length === 0) return null;
          return (
            <p key={s} className="text-sm text-ink/70">
              <span className="font-semibold text-ink">{GROUP_LABEL[s]} ({people.length}):</span>{" "}
              {people.map((p) => p.name).join(", ")}
            </p>
          );
        })}
      </section>

      {!plan.cancelledAt && (
        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Invite friends</h2>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-[#1f7a4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#186440]"
          >
            Share on WhatsApp
          </a>
          <p className="break-all font-mono-data text-xs text-ink/50">{inviteUrl}</p>
        </section>
      )}

      {isMaker && !plan.cancelledAt && (
        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Book for the group</h2>
          {plan.bookingId ? (
            <p className="text-sm text-ink/70">Booked. Everyone going is on the booking and pays at the venue.</p>
          ) : plan.placeHref ? (
            <>
              <p className="text-sm text-ink/60">
                Book for {going.length} {going.length === 1 ? "person" : "people"} going. Friends on the booking get the
                same stamp and XP as you, and everyone pays their own share at the venue.
              </p>
              <form action={startGroupBookingAction.bind(null, plan.id)}>
                <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85">
                  Book for {going.length} →
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-ink/60">This plan isn&apos;t linked to a place, so there&apos;s nothing to book.</p>
          )}
          <form action={cancelPlanAction.bind(null, plan.id)}>
            <button className="text-sm text-ink/50 hover:text-red-700">Call off the plan</button>
          </form>
        </section>
      )}
    </main>
  );
}
