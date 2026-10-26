// Kampala is UTC+3 all year (no daylight saving), so a fixed offset is exact.
// The server usually runs in UTC, so "today" must be worked out in Kampala
// time or an event at 23:30 Kampala would show up as tomorrow.
export const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the Kampala calendar day containing `now`, as a UTC instant. */
export function kampalaStartOfDay(now: Date): Date {
  const local = now.getTime() + KAMPALA_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - KAMPALA_OFFSET_MS);
}

/** [start, end) of the Kampala day containing `now`. */
export function kampalaDayBounds(now: Date): { start: Date; end: Date } {
  const start = kampalaStartOfDay(now);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Day of week in Kampala, 0 = Sunday … 6 = Saturday. */
export function kampalaWeekday(now: Date): number {
  return new Date(now.getTime() + KAMPALA_OFFSET_MS).getUTCDay();
}

/** The coming weekend (Friday 00:00 to Monday 00:00, Kampala time), starting
 * no earlier than tomorrow — today already has its own section. */
export function kampalaUpcomingWeekend(now: Date): { start: Date; end: Date } {
  const today = kampalaStartOfDay(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const weekday = kampalaWeekday(now);
  // Days from today to the next Friday (0 if today is Friday).
  const toFriday = (5 - weekday + 7) % 7;
  // Fri/Sat → the rest of the current weekend; Sunday has nothing left after
  // today, so it looks ahead to next weekend like any weekday.
  const inWeekend = weekday === 5 || weekday === 6;
  const fridayStart = inWeekend
    ? new Date(today.getTime() - ((weekday + 2) % 7) * DAY_MS)
    : new Date(today.getTime() + toFriday * DAY_MS);
  const end = new Date(fridayStart.getTime() + 3 * DAY_MS);
  const start = fridayStart > tomorrow ? fridayStart : tomorrow;
  return { start, end };
}

/** Parses a `<input type="datetime-local">` value ("2026-12-03T19:30") as
 * Kampala time. Returns null for anything malformed. */
export function parseKampalaLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi) - KAMPALA_OFFSET_MS;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Start times for a weekly series: `first`, then every 7 days, `weeks`
 * occurrences in total. Kampala has no DST, so +7 days keeps the same
 * local time every week. */
export function weeklyOccurrences(first: Date, weeks: number): Date[] {
  const n = Math.max(1, Math.floor(weeks));
  return Array.from({ length: n }, (_, i) => new Date(first.getTime() + i * 7 * DAY_MS));
}

/** "19:30" in Kampala time. */
export function formatKampalaTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kampala" });
}

/** "Sat 19:30" in Kampala time. */
export function formatKampalaDayTime(date: Date): string {
  const day = date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Africa/Kampala" });
  return `${day} ${formatKampalaTime(date)}`;
}

/** "Tue 27 Oct, 19:30" in Kampala time — for lists that run past one week. */
export function formatKampalaDateTime(date: Date): string {
  const day = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Kampala" });
  return `${day}, ${formatKampalaTime(date)}`;
}
