import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getAllTrailsForAdmin, getTrailListings } from "@/lib/data/trails";
import { CreateTrailForm } from "./create-trail-form";
import { SeedTrailButton } from "./seed-trail-button";

export default async function AdminTrailsPage() {
  await requireAdminPage("/admin/trails");
  const trailRows = await getAllTrailsForAdmin();
  const listingCounts = await Promise.all(
    trailRows.map(async (trail) => ({ trail, count: (await getTrailListings(trail.id)).length })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Trails</h1>
        <p className="mt-1 text-sm text-ink/60">
          A named set of listings that earns a traveller bonus XP once they have a booking at every one.
          Shown as stamps on the Passport.
        </p>
      </div>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">New trail</h2>
        <CreateTrailForm />
      </section>

      <SeedTrailButton />

      <div className="border-t border-ink/10">
        {listingCounts.map(({ trail, count }) => (
          <Link
            key={trail.id}
            href={`/admin/trails/${trail.id}`}
            className="flex items-center justify-between gap-4 border-b border-ink/10 py-4 transition-colors hover:text-ember"
          >
            <div>
              <p className="text-ink">{trail.name}</p>
              <p className="font-mono-data mt-0.5 text-xs text-ink/50">
                {count} {count === 1 ? "listing" : "listings"} · {trail.bonusXp} bonus XP
              </p>
            </div>
            <span className={`eyebrow flex-none ${trail.active ? "text-ink" : "text-ink/30"}`}>
              {trail.active ? "Active" : "Inactive"}
            </span>
          </Link>
        ))}
        {trailRows.length === 0 && <p className="py-6 text-sm text-ink/60">No trails yet.</p>}
      </div>
    </div>
  );
}
