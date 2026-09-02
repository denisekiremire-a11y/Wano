// Shared by both the CLI seed scripts (src/db/seed-journal.ts,
// src/db/seed-clubs.ts — for local dev) and the admin-triggered backfill
// action (src/lib/actions/admin-seed-actions.ts — for production, where
// nobody has shell access to run a script). Same logic, two entry points.
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clubs, events, interests, journalPosts, journeys, journeyStops, listings, users } from "@/db/schema";
import { generateClubMeetupItem, generateJournalPublishedItem } from "@/lib/feed-generators";
import { uniqueSlug } from "@/lib/slug";

// Local dev only — see README.md and .env.example for the current value.
const DEMO_PASSWORD = "WanoLocalDev-9214!";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

const JOURNAL_POSTS = [
  {
    title: "How to Get a SIM Card in Kampala (Same-Day, No Hassle)",
    slug: "how-to-get-a-sim-card-in-kampala",
    excerpt: "Which network to pick, what ID you need, and where to buy — sorted before you leave the airport.",
    category: "Guides",
    tags: ["uganda", "kampala", "sim-card", "connectivity"],
    body: `Landing in Uganda without data is the fastest way to make a simple trip stressful. Here's the short version.

## Which network

MTN and Airtel both have solid coverage in Kampala, Entebbe, and Jinja. MTN edges ahead in rural coverage — useful if your trip includes gorilla trekking or a Nile-side stay outside the city. For a short AFCON 2027 trip confined to Kampala, either works fine.

## What you need

- Your passport (original, not a photo)
- A small registration fee, paid in cash

Registration is mandatory under Ugandan law — there's no way around bringing your passport.

## Where to buy

- **The Wano stand, Entebbe International Airport**: right in the arrivals hall — get your SIM set up and your ride into town booked in one stop.
- **Other airport kiosks**: also in the arrivals hall, open for every flight. Slightly pricier, but you land connected.
- **Kampala**: any MTN or Airtel shop, or countless street kiosks. Cheaper, and staff will usually set up data bundles for you on the spot.

## Data bundles

Buy a bundle, not pay-as-you-go — it's a fraction of the cost. A weekly 5–10GB bundle comfortably covers maps, WhatsApp, and social media for one visitor.

> Keep your physical SIM card packaging until you're sure the number works — some kiosks need it for support queries.`,
  },
  {
    title: "Entebbe Airport to Kampala: Every Way to Make the Trip",
    slug: "entebbe-airport-to-kampala",
    excerpt: "Taxi, ride-hailing app, or hotel transfer — what each actually costs and how long it takes.",
    category: "Guides",
    tags: ["uganda", "entebbe", "kampala", "transport"],
    body: `Entebbe International Airport sits about 40km from central Kampala — budget 45 minutes to over an hour depending on traffic, which builds fast on the Entebbe Road in the evening.

## The options

**Ride-hailing apps** — the easiest for a first-time visitor. SafeBoda is Wano's ride partner: book straight from the arrivals hall once you have SIM data (the Wano stand sets both up in one stop); fixed upfront pricing means no negotiation.

**Airport taxis** — parked directly outside arrivals. Agree the fare before getting in; it isn't metered.

**Hotel or tour transfer** — if you're booking a Wano-verified stay, ask about airport pickup. It costs more than a taxi but removes the one piece of friction that trips up jet-lagged first-timers.

**Public minibus (matatu)** — cheapest by far, and genuinely doable if you're comfortable with a bit of chaos and no A/C. Not recommended with heavy luggage.

## Timing it right

If your flight lands after dark, prioritize a pre-arranged transfer over hailing something cold at the curb. Airport arrivals halls are well-lit and generally safe, but there's no reason to improvise on the least familiar leg of the trip.`,
  },
  {
    title: "Uganda Visa & Entry Requirements for AFCON 2027 Fans",
    slug: "uganda-visa-entry-requirements-afcon-2027",
    excerpt: "What to sort before you fly — visa options, yellow fever proof, and the paperwork that actually gets checked.",
    category: "Guides",
    tags: ["uganda", "visa", "afcon", "entry-requirements"],
    body: `Most nationalities need a visa for Uganda, but the process is more painless than the AFCON hype cycle makes it sound.

## e-Visa

Apply online in advance through Uganda's official immigration portal — this is the recommended route. Processing typically takes a few business days, so don't leave it to the week before kickoff.

## Visa on arrival

Available for some nationalities at Entebbe, but treat this as a fallback, not a plan — queues lengthen fast around a major tournament.

## Yellow fever certificate

Uganda requires proof of yellow fever vaccination for entry. Immigration does check this at the border — pack the physical certificate, not just a phone photo.

## East Africa Tourist Visa

If your trip also touches Kenya or Rwanda, this single visa covers all three countries and is worth the extra step for a multi-country AFCON itinerary.

## The one thing people forget

A passport with fewer than six months' validity left is grounds for refusal at the border, tournament or not. Check the expiry date before you check anything else.`,
  },
  {
    title: "Gorilla Trekking Permits, Explained",
    slug: "gorilla-trekking-permits-explained",
    excerpt: "How much they cost, how far ahead to book, and what actually happens on trek day.",
    category: "Guides",
    tags: ["uganda", "gorilla-trekking", "bwindi", "wildlife"],
    body: `Gorilla trekking is the single most-asked-about Uganda experience, and the permit system trips up more travellers than the hike itself does.

## The permit

A permit is required per person, per trek, issued by the Uganda Wildlife Authority. It covers one hour with a habituated gorilla family, guided by rangers. Permits sell out during peak months (June–September, December–February), sometimes months ahead — book early if your AFCON trip has any gorilla add-on plans.

## What it includes

- Armed ranger escort (a precaution, not a concern)
- Trackers who locate the family before your group sets out
- The one hour of observation time itself

## What it doesn't include

Porters, park entry beyond the trek, and transport to Bwindi or Mgahinga — both a long drive from Kampala, so most visitors treat this as its own multi-day trip rather than a day excursion.

## Fitness reality check

Terrain is steep, humid, and occasionally muddy — treks can run anywhere from one to several hours each way depending on where the family is that morning. Hiring a porter (inexpensive, and often a local income source) is worth it for almost everyone.

## Booking through Wano

Every gorilla-trekking listing on Wano is with a UTB-accredited operator who handles the permit application as part of the booking — one less thing to coordinate yourself.`,
  },
  {
    title: "Best Time to Visit Uganda: A Month-by-Month Read",
    slug: "best-time-to-visit-uganda",
    excerpt: "Two dry seasons, two wet seasons, and what each actually means for your itinerary.",
    category: "Guides",
    tags: ["uganda", "weather", "travel-planning"],
    body: `Uganda sits on the equator, so "seasons" mean rainfall, not temperature — expect warm days year-round almost everywhere you'll go.

## Dry seasons (the easiest travel windows)

**December–February** and **June–August** — improved trekking conditions in Bwindi, drier roads, easier wildlife viewing in the savanna parks. These are also the busiest and priciest months for gorilla permits and safari lodges.

## Wet seasons

**March–May** and **September–November** — genuinely wetter, but not a washout. Rain tends to arrive in short, heavy afternoon bursts rather than settling in all day. Fewer crowds, lower prices, and lusher scenery are the trade-off.

## For an AFCON 2027 trip specifically

Match your travel dates to the tournament schedule rather than the "ideal" season — Kampala's city experiences, food scene, and events run well regardless of rainfall, and most match-day activity is indoors or under cover anyway.

## The one exception

If gorilla trekking is the priority, lean toward the dry windows — muddy trails add real difficulty to an already strenuous hike.`,
  },
  {
    title: "A First-Timer's Guide to Kampala's Rolex",
    slug: "kampala-rolex-guide",
    excerpt: "Not a watch — Uganda's answer to street food, and where to find the best one.",
    category: "Guides",
    tags: ["uganda", "kampala", "food", "rolex"],
    body: `If you leave Kampala without eating a rolex, you've missed the city's actual signature dish.

## What it is

A chapati rolled around an egg omelette — "rolled eggs," shortened to "rolex" over the years. Street vendors (rolex guys, almost always) cook it fresh on the spot: chapati fried on a flat pan, eggs whisked with tomato, onion, and cabbage, then rolled together.

## Where to find one

Every neighbourhood has its own go-to stand, but Wandegeya is the unofficial rolex capital of Kampala — a dense strip of vendors, mostly serving the university crowd, running well into the night.

## How to order

Ask for it "special" if you want extra vegetables and sometimes sausage or beef mixed in. A plain rolex is filling enough on its own and costs next to nothing.

## Eating it right

It's street food — eat it standing at the stand or walking, wrapped in the paper it's served in. Sit-down "rolex" on a restaurant menu is a different, more polished dish; the real experience is at the stand.

## One rule

Go where the queue is. A rolex guy with a line means fast turnover, which means fresher ingredients on the pan.`,
  },
] as const;

