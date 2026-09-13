import { asc } from "drizzle-orm";
import { db } from "@/db";
import { fixtures } from "@/db/schema";
import type { FixtureLite } from "@/lib/season/season";
import type { StadiumAnchorId } from "@/lib/afcon/anchors";
import { STADIUM_ANCHORS } from "@/lib/afcon/anchors";

// CAF has not made the AFCON 2027 draw yet, so the fixtures table is empty
// in practice — these are clearly-labelled placeholders, never presented as
// confirmed. Once real rows exist in the fixtures table, getFixtures below
// switches over automatically; no component change needed.
const PLACEHOLDER_FIXTURES: FixtureLite[] = [
  {
    id: "placeholder-namboole",
    home: "Fixture to be announced",
    away: "Fixture to be announced",
    kickoff: new Date("2027-06-19T15:00:00Z"),
    venueId: "namboole",
    venue: STADIUM_ANCHORS.namboole.label,
    stage: "Group Stage — draw not yet made",
  },
  {
    id: "placeholder-hoima",
    home: "Fixture to be announced",
    away: "Fixture to be announced",
    kickoff: new Date("2027-06-20T15:00:00Z"),
    venueId: "hoima",
    venue: STADIUM_ANCHORS.hoima.label,
    stage: "Group Stage — draw not yet made",
  },
];

function isStadiumAnchorId(value: string): value is StadiumAnchorId {
  return value === "namboole" || value === "hoima";
}

export async function getFixtures(): Promise<FixtureLite[]> {
  const rows = await db.select().from(fixtures).orderBy(asc(fixtures.kickoff));
  const real = rows.filter((r) => isStadiumAnchorId(r.venueId));
  if (real.length === 0) return PLACEHOLDER_FIXTURES;

  return real.map((r) => ({
    id: r.id,
    home: r.home,
    away: r.away,
    kickoff: r.kickoff,
    venueId: r.venueId as StadiumAnchorId,
    venue: r.venue,
    stage: r.stage,
  }));
}
