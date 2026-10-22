import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getTrailById, getTrailListings } from "@/lib/data/trails";
import { getAllListingsForAdmin } from "@/lib/data/admin";
import { AttachListingForm } from "./attach-listing-form";
import { DetachListingButton } from "./detach-listing-button";
import { TrailDetailsForm } from "./trail-details-form";

export default async function AdminTrailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("/admin/trails");
  const { id } = await params;

  const trail = await getTrailById(id);
  if (!trail) notFound();

  const [trailListingRows, allListings] = await Promise.all([getTrailListings(id), getAllListingsForAdmin()]);
  const attachedListingIds = new Set(trailListingRows.map((r) => r.listing.id));
  const availableListings = allListings
    .filter((l) => !attachedListingIds.has(l.listing.id))
    .map((l) => ({ id: l.listing.id, title: l.listing.title, businessName: l.vendor.businessName }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/trails" className="eyebrow text-ink/40 hover:text-ink">
          ← Trails
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">{trail.name}</h1>
      </div>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Details</h2>
        <TrailDetailsForm trail={trail} />
      </section>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Listings ({trailListingRows.length})</h2>
        <AttachListingForm trailId={id} options={availableListings} />
        <div className="border-t border-ink/10">
          {trailListingRows.map(({ trailListingId, listing }) => (
            <div key={trailListingId} className="flex items-center justify-between border-b border-ink/10 py-3">
              <p className="text-sm text-ink">{listing.title}</p>
              <DetachListingButton trailListingId={trailListingId} />
            </div>
          ))}
          {trailListingRows.length === 0 && (
            <p className="py-4 text-sm text-ink/60">No listings attached yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
