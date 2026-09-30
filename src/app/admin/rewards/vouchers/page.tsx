import Link from "next/link";
import { getAllVendorProfilesForAdmin } from "@/lib/data/admin";
import { searchVouchersForAdmin } from "@/lib/data/rewards";
import { requireAdminPage } from "@/lib/auth";
import type { RewardDiscountType } from "@/lib/reward-format";
import { VoucherRow } from "./voucher-row";

const STATUS_OPTIONS = ["claimed", "redeemed", "expired", "void"] as const;

export default async function AdminVouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; q?: string; vendor?: string; status?: string }>;
}) {
  await requireAdminPage("/admin/rewards/vouchers");
  const params = await searchParams;
  const hasFilters = Boolean(params.code || params.q || params.vendor || params.status);

  const [vendors, results] = await Promise.all([
    getAllVendorProfilesForAdmin(),
    hasFilters
      ? searchVouchersForAdmin({
          code: params.code,
          travellerQuery: params.q,
          vendorProfileId: params.vendor,
          status: params.status as (typeof STATUS_OPTIONS)[number] | undefined,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">Voucher search</h1>
        <p className="mt-1 text-sm text-ink/60">
          Look up a voucher by code, traveller, or venue. Voiding requires a reason and only works
          on an unredeemed voucher.
        </p>
      </div>

      <form className="grid gap-3 border border-ink/10 bg-white p-4 sm:grid-cols-4">
        <div>
          <label className="text-sm font-medium text-ink">Code</label>
          <input
            name="code"
            defaultValue={params.code}
            placeholder="WANO-AB2C"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Traveller</label>
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Name or email"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Venue</label>
          <select
            name="vendor"
            defaultValue={params.vendor ?? ""}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="">Any venue</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.businessName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Status</label>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="">Any status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="col-span-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 sm:w-fit"
        >
          Search
        </button>
      </form>

      <div className="space-y-3">
        {!hasFilters ? (
          <p className="text-sm text-ink/60">Enter a code, traveller, venue, or status to search.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-ink/60">No vouchers matched.</p>
        ) : (
          results.map(({ userReward, reward, user }) => (
            <VoucherRow
              key={userReward.id}
              userRewardId={userReward.id}
              code={userReward.redemptionCode}
              status={userReward.status}
              travellerName={user.name}
              travellerEmail={user.email}
              rewardTitle={reward.title}
              discountType={reward.discountType as RewardDiscountType}
              discountValue={reward.discountValue}
              minBillMinor={reward.minBillMinor}
              claimedAt={userReward.claimedAt}
              redeemedAt={userReward.redeemedAt}
              billAmountMinor={userReward.billAmountMinor}
              discountAmountMinor={userReward.discountAmountMinor}
              voidReason={userReward.voidReason}
            />
          ))
        )}
      </div>
    </div>
  );
}
