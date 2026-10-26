import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CREW_MAX, getCrewInvite, getMyCrew } from "@/lib/data/crews";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getSession } from "@/lib/session";
import { JoinCrewButton } from "@/components/crews/crew-forms";

/** Where a crew's WhatsApp invite lands. */
export default async function JoinCrewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const crew = await getCrewInvite(token);
  if (!crew) notFound();
  const session = await getSession();
  const traveller = session?.role === "traveller" ? await getTravellerProfileByUserId(session.userId) : null;
  if (traveller && crew.members.some((m) => m.travellerId === traveller.id)) redirect("/crew");
  const current = traveller ? await getMyCrew(traveller.id) : null;
  const owner = crew.members.find((m) => m.role === "owner")?.name ?? "A friend";
  const next = encodeURIComponent(`/crew/join/${token}`);

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-md space-y-6 px-4 py-12 text-center md:px-6">
      <p className="eyebrow text-ember">{owner} invited you to their crew</p>
      <h1 className="font-serif-editorial text-3xl text-ink">{crew.name}</h1>
      <p className="text-sm text-ink/60">
        {crew.members.length} of {CREW_MAX} · {crew.members.map((m) => m.name).join(", ")}
      </p>
      <p className="text-sm text-ink/70">
        A crew shares one Passport. You&apos;ll see each other&apos;s XP, neighbourhood stamps and weekly challenges.
      </p>
      {crew.full ? (
        <p className="text-sm font-semibold text-ink">This crew is full.</p>
      ) : current ? (
        <div className="space-y-2">
          <p className="text-sm text-ink/70">
            You&apos;re in <span className="font-semibold">{current.name}</span>. You can be in one crew at a time.
          </p>
          <Link href="/crew" className="text-sm font-semibold text-ember hover:underline">
            Go to my crew →
          </Link>
        </div>
      ) : traveller ? (
        <JoinCrewButton token={token} name={crew.name} />
      ) : (
        <div className="space-y-3">
          <Link
            href="/signup"
            className="block rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
          >
            Join Wano to join the crew
          </Link>
          <Link href={`/login?next=${next}`} className="block text-sm text-ink/60 hover:text-ink">
            I already have an account
          </Link>
        </div>
      )}
    </main>
  );
}
