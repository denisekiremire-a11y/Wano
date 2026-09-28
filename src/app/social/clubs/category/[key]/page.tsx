import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubButton } from "@/components/club-button";
import { requireRole } from "@/lib/auth";
import { getApprovedClubsByCategory } from "@/lib/data/social";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function ClubCategoryPage({ params }: { params: Promise<{ key: string }> }) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const { key } = await params;
  const { interest, clubs } = await getApprovedClubsByCategory(key, travellerProfile.id);
  if (!interest) notFound();

  return (
    <main className="font-editorial-body mx-auto max-w-2xl bg-paper px-4 py-8 md:px-6">
      <Link href="/social" className="eyebrow text-ink/40 hover:text-ink">
        ← Social
      </Link>

      <h1 className="font-serif-editorial mt-3 text-4xl text-ink md:text-5xl">{interest.label}</h1>
      <p className="mt-2 text-sm text-ink/60">
        <span className="font-mono-data">{clubs.length}</span> {clubs.length === 1 ? "club" : "clubs"} in this
        category.
      </p>

      <div className="mt-8 border-t border-ink/10">
        {clubs.length === 0 ? (
          <p className="border-b border-ink/10 py-8 text-center text-sm text-ink/50">
            No clubs here yet.{" "}
            <Link href="/social/clubs/apply" className="font-medium text-ember hover:underline">
              Start one
            </Link>
            .
          </p>
        ) : (
          clubs.map(({ club, vendorProfile, memberCount, joined }) => (
            <div
              key={club.id}
              className="flex items-start justify-between gap-3 border-b border-ink/10 py-6"
            >
              <div>
                <Link
                  href={`/social/clubs/${club.id}`}
                  className="font-serif-editorial text-xl text-ink transition-colors hover:text-ember"
                >
                  {club.name}
                </Link>
                <p className="mt-1 text-sm text-ink/60">{club.description}</p>
                {vendorProfile && (
                  <p className="mt-1 text-xs text-ink/40">Run by {vendorProfile.businessName}</p>
                )}
                <p className="font-mono-data mt-1 text-xs text-ink/40">
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </p>
              </div>
              <ClubButton clubId={club.id} initialJoined={joined} />
            </div>
          ))
        )}
      </div>

      <Link
        href="/social/clubs/apply"
        className="mt-6 block border border-dashed border-ink/20 p-4 text-center text-sm font-medium text-ink/60 transition-colors hover:border-ink/40 hover:text-ink"
      >
        + Start another club in {interest.label}
      </Link>
    </main>
  );
}
