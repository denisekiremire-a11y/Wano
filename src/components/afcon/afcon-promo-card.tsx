import Link from "next/link";

/** A standing, always-there way to reach the AFCON hub — the season
 * ribbon only shows during the actual buildup/live/matchday/afterglow
 * window, so this is the link that works the rest of the year too.
 * Plain server component (no season/anchor state needed), gated by
 * AFCON_CLUB_ENABLED at the call site like the rest of the campaign. */
export function AfconPromoCard() {
  return (
    <Link
      href="/afcon"
      className="block overflow-hidden rounded-2xl border border-forest-900/10 bg-gradient-to-br from-forest-900 to-forest-700 p-5 text-white transition hover:shadow-lg"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-marigold-300">Wano × AFCON 2027</p>
      <p className="mt-1 font-display text-lg font-semibold">Uganda hosts two stadiums — see what&apos;s on</p>
      <p className="mt-1 text-sm text-forest-100/75">
        Countdown, venues, and the journeys built around the tournament.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-marigold-500 px-4 py-2 text-sm font-semibold text-forest-950">
        Explore AFCON 2027 →
      </span>
    </Link>
  );
}
