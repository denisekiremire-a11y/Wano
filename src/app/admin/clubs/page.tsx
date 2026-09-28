import { getAllVendorProfilesForAdmin } from "@/lib/data/admin";
import { getAllClubsForAdmin, getAllInterests } from "@/lib/data/social";
import { requireAdminPage } from "@/lib/auth";
import { AdminClubForm } from "./admin-club-form";
import { ClubReviewRow } from "./club-review-row";

export default async function AdminClubsPage() {
  await requireAdminPage("/admin/clubs");
  const [clubRows, interests, vendors] = await Promise.all([
    getAllClubsForAdmin(),
    getAllInterests(),
    getAllVendorProfilesForAdmin(),
  ]);

  const pending = clubRows.filter((r) => r.club.status === "pending");
  const rest = clubRows.filter((r) => r.club.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Clubs</h1>
        <p className="mt-1 text-sm text-ink/60">
          Review vendor-submitted clubs, or create one directly.
        </p>
      </div>

      <AdminClubForm interests={interests} vendors={vendors} />

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif-editorial text-lg text-ink">Pending review</h2>
          {pending.map(({ club, interest, vendorProfile }) => (
            <ClubReviewRow
              key={club.id}
              clubId={club.id}
              name={club.name}
              description={club.description}
              interestLabel={interest.label}
              vendorBusinessName={vendorProfile?.businessName ?? null}
              status={club.status}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">All clubs</h2>
        {rest.length === 0 ? (
          <p className="text-sm text-ink/60">No other clubs yet.</p>
        ) : (
          rest.map(({ club, interest, vendorProfile }) => (
            <ClubReviewRow
              key={club.id}
              clubId={club.id}
              name={club.name}
              description={club.description}
              interestLabel={interest.label}
              vendorBusinessName={vendorProfile?.businessName ?? null}
              status={club.status}
            />
          ))
        )}
      </section>
    </div>
  );
}
