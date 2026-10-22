import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllEventsForAdmin, getAllListingsForAdmin, getAllVendorProfilesForAdmin } from "@/lib/data/admin";
import { getRewardForAdmin } from "@/lib/data/rewards";
import { requireAdminPage } from "@/lib/auth";
import { RewardEditForm } from "./reward-edit-form";

export default async function AdminRewardEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("/admin/rewards");
  const { id } = await params;

  const [reward, listingOptions, eventOptions, vendorOptions] = await Promise.all([
    getRewardForAdmin(id),
    getAllListingsForAdmin(),
    getAllEventsForAdmin(),
    getAllVendorProfilesForAdmin(),
  ]);
  if (!reward) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">Edit reward</h1>
        <p className="mt-1 text-sm text-ink/60">{reward.target?.title ?? "Unknown target"}</p>
      </div>

      <RewardEditForm
        reward={reward}
        listingOptions={listingOptions.map((l) => ({
          id: l.listing.id,
          title: l.listing.title,
          businessName: l.vendor.businessName,
        }))}
        eventOptions={eventOptions.map((e) => ({ id: e.id, title: e.title }))}
        vendorOptions={vendorOptions}
      />
    </div>
  );
}
