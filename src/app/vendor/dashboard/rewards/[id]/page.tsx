import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { rewards } from "@/db/schema";
import { getOwningVendorProfileId } from "@/lib/data/rewards";
import { getPendingEditSubmission } from "@/lib/data/submissions";
import { getVendorListings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { VendorRewardForm } from "../vendor-reward-form";

export default async function EditVendorRewardPage({ params }: PageProps<"/vendor/dashboard/rewards/[id]">) {
  const { id } = await params;
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [reward] = await db.select().from(rewards).where(eq(rewards.id, id)).limit(1);
  if (!reward) notFound();
  const owner = await getOwningVendorProfileId(reward.targetType, reward.targetId);
  if (owner !== vendorProfile.id) notFound();

  const [listingRows, pendingSubmission] = await Promise.all([
    getVendorListings(vendorProfile.id),
    getPendingEditSubmission(vendorProfile.id, "reward", id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">{reward.title}</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Changes here go to the Wano team for review — this reward keeps its current terms until then.
        </p>
      </div>

      {pendingSubmission && (
        <div className="rounded-xl border border-marigold-300 bg-marigold-50 p-4 text-sm text-marigold-900">
          You have an edit waiting on review, submitted{" "}
          {new Date(pendingSubmission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.
          Submitting again below replaces that draft.
        </div>
      )}

      <VendorRewardForm
        listingOptions={listingRows.map(({ listing }) => ({ id: listing.id, title: listing.title }))}
        existing={{
          rewardId: reward.id,
          title: reward.title,
          description: reward.description ?? "",
          listingId: reward.targetType === "listing" ? reward.targetId : "",
          discountType: reward.discountType,
          discountValue: reward.discountValue ?? "",
          defaultValidityDays: reward.defaultValidityDays,
        }}
      />
    </div>
  );
}
