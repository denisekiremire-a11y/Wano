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
  // A Daily Drop's dates live on its daily_drops row; editing the reward
  // here would put the two out of step, so Drops are managed on their page.
  const { source, ...rewardFields } = reward;
  if (source === "drop") {
    return (
      <div className="space-y-3">
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial text-2xl text-ink">{reward.title}</h1>
        <p className="text-sm text-ink/60">
          This is a Daily Drop. Manage it on the{" "}
          <Link href="/admin/drops" className="font-semibold text-ember">
            Daily Drops
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

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
        reward={{ ...rewardFields, source }}
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
