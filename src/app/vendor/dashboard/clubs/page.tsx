import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { getAllInterests, getVendorClubs } from "@/lib/data/social";
import { getSession } from "@/lib/session";
import { ClubForm } from "./club-form";

const statusStyles: Record<string, string> = {
  pending: "bg-marigold-100 text-marigold-800",
  approved: "bg-forest-100 text-forest-800",
  rejected: "bg-red-100 text-red-700",
};

export default async function VendorClubsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [interests, myClubs] = await Promise.all([getAllInterests(), getVendorClubs(vendorProfile.id)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Clubs</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Register a Wano Club for your business — a community members can join. New clubs need admin
          approval before they go live.
        </p>
      </div>

      <ClubForm interests={interests} />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Your clubs</h2>
        {myClubs.length === 0 ? (
          <p className="text-sm text-forest-800/60">No clubs submitted yet.</p>
        ) : (
          myClubs.map(({ club, interest }) => (
            <div
              key={club.id}
              className="flex items-center justify-between rounded-2xl border border-forest-900/10 bg-white p-4"
            >
              <div>
                <p className="font-medium text-forest-900">{club.name}</p>
                <p className="text-xs text-forest-800/50">{interest.label}</p>
                {club.reviewNotes && (
                  <p className="mt-1 text-xs text-forest-800/50">Note: {club.reviewNotes}</p>
                )}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[club.status]}`}>
                {club.status}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
