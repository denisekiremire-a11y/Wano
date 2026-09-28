import Link from "next/link";
import { formatRewardDiscount } from "@/lib/reward-format";
import { getVendorRewards } from "@/lib/data/rewards";
import { getSubmissionsForVendor } from "@/lib/data/submissions";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { withRlsContext } from "@/lib/db-context";
import { getSession } from "@/lib/session";
import { WithdrawSubmissionButton } from "../listings/withdraw-submission-button";

export default async function VendorRewardsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [rewardRows, submissions] = await withRlsContext(
    { userId: session!.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) => Promise.all([getVendorRewards(vendorProfile.id, tx), getSubmissionsForVendor(vendorProfile.id, tx)]),
  );

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
          <h1 className="font-serif-editorial text-2xl text-ink">Your rewards</h1>
          <p className="mt-1 text-sm text-ink/60">
            Vouchers members can claim on your listings. New rewards and edits go to the Wano team for review.
          </p>
        </div>
        <Link
          href="/vendor/dashboard/rewards/new"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
        >
          + New reward
        </Link>
      </div>

      {newRewardSubmissions.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif-editorial text-lg text-ink">Awaiting review</h2>
          {newRewardSubmissions.map((s) => (
            <div key={s.id} className="flex items-center justify-between border border-ink/10 bg-white p-4">
              <div>
                <p className="eyebrow text-ember">Pending review</p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {typeof s.payload.title === "string" ? s.payload.title : "New reward"}
                </p>
              </div>
              <WithdrawSubmissionButton submissionId={s.id} kind="reward" />
            </div>
          ))}
        </section>
      )}

      {rejected.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif-editorial text-lg text-ink">Needs changes</h2>
          {rejected.map((s) => (
            <div key={s.id} className="border border-red-200 bg-red-50 p-4">
              <p className="eyebrow text-red-600">Needs changes</p>
              <p className="mt-1 text-sm font-medium text-ink">
                {typeof s.payload.title === "string" ? s.payload.title : "Submission"}
              </p>
              <p className="mt-0.5 text-xs text-red-700">{s.reviewNotes || "Not approved this time."}</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        {rewardRows.length === 0 ? (
          <p className="border border-ink/10 bg-white p-5 text-sm text-ink/60">
            You don&apos;t have any rewards yet.
          </p>
        ) : (
          rewardRows.map((reward) => {
            const pending = pendingByReward.get(reward.id);
            return (
              <div key={reward.id} className="border border-ink/10 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif-editorial text-lg text-ink">{reward.title}</p>
                    <p className="font-mono-data text-sm text-ember">
                      {formatRewardDiscount(reward.discountType, reward.discountValue)}
                    </p>
                    {reward.description && <p className="mt-1 text-sm text-ink/60">{reward.description}</p>}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/50">
                      <span className="font-mono-data">Valid {reward.defaultValidityDays} days after claim</span>
                      <span>·</span>
                      <span className={`eyebrow ${reward.active ? "text-ink" : "text-ember"}`}>
                        {reward.active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/vendor/dashboard/rewards/${reward.id}`}
                    className="flex-none text-sm font-medium text-ember hover:underline"
                  >
                    Edit →
                  </Link>
                </div>
                {pending && (
                  <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3 text-xs text-ink/60">
                    <span>
                      <span className="eyebrow text-ember">Pending review</span> — an edit is waiting on Wano team
                      review, this still shows what&apos;s live.
                    </span>
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
