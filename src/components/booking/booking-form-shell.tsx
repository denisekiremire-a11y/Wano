import Link from "next/link";
import { previewBookingAction } from "@/lib/actions/booking-actions";
import { formatRewardDiscount } from "@/lib/reward-format";

export function BookingFormShell({
  listingId,
  journeyId,
  submitLabel,
  children,
}: {
  listingId: string;
  journeyId?: string | null;
  submitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <form action={previewBookingAction} className="max-w-md space-y-3 rounded-2xl border border-forest-900/10 bg-white p-4">
      <input type="hidden" name="listingId" value={listingId} />
      {journeyId && <input type="hidden" name="journeyId" value={journeyId} />}
      {children}
      <button
        type="submit"
        className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
      >
        {submitLabel} →
      </button>
    </form>
  );
}

export function RewardSelect({
  myClaimedRewards,
}: {
  myClaimedRewards: { userReward: { id: string }; reward: { title: string; discountType: "percent" | "fixed" | "freebie"; discountValue: string | null } }[];
}) {
  if (myClaimedRewards.length === 0) return null;
  return (
    <div>
      <label htmlFor="userRewardId" className="text-xs font-medium text-forest-900">
        Apply a reward (optional)
      </label>
      <select
        id="userRewardId"
        name="userRewardId"
        defaultValue=""
        className="mt-1 w-full rounded-md border border-forest-900/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-forest-600"
      >
        <option value="">None</option>
        {myClaimedRewards.map(({ userReward, reward }) => (
          <option key={userReward.id} value={userReward.id}>
            {reward.title} — {formatRewardDiscount(reward.discountType, reward.discountValue)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-forest-800/50">
        The venue still confirms it in person via your voucher&apos;s QR or code.
      </p>
    </div>
  );
}

export function BirthdayPerkBanner({
  title,
  hasBirthdaySet,
}: {
  title: string;
  hasBirthdaySet: boolean;
}) {
  return (
    <div className="rounded-lg bg-marigold-50 p-3">
      <p className="text-xs font-medium text-marigold-900">
        🎂 {title} — booking on your birthday unlocks this automatically.
      </p>
      {!hasBirthdaySet && (
        <p className="mt-1 text-[11px] text-marigold-800/80">
          <Link href="/passport?tab=account" className="underline">
            Add your birthday to your profile
          </Link>{" "}
          so the venue can confirm it&apos;s really your day.
        </p>
      )}
    </div>
  );
}
