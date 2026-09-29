import { getAllTravellersWithProgress } from "@/lib/data/admin";
import { ADMIN_MIN_LEVEL, levelMeets } from "@/lib/admin-permissions";
import { requireAdminPage } from "@/lib/auth";
import { TravellerNameEditor } from "./traveller-name-editor";

export default async function AdminTravellersPage() {
  const session = await requireAdminPage("/admin/travellers");
  const canEditTravellers = levelMeets(session.adminLevel, ADMIN_MIN_LEVEL["travellers:write"]);
  const travellers = await getAllTravellersWithProgress();
  const qualifiers = travellers.filter((t) => t.grandPrizeQualified);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Travellers</h1>
        <p className="mt-1 text-sm text-ink/60">
          Every registered member, their Passport progress, and grand-prize eligibility.
        </p>
      </div>

      {qualifiers.length > 0 && (
        <section className="border border-ink/10 bg-white p-5">
          <p className="eyebrow text-ember">Grand prize</p>
          <h2 className="mt-1 font-serif-editorial text-lg text-ink">
            <span className="font-mono-data">{qualifiers.length}</span> entrant{qualifiers.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            Collected all 5 stamps — eligible for the draw.
          </p>
          <ul className="mt-3 border-t border-ink/10">
            {qualifiers.map((t) => (
              <li key={t.traveller.id} className="border-b border-ink/10 py-2 text-sm text-ink">
                {t.user.name} — <span className="text-ink/50">{t.user.email}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-ink/10">
        {travellers.map((t) => (
          <div
            key={t.traveller.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 py-4"
          >
            <div>
              <TravellerNameEditor travellerId={t.traveller.id} initialName={t.user.name} canEdit={canEditTravellers} />
              <p className="text-sm text-ink/50">{t.user.email}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-ink/60">
              <span className="font-mono-data">
                {t.stampCount} / {t.totalJourneys} stamps
              </span>
              <span className="font-mono-data">{t.bookingCount} bookings</span>
              <span className="font-mono-data">{t.challengeCount} challenges</span>
              {t.grandPrizeQualified && <span className="eyebrow text-ember">Grand prize</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
