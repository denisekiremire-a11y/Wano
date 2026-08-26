import { getAllTravellersWithProgress } from "@/lib/data/admin";
import { TrophyIcon } from "@/components/icons";

export default async function AdminTravellersPage() {
  const travellers = await getAllTravellersWithProgress();
  const qualifiers = travellers.filter((t) => t.grandPrizeQualified);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Travellers</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Every registered member, their Passport progress, and grand-prize eligibility.
        </p>
      </div>

      {qualifiers.length > 0 && (
        <section className="rounded-2xl border border-marigold-400 bg-marigold-50 p-5">
          <div className="flex items-center gap-2">
            <TrophyIcon className="h-6 w-6 text-marigold-700" />
            <h2 className="font-display font-semibold text-forest-900">
              {qualifiers.length} grand-prize entrant{qualifiers.length === 1 ? "" : "s"}
            </h2>
          </div>
          <p className="mt-1 text-sm text-forest-800/70">
            Collected all 5 stamps — eligible for the draw.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-forest-900">
            {qualifiers.map((t) => (
              <li key={t.traveller.id}>
                {t.user.name} — <span className="text-forest-800/60">{t.user.email}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-2">
        {travellers.map((t) => (
          <div
            key={t.traveller.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-forest-900/10 bg-white p-4"
          >
            <div>
              <p className="font-medium text-forest-900">{t.user.name}</p>
              <p className="text-sm text-forest-800/60">{t.user.email}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-forest-800/70">
              <span>
                {t.stampCount} / {t.totalJourneys} stamps
              </span>
              <span>{t.bookingCount} bookings</span>
              <span>{t.challengeCount} challenges</span>
              {t.grandPrizeQualified && (
                <span className="rounded-full bg-marigold-100 px-2.5 py-1 text-xs font-medium text-marigold-800">
                  Grand prize
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