const LAUNCH_CLUBS = [
  {
    interestKey: "food",
    interestLabel: "Food & Dining",
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
    interestLabel: "Adventure",
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
    interestLabel: "Business & Networking",
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
    interestLabel: "Art & Design",
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

export async function seedJournalPosts(adminUserId: string) {
  const existing = await db.select({ slug: journalPosts.slug }).from(journalPosts);
  const existingSlugs = new Set(existing.map((r) => r.slug));

  let inserted = 0;
  for (const post of JOURNAL_POSTS) {
    if (existingSlugs.has(post.slug)) continue;
    const [row] = await db
      .insert(journalPosts)
      .values({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        authorUserId: adminUserId,
        category: post.category,
        tags: [...post.tags],
        status: "published",
        publishedAt: daysAgo(JOURNAL_POSTS.indexOf(post) + 1),
        seoDescription: post.excerpt,
      })
      .returning();
    await generateJournalPublishedItem(row.id);
    inserted++;
  }
  return { journalPostsCreated: inserted, journalPostsSkipped: JOURNAL_POSTS.length - inserted };
}

export async function seedLaunchClubs(adminUserId: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let clubsCreated = 0;
  let clubsBackfilled = 0;
  let meetupsCreated = 0;
  let interestsCreated = 0;

  for (const spec of LAUNCH_CLUBS) {
    let [interest] = await db.select().from(interests).where(eq(interests.key, spec.interestKey)).limit(1);
    if (!interest) {
      // Production may never have run the interests seed — create just the
      // one this club needs rather than requiring a separate script.
      [interest] = await db
        .insert(interests)
        .values({ key: spec.interestKey, label: spec.interestLabel, sortOrder: 0 })
        .returning();
      interestsCreated++;
    }

    let [host] = await db.select().from(users).where(eq(users.email, spec.hostEmail)).limit(1);
    if (!host) {
      [host] = await db
        .insert(users)
        .values({ email: spec.hostEmail, passwordHash, name: spec.hostName, role: "traveller" })
        .returning();
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
          createdByUserId: adminUserId,
          reviewedByUserId: adminUserId,
        })
        .returning();
      clubsCreated++;
    } else if (!club.hostUserId || !club.cadence || !club.whatsappInviteUrl) {
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
      clubsBackfilled++;
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
      meetupsCreated++;
    }
  }

  return { clubsCreated, clubsBackfilled, meetupsCreated, interestsCreated };
}

