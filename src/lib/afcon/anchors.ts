// AFCON 2027 anchor points — the three Uganda-hosted competition venues,
// each opening a different tourism circuit. Coordinates are the stadiums'
// verified real-world pins (cross-checked against Wikipedia-sourced data and
// StadiumDB.com), not approximations:
//   - Mandela National Stadium (Namboole): 0.34778, 32.65917
//   - Hoima City Stadium (Mparo): 1.43556, 31.39389
//   - Akii Bua Stadium (Lira): 2.250556, 32.900556 — still under
//     construction as of writing (expected to open Oct 2026), so this pin
//     is the stadium site, not a finished, visitable building yet.
export type Coordinates = { latitude: number; longitude: number };

export type StadiumAnchorId = "namboole" | "hoima" | "lira";
export type AnchorId = StadiumAnchorId | "gps";

export type StadiumAnchor = {
  id: StadiumAnchorId;
  label: string;
  shortLabel: string;
  coordinates: Coordinates;
  circuit: string;
  circuitDescription: string;
};

export const STADIUM_ANCHORS: Record<StadiumAnchorId, StadiumAnchor> = {
  namboole: {
    id: "namboole",
    label: "Mandela National Stadium",
    shortLabel: "Namboole",
    coordinates: { latitude: 0.34778, longitude: 32.65917 },
    circuit: "Jinja & the Nile",
    circuitDescription: "Opens the Jinja and Nile corridor — source of the Nile, white water, riverside stays.",
  },
  hoima: {
    id: "hoima",
    label: "Hoima City Stadium",
    shortLabel: "Hoima",
    coordinates: { latitude: 1.43556, longitude: 31.39389 },
    circuit: "The Albertine",
    circuitDescription: "Opens the Albertine — Murchison Falls, Lake Albert, Budongo Forest, Bunyoro heritage sites.",
  },
  lira: {
    id: "lira",
    label: "Akii Bua Stadium",
    shortLabel: "Lira",
    coordinates: { latitude: 2.250556, longitude: 32.900556 },
    circuit: "Northern Uganda",
    circuitDescription: "Opens Northern Uganda — Lango heritage, Karuma Falls, and the road north toward Murchison Falls and Kidepo Valley.",
  },
};

const STADIUM_ANCHOR_IDS = Object.keys(STADIUM_ANCHORS) as StadiumAnchorId[];

export function isStadiumAnchorId(value: string): value is StadiumAnchorId {
  return (STADIUM_ANCHOR_IDS as string[]).includes(value);
}

/** An anchor resolved to a usable coordinate. Stadium anchors always have
 * one; a "gps" anchor's coordinates are null until geolocation resolves
 * (or if it's denied/unavailable), letting callers show a resolving/error
 * state without conflating "no anchor chosen" with "anchor chosen, still
 * locating". */
export type ResolvedAnchor = {
  id: AnchorId;
  label: string;
  coordinates: Coordinates | null;
};

// Kickoff, 19 June 2027, expressed at 00:00 EAT (UTC+3) so the countdown
// reads correctly for Uganda regardless of the viewer's own timezone.
export const AFCON_KICKOFF = new Date("2027-06-18T21:00:00Z");
