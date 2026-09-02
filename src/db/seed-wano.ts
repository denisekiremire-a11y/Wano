import "dotenv/config";
import { db } from "./index";
import {
  eventAttendance,
  events,
  follows,
  interests,
  postComments,
  postLikes,
  posts,
  travellerProfiles,
  vendorProfiles,
} from "./schema";
import { backfillFeedItems } from "../lib/feed-generators";

// One-time incremental seed for the Wano transformation: interest taxonomy,
// demo events, and a handful of sample social posts. Safe to run once against
// the already-seeded Wano database — does not touch existing rows.

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding Wano interests, events, and social content...");

  const interestSeed = [
    { key: "food", label: "Food & Dining", sortOrder: 1 },
    { key: "music", label: "Music", sortOrder: 2 },
    { key: "sports", label: "Sports", sortOrder: 3 },
    { key: "travel", label: "Travel", sortOrder: 4 },
    { key: "adventure", label: "Adventure", sortOrder: 5 },
    { key: "nightlife", label: "Nightlife", sortOrder: 6 },
    { key: "business", label: "Business & Networking", sortOrder: 7 },
    { key: "fitness", label: "Fitness & Wellness", sortOrder: 8 },
    { key: "art", label: "Art & Design", sortOrder: 9 },
    { key: "culture", label: "Culture & History", sortOrder: 10 },
    { key: "fashion", label: "Fashion", sortOrder: 11 },
    { key: "technology", label: "Technology", sortOrder: 12 },
    { key: "family", label: "Family & Kids", sortOrder: 13 },
    { key: "comedy", label: "Comedy & Live Shows", sortOrder: 14 },
    { key: "afcon", label: "AFCON 2027", sortOrder: 15 },
  ] as const;

  const existingInterests = await db.select().from(interests);
  if (existingInterests.length === 0) {
    await db.insert(interests).values([...interestSeed]);
    console.log(`Inserted ${interestSeed.length} interests.`);
  } else {
    console.log("Interests already seeded, skipping.");
  }

  const existingEvents = await db.select().from(events);
  if (existingEvents.length === 0) {
    const vendors = await db.select().from(vendorProfiles);
    const byName = (name: string) => vendors.find((v) => v.businessName === name);

    const eventSeed = [
      {
        title: "Kampala Live Music Night",
        description:
          "An evening of live Afrobeat and jazz on the rooftop, featuring three local Kampala bands.",
        category: "music",
        startAt: hoursFromNow(30),
        endAt: hoursFromNow(34),
        location: "Kampala, Uganda",
        organizerVendorProfileId: byName("Le Chateau Brasserie")?.id ?? null,
        priceHint: "UGX 20,000 entry",
        capacity: 150,
      },
      {
        title: "Nile Sunrise Yoga & Brunch",
        description:
          "A sunrise yoga session on the riverbank followed by a full brunch spread overlooking the Nile.",
        category: "wellness",
        startAt: hoursFromNow(54),
        endAt: hoursFromNow(57),
        location: "Jinja, Uganda",
        organizerVendorProfileId: byName("Nile Serenity Spa")?.id ?? null,
        priceHint: "UGX 90,000/person",
        capacity: 40,
      },
      {
        title: "Uganda Museum After Dark",
        description:
          "A rare evening opening of the Uganda Museum with guided storytelling tours through the cultural exhibits.",
        category: "culture",
        startAt: hoursFromNow(76),
        endAt: hoursFromNow(79),
        location: "Kampala, Uganda",
        organizerVendorProfileId: byName("Kampala Culture Tours")?.id ?? null,
        priceHint: "UGX 35,000/person",
        capacity: 80,
      },
      {
        title: "Bujagali Adventure Meetup",
        description:
          "A community meetup for first-timers and regulars to raft, kayak, and swap Nile adventure stories.",
        category: "adventure",
        startAt: hoursFromNow(100),
        endAt: hoursFromNow(106),
        location: "Bujagali Falls, Jinja",
        organizerVendorProfileId: byName("Nalubale Rafting Co.")?.id ?? null,
        priceHint: "Free to attend",
        capacity: 60,
      },
      {
        title: "Kampala Comedy Night",
        description: "Stand-up from Kampala's sharpest local comedians, hosted monthly in the city centre.",
        category: "comedy",
        startAt: hoursFromNow(126),
        endAt: hoursFromNow(129),
        location: "Kampala, Uganda",
        organizerVendorProfileId: null,
        priceHint: "UGX 15,000 entry",
        capacity: 120,
      },
      {
        title: "Wano × AFCON 2027 Fan Zone Launch",
        description:
          "Kickoff gathering for Wano's AFCON 2027 fan community — big screens, food stalls, and a first look at the Wano × AFCON hub, in the lead-up to the June 2027 tournament.",
        category: "afcon",
        startAt: new Date(Date.UTC(2027, 5, 19, 15, 0)),
        endAt: new Date(Date.UTC(2027, 5, 19, 22, 0)),
        location: "Kampala, Uganda",
        organizerVendorProfileId: null,
        priceHint: "Free to attend",
        capacity: 500,
      },
    ];

    const inserted = await db.insert(events).values(eventSeed).returning();
    console.log(`Inserted ${inserted.length} events.`);

    const travellers = await db.select().from(travellerProfiles);
    const amina = travellers.find((t) => t.displayName === "Amina");
    if (amina && inserted.length > 0) {
      const musicNight = inserted.find((e) => e.title === "Kampala Live Music Night");
      const yoga = inserted.find((e) => e.title === "Nile Sunrise Yoga & Brunch");
      const [post1] = musicNight
        ? await db
            .insert(posts)
            .values({
              travellerId: amina.id,
              content: "Can't wait for this one — rooftop Afrobeat with a view. Who else is going? 🎶",
              contextType: "event",
              contextId: musicNight.id,
            })
            .returning()
        : [];
      if (post1) {
        await db.insert(postLikes).values({ postId: post1.id, travellerId: amina.id });
        await db.insert(postComments).values({
          postId: post1.id,
          travellerId: amina.id,
          content: "See you all there!",
        });
      }
      if (yoga) {
        await db.insert(posts).values({
          travellerId: amina.id,
          content: "Booked my spot for sunrise yoga on the Nile this weekend — perfect way to reset.",
          contextType: "event",
          contextId: yoga.id,
        });
      }

      // A couple of RSVPs so event_upcoming has something real to generate
      // from — the feed shouldn't start life with zero RSVP'd events.
      if (musicNight) {
        await db.insert(eventAttendance).values({ eventId: musicNight.id, travellerId: amina.id, status: "going" });
      }
      if (yoga) {
        await db
          .insert(eventAttendance)
          .values({ eventId: yoga.id, travellerId: amina.id, status: "interested" });
      }
    }
  } else {
    console.log("Events already seeded, skipping.");
  }

  const feedCounts = await backfillFeedItems();
  console.log("Feed items generated:", feedCounts);

  const travellers = await db.select().from(travellerProfiles);
  if (travellers.length >= 2) {
    const existingFollows = await db.select().from(follows);
    if (existingFollows.length === 0) {
      const [a, b] = travellers;
      await db.insert(follows).values({ followerId: a.id, followingId: b.id });
      console.log("Seeded a demo follow relationship.");
    }
  }

  console.log("Wano incremental seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
