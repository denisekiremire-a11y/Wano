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
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Link href="/social" className="text-sm text-nile-700 hover:underline">
        ← Social
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-forest-900">{interest.label}</h1>
      <p className="mt-1 text-sm text-forest-800/60">
        {clubs.length} {clubs.length === 1 ? "club" : "clubs"} in this category.
      </p>

      <section className="mt-6 space-y-3">
        {clubs.length === 0 ? (
          <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            No clubs here yet.{" "}
            <Link href="/social/clubs/apply" className="font-medium text-nile-700 hover:underline">
              Start one
            </Link>
            .
          </p>
        ) : (
          clubs.map(({ club, vendorProfile, memberCount, joined }) => (
            <div key={club.id} className="rounded-2xl border border-forest-900/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/social/clubs/${club.id}`}
                    className="font-display text-lg font-semibold text-forest-900 hover:underline"
                  >
                    {club.name}
                  </Link>
                  <p className="mt-1 text-sm text-forest-800/70">{club.description}</p>
                  {vendorProfile && (
                    <p className="mt-1 text-xs text-forest-800/50">Run by {vendorProfile.businessName}</p>
                  )}
                  <p className="mt-1 text-xs text-forest-800/50">
                    {memberCount} {memberCount === 1 ? "member" : "members"}
                  </p>
                </div>
                <ClubButton clubId={club.id} initialJoined={joined} />
              </div>
            </div>
          ))
        )}
      </section>

      <Link
        href="/social/clubs/apply"
        className="mt-4 block rounded-xl border border-dashed border-forest-900/20 p-4 text-center text-sm font-medium text-forest-800/70 hover:border-forest-900/40"
      >
        + Start another club in {interest.label}
      </Link>
    </main>
  );
}
