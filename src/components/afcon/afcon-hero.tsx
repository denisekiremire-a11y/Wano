"use client";

import { AfconCountdown } from "@/components/afcon/countdown";
import { useAnchor } from "@/components/afcon/anchor-provider";
import { STADIUM_ANCHORS } from "@/lib/afcon/anchors";

const PLATE_BASE =
  "flex-1 min-w-[220px] rounded-2xl border-2 p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none";
const PLATE_ACTIVE = "border-gold bg-white/15";
const PLATE_INACTIVE = "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10";

/** The AFCON 2027 landing band, gated behind AFCON_CLUB_ENABLED. The two
 * stadium plates ARE the anchor picker (not decoration) — picking one here
 * sets the same anchor the Journeys page's AnchorBar reads, so a traveller
 * who picks Hoima here immediately sees Albertine-first ordering there. */
export function AfconHero() {
  const { anchor, gpsLoading, gpsError, setStadiumAnchor, setGpsAnchor } = useAnchor();

  return (
    <section className="relative overflow-hidden bg-ink">
      <div
        className="absolute inset-0 opacity-50"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 10%, rgba(226,165,60,0.3), transparent 45%), radial-gradient(circle at 90% 90%, rgba(225,83,31,0.28), transparent 45%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow text-gold">AFCON 2027 · Kampala</p>
          <AfconCountdown />
        </div>

        <h2 className="font-editorial mt-4 max-w-xl text-2xl font-bold text-white md:text-3xl">
          Uganda hosts two venues. Pick the one closest to your trip.
        </h2>
        <p className="mt-2 max-w-xl text-sm text-white/70">
          Each stadium opens a different circuit — choose one and Wano reorders places and journeys by
          how close they are to it.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {Object.values(STADIUM_ANCHORS).map((stadium) => {
            const active = anchor?.id === stadium.id;
            return (
              <button
                key={stadium.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStadiumAnchor(stadium.id)}
                className={`${PLATE_BASE} ${active ? PLATE_ACTIVE : PLATE_INACTIVE}`}
              >
                <p className="eyebrow text-gold">{stadium.circuit}</p>
                <p className="font-editorial mt-1 text-lg font-bold text-white">{stadium.label}</p>
                <p className="mt-1.5 text-xs text-white/60">{stadium.circuitDescription}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={anchor?.id === "gps"}
            onClick={setGpsAnchor}
            disabled={gpsLoading}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none disabled:opacity-60 ${
              anchor?.id === "gps"
                ? "border-gold bg-gold/15 text-gold"
                : "border-white/20 text-white/80 hover:border-white/40"
            }`}
          >
            {gpsLoading ? "Locating…" : "Or measure from where I am"}
          </button>
          {gpsError && <p className="text-xs text-red-300">{gpsError}</p>}
        </div>

        <p className="mt-6 max-w-xl text-xs text-white/50">
          This isn&apos;t a countdown clock we switch off in July — Wano keeps working for Uganda travel,
          bookings, and rewards long after the final whistle.
        </p>
      </div>
    </section>
  );
}
