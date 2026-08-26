import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubButton } from "@/components/club-button";
import { requireRole } from "@/lib/auth";
import { getClubByKey, getClubMembers, isClubMember } from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function ClubDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const { key } = await params;
  const interest = await getClubByKey(key);
  if (!interest) notFound();

  const [members, joined] = await Promise.all([
    getClubMembers(interest.id),
    isClubMember(travellerProfile.id, interest.id),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Link href="/social" className="text-sm text-nile-700 hover:underline">
        ← Social
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">{interest.label}</h1>
          <p className="mt-1 text-sm text-forest-800/60">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <ClubButton clubKey={interest.key} initialJoined={joined} />
      </div>

      <section className="mt-6 space-y-2">
        {members.length === 0 ? (
          <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            No members yet — be the first to join.
          </p>
        ) : (
          members.map(({ traveller, user }) => (
            <div
              key={traveller.id}
              className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-forest-900">{traveller.displayName}</p>
                <p className="text-xs text-forest-800/50">@{user.username}</p>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
