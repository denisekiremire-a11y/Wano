import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { clubs, events, interests, users } from "./schema";
import { generateClubMeetupItem } from "../lib/feed-generators";
import { uniqueSlug } from "../lib/slug";

const DEMO_PASSWORD = "Passport2027!";

const LAUNCH_CLUBS = [
  {
    interestKey: "food",
    name: "Kampala Food Lovers",
    description: "Rolex stands, hidden nyama choma spots, and the restaurants worth the wait — for anyone who plans their day around the next meal.",
    hostName: "Food & Dining Host (TBC)",
    hostEmail: "host.food@wano.example.com",
    cadence: "Every 2nd Saturday",
    meetupTitle: "Kampala Food Crawl",
    meetupLocation: "Wandegeya, Kampala",
  },
  {
    interestKey: "adventure",
    name: "Nile Adventure Club",
    description: "Rafting, kayaking, and everything else that gets your heart rate up on the river — swap trip reports and plan the next one together.",
    hostName: "Adventure Host (TBC)",
    hostEmail: "host.adventure@wano.example.com",
    cadence: "First Sunday of the month",
    meetupTitle: "Bujagali Adventure Meetup",
    meetupLocation: "Bujagali Falls, Jinja",
  },
  {
    interestKey: "business",
    name: "Kampala Business Network",
    description: "A regular meetup for founders, freelancers, and anyone building something in Kampala — no pitch decks required.",
    hostName: "Business & Networking Host (TBC)",
    hostEmail: "host.business@wano.example.com",
    cadence: "First Thursday of the month",
    meetupTitle: "Kampala Founders Breakfast",
    meetupLocation: "Kampala, Uganda",
  },
  {
    interestKey: "art",
    name: "Kampala Art & Design Collective",
    description: "Studio visits, gallery openings, and a standing table for local designers, painters, and makers to trade notes.",
    hostName: "Art & Design Host (TBC)",
    hostEmail: "host.art@wano.example.com",
    cadence: "Every 3rd Wednesday",
    meetupTitle: "Open Studio Night",
    meetupLocation: "Kampala, Uganda",
  },
] as const;

async function clubSlugExists(candidate: string) {
  const [existing] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, candidate)).limit(1);
  return Boolean(existing);
}

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  if (!admin) {
    console.error("No admin user found — run db:seed first.");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const spec of LAUNCH_CLUBS) {
    const [interest] = await db.select().from(interests).where(eq(interests.key, spec.interestKey)).limit(1);
    if (!interest) {
      console.warn(`Interest "${spec.interestKey}" not found — run db:seed:wano first. Skipping.`);
      continue;
    }

    let [host] = await db.select().from(users).where(eq(users.email, spec.hostEmail)).limit(1);
    if (!host) {
      [host] = await db
        .insert(users)
        .values({
          email: spec.hostEmail,
          passwordHash,
          name: spec.hostName,
          role: "traveller",
        })
        .returning();
      console.log(`Created placeholder host: ${spec.hostName}`);
    }

    let [club] = await db
      .select()
      .from(clubs)
      .where(and(eq(clubs.interestId, interest.id), eq(clubs.name, spec.name)))
      .limit(1);

    if (!club) {
      const slug = await uniqueSlug(spec.name, clubSlugExists);
      [club] = await db
        .insert(clubs)
        .values({
          interestId: interest.id,
          name: spec.name,
          slug,
          description: spec.description,
          hostUserId: host.id,
          city: "Kampala",
          cadence: spec.cadence,
          whatsappInviteUrl: "https://chat.whatsapp.com/placeholder-invite-link",
          status: "approved",
          createdByUserId: admin.id,
          reviewedByUserId: admin.id,
        })
        .returning();
      console.log(`Created club: ${spec.name}`);
    } else if (!club.hostUserId || !club.cadence || !club.whatsappInviteUrl) {
      // Backfill an older club (from before this milestone) with the new fields.
      [club] = await db
        .update(clubs)
        .set({
          hostUserId: club.hostUserId ?? host.id,
          city: club.city ?? "Kampala",
          cadence: club.cadence ?? spec.cadence,
          whatsappInviteUrl: club.whatsappInviteUrl ?? "https://chat.whatsapp.com/placeholder-invite-link",
          status: "approved",
        })
        .where(eq(clubs.id, club.id))
        .returning();
      console.log(`Backfilled club: ${spec.name}`);
    }

    const [existingMeetup] = await db.select().from(events).where(eq(events.clubId, club.id)).limit(1);
    if (!existingMeetup) {
      const [meetup] = await db
        .insert(events)
        .values({
          title: spec.meetupTitle,
          description: `${spec.name}'s regular meetup — ${spec.cadence.toLowerCase()}.`,
          category: spec.interestKey,
          startAt: daysFromNow(10),
          location: spec.meetupLocation,
          priceHint: "Free to attend",
          clubId: club.id,
        })
        .returning();
      await generateClubMeetupItem(meetup.id);
      console.log(`Scheduled meetup for ${spec.name}: ${spec.meetupTitle}`);
    }
  }

  console.log("Club seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
