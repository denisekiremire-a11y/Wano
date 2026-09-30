import "server-only";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { rewards, userRewards, vendorProfiles } from "@/db/schema";
import { getOwningVendorProfileId } from "./rewards";

export type SettlementRow = {
  vendorProfileId: string;
  businessName: string;
  redemptionCount: number;
  totalDiscountMinor: number;
  wanoShareMinor: number;
  venueShareMinor: number;
};

/** Monday 00:00 of the week containing `date`, and the following Monday
 * (exclusive end) — vendors are paid weekly, so this is the report unit. */
export function getWeekRange(date = new Date(), offsetWeeks = 0) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday + offsetWeeks * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/** Per-vendor redemption counts and discount split for one week — "the
 * venue's share of redeemed discounts" the weekly payout report needs.
 * A voucher's venue isn't a direct column (see getOwningVendorProfileId),
 * so this resolves it per redeemed row — fine at weekly-report volumes. */
export async function getWeeklySettlement(weekStart: Date, weekEnd: Date): Promise<SettlementRow[]> {
  const rows = await db
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(
      and(eq(userRewards.status, "redeemed"), gte(userRewards.redeemedAt, weekStart), lt(userRewards.redeemedAt, weekEnd)),
    );

  const byVendor = new Map<string, SettlementRow>();

  for (const row of rows) {
    const vendorId = await getOwningVendorProfileId(row.userReward.targetType, row.userReward.targetId);
    if (!vendorId) continue;

    const discount = row.userReward.discountAmountMinor ?? 0;
    const wanoShare =
      row.reward.wanoSharePct != null ? Math.round((discount * row.reward.wanoSharePct) / 100) : 0;
    const venueShare = discount - wanoShare;

    const entry = byVendor.get(vendorId) ?? {
      vendorProfileId: vendorId,
      businessName: "",
      redemptionCount: 0,
      totalDiscountMinor: 0,
      wanoShareMinor: 0,
      venueShareMinor: 0,
    };
    entry.redemptionCount += 1;
    entry.totalDiscountMinor += discount;
    entry.wanoShareMinor += wanoShare;
    entry.venueShareMinor += venueShare;
    byVendor.set(vendorId, entry);
  }

  const vendorIds = [...byVendor.keys()];
  if (vendorIds.length > 0) {
    const vendorRows = await db
      .select({ id: vendorProfiles.id, businessName: vendorProfiles.businessName })
      .from(vendorProfiles)
      .where(inArray(vendorProfiles.id, vendorIds));
    for (const v of vendorRows) {
      const entry = byVendor.get(v.id);
      if (entry) entry.businessName = v.businessName;
    }
  }

  return [...byVendor.values()].sort((a, b) => b.venueShareMinor - a.venueShareMinor);
}

function csvEscape(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function settlementToCsv(rows: SettlementRow[]): string {
  const header = ["Venue", "Redemptions", "Total discount (UGX)", "Wano share (UGX)", "Venue share (UGX)"];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [r.businessName, r.redemptionCount, r.totalDiscountMinor, r.wanoShareMinor, r.venueShareMinor]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}
