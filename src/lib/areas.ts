// Neighbourhood stamps. A vendor's area comes from its location text
// ("Kisementi, Kampala"), so no new admin field is needed: write the
// neighbourhood into the vendor's location and the stamp follows. Order
// matters where names overlap: Kisementi sits inside Kololo, so it is
// checked first.
export const STAMP_AREAS = ["Kisementi", "Kololo", "Bugolobi", "Ntinda", "Entebbe", "Jinja"] as const;
export type StampArea = (typeof STAMP_AREAS)[number];

/** The four launch neighbourhoods that weekly theme challenges rotate through. */
export const LAUNCH_AREAS: StampArea[] = ["Kololo", "Kisementi", "Bugolobi", "Ntinda"];

export function areaForLocation(location: string | null | undefined): StampArea | null {
  if (!location) return null;
  const text = location.toLowerCase();
  for (const area of STAMP_AREAS) {
    if (text.includes(area.toLowerCase())) return area;
  }
  return null;
}
