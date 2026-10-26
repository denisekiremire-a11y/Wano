import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { leaveCrewAction } from "@/lib/actions/crew-actions";
import { CREW_MAX, getCrewPassport, getMyCrew } from "@/lib/data/crews";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import {
  CreateCrewForm,
  RemoveMemberButton,
  RenameCrewForm,
  ResetInviteButton,
} from "@/components/crews/crew-forms";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata = { title: "My crew" };

/** The shared Passport: a crew's combined XP, stamps and this week's
 * challenges. Members only; one crew per person. */
export default async function CrewPage() {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) return null;
  const crew = await getMyCrew(traveller.id);

  if (!crew) {
    return (
      <main className="font-editorial-body bg-paper mx-auto max-w-xl space-y-6 px-4 py-10 md:px-6">
        <Link href="/passport" className="eyebrow text-ink/40 hover:text-ink">
          ← Passport
        </Link>
        <div>
          <p className="eyebrow text-ember">Crews</p>
          <h1 className="font-serif-editorial mt-2 text-3xl text-ink">Go out as a crew</h1>
          <p className="mt-2 text-sm text-ink/70">
            Up to {CREW_MAX} friends share one Passport: everyone&apos;s XP added up, every neighbourhood any of you has
            stamped, and who has done this week&apos;s challenges. You can be in one crew at a time.
          </p>
        </div>
        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Start a crew</h2>
          <CreateCrewForm />
          <p className="text-xs text-ink/50">
            Got an invite link from a friend? Open it to join their crew instead.
          </p>
        </section>
      </main>
    );
  }

  const passport = await getCrewPassport(crew.members);
  const isOwner = crew.members.some((m) => m.travellerId === traveller.id && m.role === "owner");
  const inviteUrl = `${APP_URL}/crew/join/${crew.inviteToken}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `Join our Wano crew "${crew.name}" and we'll fill one Passport together: ${inviteUrl}`,
  )}`;
  const stamped = passport.areas.filter((a) => a.by.length > 0).length;

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-xl space-y-6 px-4 py-10 md:px-6">
      <Link href="/passport" className="eyebrow text-ink/40 hover:text-ink">
        ← Passport
      </Link>
      <div>
        <p className="eyebrow text-ember">
          Crew · {crew.members.length}/{CREW_MAX}
        </p>
        <h1 className="font-serif-editorial mt-2 text-3xl text-ink">{crew.name}</h1>
      </div>

      <section className="grid grid-cols-3 gap-px overflow-hidden border border-ink/10 bg-ink/10 text-center">
        <div className="bg-white p-4">
          <p className="font-mono-data text-2xl text-ink">{passport.totalXp.toLocaleString("en-UG")}</p>
          <p className="eyebrow mt-1 text-ink/40">Crew XP</p>
        </div>
        <div className="bg-white p-4">
          <p className="font-mono-data text-2xl text-ink">
            {passport.goersThisWeek}/{crew.members.length}
          </p>
          <p className="eyebrow mt-1 text-ink/40">Out this week</p>
        </div>
        <div className="bg-white p-4">
          <p className="font-mono-data text-2xl text-ink">
            {stamped}/{passport.areas.length}
          </p>
          <p className="eyebrow mt-1 text-ink/40">Areas</p>
        </div>
      </section>
      <p className="-mt-3 text-xs text-ink/50">
        Crew XP is everyone&apos;s XP from the last 12 months added up. Each of you still keeps your own.
      </p>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">This week&apos;s challenges</h2>
        {passport.challenges.map(({ challenge, doneBy }) => (
          <div key={challenge.id} className="border-t border-ink/10 pt-3 first:border-0 first:pt-0">
            <p className="text-sm font-medium text-ink">
              {challenge.title} <span className="font-mono-data text-xs text-ink/40">+{challenge.xp} XP each</span>
            </p>
            <p className="text-xs text-ink/60">
              {doneBy.length === 0
                ? "Nobody yet."
                : `${doneBy.length} of ${crew.members.length} done: ${doneBy.join(", ")}`}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Neighbourhood stamps</h2>
        <ul className="grid grid-cols-2 gap-2">
          {passport.areas.map(({ area, by }) => (
            <li
              key={area}
              className={`border p-3 ${by.length ? "border-ember/40 bg-ember/5" : "border-dashed border-ink/15"}`}
            >
              <p className={`text-sm font-medium ${by.length ? "text-ink" : "text-ink/40"}`}>{area}</p>
              <p className="text-xs text-ink/50">{by.length ? by.join(", ") : "Not yet"}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Who&apos;s in</h2>
        <ul>
          {passport.members.map((m) => (
            <li key={m.travellerId} className="flex items-center justify-between gap-3 border-t border-ink/10 py-2 first:border-0">
              <div>
                <p className="text-sm text-ink">
                  {m.name}
                  {m.travellerId === traveller.id && <span className="text-ink/40"> (you)</span>}
                  {m.role === "owner" && <span className="eyebrow ml-2 text-ember">Owner</span>}
                </p>
                <p className="font-mono-data text-xs text-ink/50">
                  {m.xp.toLocaleString("en-UG")} XP · {m.visitsThisWeek}{" "}
                  {m.visitsThisWeek === 1 ? "visit" : "visits"} this week
                </p>
              </div>
              {isOwner && m.travellerId !== traveller.id && (
                <RemoveMemberButton memberId={m.travellerId} name={m.name} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {crew.members.length < CREW_MAX && (
        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Invite friends</h2>
          <p className="text-sm text-ink/60">
            Anyone with this link can join while there&apos;s room. Your crew sees each other&apos;s XP, stamps and
            weekly challenges.
          </p>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-[#1f7a4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#186440]"
          >
            Share on WhatsApp
          </a>
          <p className="break-all font-mono-data text-xs text-ink/50">{inviteUrl}</p>
          {isOwner && <ResetInviteButton />}
        </section>
      )}

      {isOwner && (
        <section className="space-y-2 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Crew name</h2>
          <RenameCrewForm current={crew.name} />
        </section>
      )}

      <form action={leaveCrewAction}>
        <button className="text-sm text-ink/50 hover:text-red-700">
          Leave crew{isOwner && crew.members.length > 1 ? " (the next longest member becomes owner)" : ""}
        </button>
      </form>
    </main>
  );
}
