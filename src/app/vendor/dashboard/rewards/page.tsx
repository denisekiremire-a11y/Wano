import Link from "next/link";
import { formatRewardDiscount } from "@/lib/reward-format";
import { getVendorRewards } from "@/lib/data/rewards";
import { getSubmissionsForVendor } from "@/lib/data/submissions";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { WithdrawSubmissionButton } from "../listings/withdraw-submission-button";

export default async function VendorRewardsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [rewardRows, submissions] = await Promise.all([
    getVendorRewards(vendorProfile.id),
    getSubmissionsForVendor(vendorProfile.id),
  ]);

  const rewardSubmissions = submissions.filter((s) => s.entityType === "reward");
  const pendingByReward = new Map(
    rewardSubmissions.filter((s) => s.status === "pending" && s.entityId).map((s) => [s.entityId as string, s]),
  );
  const newRewardSubmissions = rewardSubmissions.filter((s) => s.status === "pending" && s.entityId === null);
  const rejected = rewardSubmissions.filter((s) => s.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Your rewards</h1>
          <p className="mt-1 text-sm text-forest-800/60">
            Vouchers members can claim on your listings. New rewards and edits go to the Wano team for review.
          </p>
        </div>
        <Link
          href="/vendor/dashboard/rewards/new"
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
        >
          + New reward
        </Link>
      </div>

      {newRewardSubmissions.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-forest-900">Awaiting review</h2>
          {newRewardSubmissions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-marigold-300 bg-marigold-50 p-4"
            >
              <p className="text-sm font-medium text-forest-900">
                {typeof s.payload.title === "string" ? s.payload.title : "New reward"}
              </p>
              <WithdrawSubmissionButton submissionId={s.id} kind="reward" />
            </div>
          ))}
        </section>
      )}

      {rejected.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-forest-900">Needs changes</h2>
          {rejected.map((s) => (
            <div key={s.id} className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-forest-900">
                {typeof s.payload.title === "string" ? s.payload.title : "Submission"}
              </p>
              <p className="mt-0.5 text-xs text-red-700">{s.reviewNotes || "Not approved this time."}</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        {rewardRows.length === 0 ? (
          <p className="rounded-xl border border-forest-900/10 bg-white p-5 text-sm text-forest-800/60">
            You don&apos;t have any rewards yet.
          </p>
        ) : (
          rewardRows.map((reward) => {
            const pending = pendingByReward.get(reward.id);
            return (
              <div key={reward.id} className="rounded-2xl border border-forest-900/10 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-semibold text-forest-900">{reward.title}</p>
                    <p className="text-sm text-marigold-800">
                      {formatRewardDiscount(reward.discountType, reward.discountValue)}
                    </p>
                    {reward.description && <p className="mt-1 text-sm text-forest-800/60">{reward.description}</p>}
                    <p className="mt-1 text-xs text-forest-800/50">
                      Valid {reward.defaultValidityDays} days after claim · {reward.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <Link
                    href={`/vendor/dashboard/rewards/${reward.id}`}
                    className="flex-none text-sm font-medium text-nile-700 hover:underline"
                  >
                    Edit →
                  </Link>
                </div>
                {pending && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-marigold-50 px-3 py-2 text-xs text-marigold-900">
                    <span>An edit is waiting on Wano team review — this still shows what&apos;s live.</span>
                    <WithdrawSubmissionButton submissionId={pending.id} kind="reward" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
