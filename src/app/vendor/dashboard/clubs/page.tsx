import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { getAllInterests, getVendorClubs } from "@/lib/data/social";
import { getSession } from "@/lib/session";
import { ClubForm } from "./club-form";

const statusTextStyles: Record<string, string> = {
  pending: "text-ember",
  approved: "text-ink",
  rejected: "text-red-600",
};

export default async function VendorClubsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [interests, myClubs] = await Promise.all([getAllInterests(), getVendorClubs(vendorProfile.id)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink md:text-3xl">Clubs</h1>
        <p className="mt-1 text-sm text-ink/60">
          Register a Wano Club for your business — a community members can join. New clubs need admin
          approval before they go live.
        </p>
      </div>

      <ClubForm interests={interests} />

      <section>
        <h2 className="font-serif-editorial text-lg text-ink">Your clubs</h2>
        {myClubs.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">No clubs submitted yet.</p>
        ) : (
          <div className="mt-3 border-t border-ink/10">
            {myClubs.map(({ club, interest }) => (
              <div key={club.id} className="flex items-center justify-between gap-4 border-b border-ink/10 py-4">
                <div>
                  <p className="text-sm font-medium text-ink">{club.name}</p>
                  <p className="text-xs text-ink/50">{interest.label}</p>
                  {club.reviewNotes && (
                    <p className="mt-1 text-xs text-ink/50">Note: {club.reviewNotes}</p>
                  )}
                </div>
                <span className={`eyebrow ${statusTextStyles[club.status]}`}>{club.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