// Migration content for Milestone J, Phase J1 — turns the 5 read-only
// campaign journeys into real, published, database-backed itineraries with
// day-by-day stops linked to the real listings already seeded for them
// (see vendorSeed's journeySlugs in src/db/seed.ts). Cost ranges are
// editorial estimates, same basis as the listing priceHints they're built
// from — not pulled from a live pricing feed.
const JOURNEY_DETAILS: Record<
  string,
  {
    region: string;
    city: string | null;
    durationDays: number;
    budgetBand: "budget" | "mid" | "premium";
    estCostMinMinor: number;
    estCostMaxMinor: number;
    bestSeason: string;
    difficulty: string;
    stops: {
      dayNumber: number;
      orderIndex: number;
      listingTitle: string;
      stopType: "stay" | "do" | "eat" | "move" | "rest";
      note: string;
    }[];
  }
> = {
  "relax-unwind": {
    region: "Jinja, Lake Victoria & Kampala",
    city: "Jinja",
    durationDays: 3,
    budgetBand: "mid",
    estCostMinMinor: 700_000,
    estCostMaxMinor: 1_400_000,
    bestSeason: "Year-round",
    difficulty: "Easy",
    stops: [
      {
        dayNumber: 1,
        orderIndex: 0,
        listingTitle: "Riverside Deluxe Escape",
        stopType: "stay",
        note: "Check in and settle by the river — spa access and a sunset cruise are included.",
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        listingTitle: "Riverside Spa Day Package",
        stopType: "rest",
        note: "A full spa day — massage, facial, and the private riverside relaxation lounge.",
      },
    ],
  },
  "adrenaline-on-the-nile": {
    region: "Jinja / Bujagali Falls",
    city: "Jinja",
    durationDays: 2,
    budgetBand: "mid",
    estCostMinMinor: 550_000,
    estCostMaxMinor: 900_000,
    bestSeason: "Jun–Sep & Dec–Feb (drier river conditions)",
    difficulty: "Challenging",
    stops: [
      {
        dayNumber: 1,
        orderIndex: 0,
        listingTitle: "Riverside Deluxe Escape",
        stopType: "stay",
        note: "Base yourself riverside before the big day.",
      },
      {
        dayNumber: 2,
        orderIndex: 0,
        listingTitle: "Full-Day Rafting & Bungee Combo",
        stopType: "do",
        note: "Grade 5 rapids in the morning, bungee jump at sunset — safety gear, guide and lunch included.",
      },
    ],
  },
  "big-five-safari": {
    region: "Queen Elizabeth NP, Kazinga Channel & Murchison Falls",
    city: null,
    durationDays: 3,
    budgetBand: "premium",
    estCostMinMinor: 1_500_000,
    estCostMaxMinor: 1_900_000,
    bestSeason: "Jun–Sep & Dec–Feb (dry season game viewing)",
    difficulty: "Moderate",
    stops: [
      {
        dayNumber: 1,
        orderIndex: 0,
        listingTitle: "3-Day Big Five Explorer",
        stopType: "do",
        note: "Two game drives and a Kazinga Channel boat cruise — park fees and guide included.",
      },
    ],
  },
  "gorilla-trekking": {
    region: "Bwindi Impenetrable Forest & Mgahinga",
    city: null,
    durationDays: 3,
    budgetBand: "premium",
    estCostMinMinor: 2_700_000,
    estCostMaxMinor: 3_200_000,
    bestSeason: "Jun–Sep & Dec–Feb (dry season trekking)",
    difficulty: "Challenging",
    stops: [
      {
        dayNumber: 1,
        orderIndex: 0,
        listingTitle: "Gorilla Permit & Lodge Package",
        stopType: "stay",
        note: "Permit handling and two nights at the lodge — guided trek to a habituated family included.",
      },
    ],
  },
  "kampala-city-experience": {
    region: "Kampala & Entebbe",
    city: "Kampala",
    durationDays: 1,
    budgetBand: "budget",
    estCostMinMinor: 250_000,
    estCostMaxMinor: 400_000,
    bestSeason: "Year-round",
    difficulty: "Easy",
    stops: [
      {
        dayNumber: 1,
        orderIndex: 0,
        listingTitle: "Kampala & Entebbe Day Tour",
        stopType: "do",
        note: "Uganda Museum, Owino Market, and UWEC Entebbe in one day.",
      },
      {
        dayNumber: 1,
        orderIndex: 1,
        listingTitle: "Le Chateau Brasserie",
        stopType: "eat",
        note: "Round off the day with Ugandan and continental dishes.",
      },
    ],
  },
};

