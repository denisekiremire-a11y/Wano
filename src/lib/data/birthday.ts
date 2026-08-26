import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { birthdayPerks } from "@/db/schema";

export type BirthdayPerk = typeof birthdayPerks.$inferSelect;

export async function getBirthdayPerksForListing(listingId: string) {
  return db
    .select()
    .from(birthdayPerks)
    .where(and(eq(birthdayPerks.listingId, listingId), eq(birthdayPerks.active, true)));
}

/** Bulk version for a set of listings — avoids N+1 queries when rendering a
 * grid of cards. */
export async function getBirthdayPerksForListings(listingIds: string[]) {
  const map = new Map<string, BirthdayPerk[]>();
  if (listingIds.length === 0) return map;

  const rows = await db
    .select()
    .from(birthdayPerks)
    .where(and(inArray(birthdayPerks.listingId, listingIds), eq(birthdayPerks.active, true)));

  for (const row of rows) {
    const list = map.get(row.listingId) ?? [];
    list.push(row);
    map.set(row.listingId, list);
  }
  return map;
}

/** Pure eligibility check — no DB access. Dates are the "YYYY-MM-DD" strings
 * Drizzle returns for Postgres `date` columns; only month/day need to match
 * for a birthday, so a member doesn't need to re-enter their birth year to
 * qualify on the day itself. */
export function checkBirthdayEligibility(
  dateOfBirth: string | null,
  visitDate: string | null,
  partySize: number | null,
  minPartySize: number,
): { eligible: boolean; reason: string } {
  if (!dateOfBirth) {
    return { eligible: false, reason: "No birthday on file for this member yet." };
  }
  if (!visitDate) {
    return { eligible: false, reason: "No visit date given with this booking." };
  }
  if (dateOfBirth.slice(5, 10) !== visitDate.slice(5, 10)) {
    return { eligible: false, reason: "Visit date doesn't fall on the member's birthday." };
  }
  if (!partySize || partySize < minPartySize) {
    return {
      eligible: false,
      reason: `Party size (${partySize ?? "not given"}) is below the minimum of ${minPartySize}.`,
    };
  }
  return { eligible: true, reason: "Birthday matches and party size qualifies." };
}
