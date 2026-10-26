// Daily Drop rules, kept free of the database so they are unit-tested.
// Agreed with Kire on 26 Oct 2026: each Drop is announced at 17:00 Kampala
// time the day before, so people can plan; the first N claim a voucher and
// redeem it at the venue during the Drop day's window.
import { KAMPALA_OFFSET_MS } from "@/lib/kampala-time";

export const DROP_ANNOUNCE_HOUR = 17;
export const DROP_DEFAULT_CAP = 20;
export const DROP_DEFAULT_REDEEM_FROM = "17:00";
export const DROP_DEFAULT_REDEEM_UNTIL = "23:00";
/** Three no-shows inside this many days pause Drop access. */
export const DROP_NO_SHOW_WINDOW_DAYS = 30;
export const DROP_NO_SHOW_LIMIT = 3;
export const DROP_PAUSE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC instant for a Kampala wall-clock time on a Kampala date. */
function kampalaInstant(dateIso: string, hhmm: string, plusDays = 0): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - KAMPALA_OFFSET_MS + plusDays * DAY_MS);
}

/** "2026-12-04" for the Kampala date of `now` (+ offset days). */
export function kampalaDateIso(now: Date, plusDays = 0): string {
  return new Date(now.getTime() + KAMPALA_OFFSET_MS + plusDays * DAY_MS).toISOString().slice(0, 10);
}

/** Claim and redeem times for a Drop on `dropDate`. A redeem window that
 * ends at or before it starts runs past midnight (e.g. 20:00 to 01:00). */
export function dropWindows(dropDate: string, redeemFrom: string, redeemUntil: string) {
  const from = kampalaInstant(dropDate, redeemFrom);
  let until = kampalaInstant(dropDate, redeemUntil);
  if (until <= from) until = new Date(until.getTime() + DAY_MS);
  const claimsOpenAt = kampalaInstant(dropDate, `${String(DROP_ANNOUNCE_HOUR).padStart(2, "0")}:00`, -1);
  return { claimsOpenAt, redeemFrom: from, redeemUntil: until };
}

export type DropPhase = "announced_soon" | "claimable" | "live" | "over";

/** Where a Drop is in its life: not yet announced, open to claim (before
 * its day), live (redeem window open; still claimable if any left), over. */
export function dropPhase(
  drop: { claimsOpenAt: Date; redeemFrom: Date; redeemUntil: Date },
  now: Date,
): DropPhase {
  if (now < drop.claimsOpenAt) return "announced_soon";
  if (now >= drop.redeemUntil) return "over";
  if (now >= drop.redeemFrom) return "live";
  return "claimable";
}

/** When a member's Drop access is paused because of no-shows, or null.
 * `noShows` are the expiry times of Drop vouchers they claimed and never
 * redeemed. Three inside 30 days pause access for 14 days from the third. */
export function dropPausedUntil(noShows: Date[], now: Date): Date | null {
  const since = now.getTime() - DROP_NO_SHOW_WINDOW_DAYS * DAY_MS;
  const recent = noShows
    .filter((d) => d.getTime() >= since && d.getTime() <= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  if (recent.length < DROP_NO_SHOW_LIMIT) return null;
  const trigger = recent[recent.length - 1];
  const until = new Date(trigger.getTime() + DROP_PAUSE_DAYS * DAY_MS);
  return until > now ? until : null;
}
