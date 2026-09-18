"use client";

import Link from "next/link";
import { AnchorSortedList, type AnchorSortableItem } from "@/components/afcon/anchor-sorted-list";
import { useAnchor } from "@/components/afcon/anchor-provider";
import { DistanceBadge } from "@/components/afcon/distance-badge";
import { PinIcon, VanIcon } from "@/components/icons";
import type { Coordinates } from "@/lib/afcon/anchors";
import { formatListingPrice } from "@/lib/currency";
import { toWhatsAppNumber } from "@/lib/afcon/phone";
import { STADIUM_ANCHORS } from "@/lib/afcon/anchors";

export type TransportOption = {
  id: string;
  title: string;
  priceLabel: string;
  priceMinor: number | null;
  currency: string;
  priceUnit: string | null;
  latitude: string | null;
  longitude: string | null;
  vendorBusinessName: string;
  vendorContactPhone: string | null;
};

const PICKER_BASE =
  "flex-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 motion-reduce:transition-none";
const PICKER_INACTIVE = "border-forest-900/15 bg-white text-forest-800 hover:border-forest-900/30";

function coordinatesFor(option: TransportOption): Coordinates | null {
  const lat = option.latitude != null ? Number(option.latitude) : NaN;
  const lng = option.longitude != null ? Number(option.longitude) : NaN;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

function TransportCard({ option }: { option: TransportOption }) {
  const whatsapp = toWhatsAppNumber(option.vendorContactPhone);
  return (
    <div className="rounded-xl border border-forest-900/10 bg-white p-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <Link href={`/explore/${option.id}`} className="font-medium text-forest-900 hover:underline">
          {option.title}
        </Link>
        <p className="text-sm text-forest-800/70">{option.vendorBusinessName}</p>
        <p className="mt-1 text-xs text-forest-800/50">{formatListingPrice(option)}</p>
        <div className="mt-2">
          <DistanceBadge id={option.id} latitude={option.latitude} longitude={option.longitude} />
        </div>
      </div>
      <div className="mt-3 flex flex-none gap-2 sm:mt-0">
        {option.vendorContactPhone && (
          <a
            href={`tel:${option.vendorContactPhone}`}
            className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-forest-50"
          >
            Call
          </a>
        )}
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-700"
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

/** "How do I actually get here" — an anchor picker (for a visitor who
 * landed straight on a listing page without setting one elsewhere) plus,
 * once an anchor is set, the transport-type listings on Wano ranked by
 * how close their own base is to that anchor — the practical reading of
 * "who can pick me up from the stadium". */
export function GettingThere({ transportOptions }: { transportOptions: TransportOption[] }) {
  const { anchor, gpsLoading, gpsError, setStadiumAnchor, setGpsAnchor } = useAnchor();

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
        <VanIcon className="h-5 w-5 text-forest-700" />
        Getting there
      </h2>

      {!anchor ? (
        <div className="mt-2">
          <p className="text-sm text-forest-800/60">
            Pick where you&apos;re starting from to see distance and transport options.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.values(STADIUM_ANCHORS).map((stadium) => (
              <button
                key={stadium.id}
                type="button"
                aria-pressed={false}
                onClick={() => setStadiumAnchor(stadium.id)}
                className={`${PICKER_BASE} ${PICKER_INACTIVE}`}
              >
                <PinIcon className="mr-1 inline h-3.5 w-3.5" />
                {stadium.shortLabel}
              </button>
            ))}
            <button
              type="button"
              onClick={setGpsAnchor}
              disabled={gpsLoading}
              className={`${PICKER_BASE} ${PICKER_INACTIVE} disabled:opacity-60`}
            >
              {gpsLoading ? "Locating…" : "My location"}
            </button>
          </div>
          {gpsError && <p className="mt-1.5 text-xs text-red-700">{gpsError}</p>}
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-forest-800/60">From {anchor.label}</p>
          {transportOptions.length === 0 ? (
            <p className="mt-3 rounded-xl border border-forest-900/10 bg-white p-4 text-sm text-forest-800/60">
              No transport partners listed on Wano yet — check{" "}
              <Link href="/explore?type=transport" className="font-medium text-nile-700 hover:underline">
                Explore
              </Link>{" "}
              for ride options in the meantime.
            </p>
          ) : (
            <AnchorSortedList
              className="mt-3 space-y-3"
              items={transportOptions.map(
                (option): AnchorSortableItem => ({
                  id: option.id,
                  coordinates: coordinatesFor(option),
                  node: <TransportCard option={option} />,
                }),
              )}
            />
          )}
        </>
      )}
    </section>
  );
}