/** Idempotent — safe to click more than once. Backfills cost range, region/
 * city, duration, and stops for the 5 editorial journeys, then publishes
 * them. Skips a journey's stops entirely if it already has any (so hand
 * edits made afterward in /admin/journeys are never clobbered by a rerun). */
export async function backfillEditorialJourneysJ1() {
  let journeysUpdated = 0;
  let stopsCreated = 0;
  let journeysPublished = 0;
  const missingListings: string[] = [];

  for (const [slug, details] of Object.entries(JOURNEY_DETAILS)) {
    const [journey] = await db.select().from(journeys).where(eq(journeys.slug, slug)).limit(1);
    if (!journey) continue;

    await db
      .update(journeys)
      .set({
        kind: "editorial",
        region: details.region,
        city: details.city,
        durationDays: details.durationDays,
        budgetBand: details.budgetBand,
        estCostMinMinor: details.estCostMinMinor,
        estCostMaxMinor: details.estCostMaxMinor,
        currency: "UGX",
        bestSeason: details.bestSeason,
        difficulty: details.difficulty,
        isFeatured: true,
      })
      .where(eq(journeys.id, journey.id));
    journeysUpdated++;

    const [existingStop] = await db
      .select({ id: journeyStops.id })
      .from(journeyStops)
      .where(eq(journeyStops.journeyId, journey.id))
      .limit(1);

    if (!existingStop) {
      for (const stop of details.stops) {
        const [listing] = await db
          .select({ id: listings.id })
          .from(listings)
          .where(eq(listings.title, stop.listingTitle))
          .limit(1);
        if (!listing) {
          missingListings.push(`${slug}: ${stop.listingTitle}`);
          continue;
        }
        await db.insert(journeyStops).values({
          journeyId: journey.id,
          dayNumber: stop.dayNumber,
          orderIndex: stop.orderIndex,
          listingId: listing.id,
          stopType: stop.stopType,
          note: stop.note,
        });
        stopsCreated++;
      }
    }

    const [refreshed] = await db.select().from(journeys).where(eq(journeys.id, journey.id)).limit(1);
    const [hasStop] = await db
      .select({ id: journeyStops.id })
      .from(journeyStops)
      .where(eq(journeyStops.journeyId, journey.id))
      .limit(1);
    if (refreshed && refreshed.status !== "published" && hasStop) {
      await db
        .update(journeys)
        .set({ status: "published", publishedAt: refreshed.publishedAt ?? new Date() })
        .where(eq(journeys.id, journey.id));
      journeysPublished++;
    }
  }

  return { journeysUpdated, stopsCreated, journeysPublished, missingListings };
}
