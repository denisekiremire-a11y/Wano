// Shared by both the CLI seed scripts (src/db/seed-journal.ts,
// src/db/seed-clubs.ts — for local dev) and the admin-triggered backfill
// action (src/lib/actions/admin-seed-actions.ts — for production, where
// nobody has shell access to run a script). Same logic, two entry points.
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  events,
  experienceDetails,
  hotelDetails,
  interests,
  journalPosts,
  journeys,
  journeyStops,
  listings,
  offers,
  restaurantDetails,
  users,
  vendorProfiles,
} from "@/db/schema";
import { generateClubMeetupItem, generatePlaceAddedItem, generateJournalPublishedItem } from "@/lib/feed-generators";
import { uniqueSlug } from "@/lib/slug";
import { uniqueUsername } from "@/lib/username";

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

// Demo inventory — fictional but fully bookable places, ten per listing
// type, so the app has enough breadth to click through as a live demo.
// Every vendor is created pre-"trusted" (skips the accreditation queue)
// and every listing isPublished so it shows immediately in Explore/Home.
type DemoListingSpec = {
  type: "hotel" | "restaurant" | "experience" | "transport" | "spa_salon";
  businessName: string;
  location: string;
  vendorDescription: string;
  title: string;
  description: string;
  priceMinor: number;
  priceUnit: string;
  hotel?: { roomTypes: string; amenities: string; checkInTime: string; checkOutTime: string };
  restaurant?: { cuisine: string; priceRange: string; hours: string };
  experience?: { durationText: string; groupSizeText: string; whatsIncluded: string };
};

const DEMO_LISTINGS: DemoListingSpec[] = [
  // Hotels
  {
    type: "hotel", businessName: "Nakasero Heights Hotel", location: "Kampala",
    vendorDescription: "A hillside business hotel overlooking central Kampala.",
    title: "Nakasero Heights Hotel — City View Rooms",
    description: "Modern rooms with skyline views, five minutes from the CBD, popular with business travellers.",
    priceMinor: 320000, priceUnit: "/night",
    hotel: { roomTypes: "Standard, Deluxe, Executive Suite", amenities: "Free Wi-Fi, gym, rooftop bar, airport shuttle", checkInTime: "2:00 PM", checkOutTime: "11:00 AM" },
  },
  {
    type: "hotel", businessName: "Lakeview Serenity Lodge", location: "Entebbe",
    vendorDescription: "A quiet lakeside lodge minutes from Entebbe International Airport.",
    title: "Lakeview Serenity Lodge — Lake Victoria Rooms",
    description: "Garden cottages with private verandas facing Lake Victoria, an easy first or last night in Uganda.",
    priceMinor: 410000, priceUnit: "/night",
    hotel: { roomTypes: "Garden Cottage, Lake View Room", amenities: "Free Wi-Fi, pool, restaurant, airport pickup", checkInTime: "2:00 PM", checkOutTime: "10:00 AM" },
  },
  {
    type: "hotel", businessName: "Bugolobi Suites", location: "Kampala",
    vendorDescription: "Serviced apartments for longer stays in Kampala's Bugolobi neighbourhood.",
    title: "Bugolobi Suites — One-Bedroom Apartment",
    description: "Self-contained apartments with kitchenettes, ideal for stays of a week or more.",
    priceMinor: 280000, priceUnit: "/night",
    hotel: { roomTypes: "Studio, One-Bedroom, Two-Bedroom", amenities: "Kitchenette, laundry, backup power, secure parking", checkInTime: "1:00 PM", checkOutTime: "11:00 AM" },
  },
  {
    type: "hotel", businessName: "Mbarara Highland Inn", location: "Mbarara",
    vendorDescription: "A comfortable stopover hotel on the road to the southwest parks.",
    title: "Mbarara Highland Inn — Standard Rooms",
    description: "A reliable overnight stop between Kampala and Bwindi or Queen Elizabeth National Park.",
    priceMinor: 180000, priceUnit: "/night",
    hotel: { roomTypes: "Standard, Family Room", amenities: "Restaurant, free parking, Wi-Fi in common areas", checkInTime: "2:00 PM", checkOutTime: "10:00 AM" },
  },
  {
    type: "hotel", businessName: "Jinja Riverside Hotel", location: "Jinja",
    vendorDescription: "A riverside hotel by the source of the Nile.",
    title: "Jinja Riverside Hotel — River View Rooms",
    description: "Rooms overlooking the Nile, walking distance from the rafting and kayaking put-in points.",
    priceMinor: 260000, priceUnit: "/night",
    hotel: { roomTypes: "Standard, River View, Suite", amenities: "Pool, restaurant, river tours desk", checkInTime: "2:00 PM", checkOutTime: "11:00 AM" },
  },
  {
    type: "hotel", businessName: "Kabalega Safari Lodge", location: "Masindi",
    vendorDescription: "A safari lodge on the edge of Murchison Falls National Park.",
    title: "Kabalega Safari Lodge — Safari Tents",
    description: "Furnished safari tents with en-suite bathrooms, a short drive from the park gate.",
    priceMinor: 520000, priceUnit: "/night",
    hotel: { roomTypes: "Safari Tent, Family Tent", amenities: "Full board available, game drive bookings, campfire deck", checkInTime: "2:00 PM", checkOutTime: "10:00 AM" },
  },
  {
    type: "hotel", businessName: "Kololo Boutique Hotel", location: "Kampala",
    vendorDescription: "A small boutique hotel in leafy Kololo.",
    title: "Kololo Boutique Hotel — Design Rooms",
    description: "Twelve design-led rooms in one of Kampala's quietest, most upscale neighbourhoods.",
    priceMinor: 390000, priceUnit: "/night",
    hotel: { roomTypes: "Classic, Junior Suite", amenities: "Free Wi-Fi, breakfast included, courtyard bar", checkInTime: "2:00 PM", checkOutTime: "11:00 AM" },
  },
  {
    type: "hotel", businessName: "Fort Portal Crater Lodge", location: "Fort Portal",
    vendorDescription: "A lodge set among the crater lakes near Fort Portal.",
    title: "Fort Portal Crater Lodge — Crater View Cottages",
    description: "Cottages overlooking a volcanic crater lake, close to Kibale Forest chimpanzee trekking.",
    priceMinor: 450000, priceUnit: "/night",
    hotel: { roomTypes: "Cottage, Family Cottage", amenities: "Guided nature walks, restaurant, fireplace lounge", checkInTime: "2:00 PM", checkOutTime: "10:00 AM" },
  },
  {
    type: "hotel", businessName: "Ssese Islands Beach Resort", location: "Ssese Islands",
    vendorDescription: "A beach resort on Lake Victoria's Ssese Islands.",
    title: "Ssese Islands Beach Resort — Beach Bandas",
    description: "Thatched-roof bandas steps from the beach, reachable by ferry or speedboat from Entebbe.",
    priceMinor: 300000, priceUnit: "/night",
    hotel: { roomTypes: "Banda, Beachfront Banda", amenities: "Beach access, kayak rental, restaurant", checkInTime: "1:00 PM", checkOutTime: "11:00 AM" },
  },
  {
    type: "hotel", businessName: "Gulu Comfort Hotel", location: "Gulu",
    vendorDescription: "A modern hotel serving Uganda's northern region.",
    title: "Gulu Comfort Hotel — Deluxe Rooms",
    description: "Air-conditioned rooms and reliable Wi-Fi for travellers heading further north.",
    priceMinor: 200000, priceUnit: "/night",
    hotel: { roomTypes: "Standard, Deluxe", amenities: "Restaurant, conference room, free parking", checkInTime: "1:00 PM", checkOutTime: "11:00 AM" },
  },
  // Restaurants
  {
    type: "restaurant", businessName: "Mama Ashanti Kitchen", location: "Kampala",
    vendorDescription: "A family-run West African and Ugandan fusion kitchen.",
    title: "Mama Ashanti Kitchen", description: "Hearty Ugandan and West African dishes in a lively, no-frills dining room.",
    priceMinor: 35000, priceUnit: "/person",
    restaurant: { cuisine: "Ugandan, West African", priceRange: "Mid-range", hours: "11am–10pm daily" },
  },
  {
    type: "restaurant", businessName: "The Grill House Kampala", location: "Kampala",
    vendorDescription: "A steakhouse-style grill in central Kampala.",
    title: "The Grill House Kampala", description: "Char-grilled meats, ribs, and burgers with a full bar.",
    priceMinor: 55000, priceUnit: "/person",
    restaurant: { cuisine: "Grill, International", priceRange: "Mid-to-high", hours: "12pm–11pm daily" },
  },
  {
    type: "restaurant", businessName: "Nile Breeze Restaurant", location: "Jinja",
    vendorDescription: "An open-air restaurant on the banks of the Nile.",
    title: "Nile Breeze Restaurant", description: "Fresh tilapia and grilled dishes with a view of the river.",
    priceMinor: 40000, priceUnit: "/person",
    restaurant: { cuisine: "Ugandan, Seafood", priceRange: "Mid-range", hours: "8am–10pm daily" },
  },
  {
    type: "restaurant", businessName: "Kampala Spice Route", location: "Kampala",
    vendorDescription: "An Indian and Ugandan fusion restaurant in Kamwokya.",
    title: "Kampala Spice Route", description: "Curries, tandoori, and local specials from a kitchen that does both well.",
    priceMinor: 38000, priceUnit: "/person",
    restaurant: { cuisine: "Indian, Ugandan", priceRange: "Mid-range", hours: "11am–10:30pm daily" },
  },
  {
    type: "restaurant", businessName: "Rolex King Diner", location: "Kampala",
    vendorDescription: "A casual diner built around Uganda's favourite street food.",
    title: "Rolex King Diner", description: "Every rolex variation you can think of, plus chapati and Ugandan breakfast classics.",
    priceMinor: 12000, priceUnit: "/person",
    restaurant: { cuisine: "Ugandan Street Food", priceRange: "Budget", hours: "7am–9pm daily" },
  },
  {
    type: "restaurant", businessName: "Lakeside Catch Seafood", location: "Entebbe",
    vendorDescription: "A seafood restaurant on the shore of Lake Victoria.",
    title: "Lakeside Catch Seafood", description: "Lake-caught fish, prawns, and grilled catch of the day by the water.",
    priceMinor: 48000, priceUnit: "/person",
    restaurant: { cuisine: "Seafood", priceRange: "Mid-to-high", hours: "11am–10pm daily" },
  },
  {
    type: "restaurant", businessName: "Savannah Grill & Bar", location: "Kampala",
    vendorDescription: "A sports bar and grill popular on match nights.",
    title: "Savannah Grill & Bar", description: "Wings, pizza, and cold drinks with big screens for every big game.",
    priceMinor: 32000, priceUnit: "/person",
    restaurant: { cuisine: "Bar & Grill", priceRange: "Mid-range", hours: "12pm–1am daily" },
  },
  {
    type: "restaurant", businessName: "Kibuye Food Court", location: "Kampala",
    vendorDescription: "A multi-vendor food court with several local kitchens under one roof.",
    title: "Kibuye Food Court", description: "Pick from several stalls serving Ugandan, Chinese, and grilled favourites.",
    priceMinor: 18000, priceUnit: "/person",
    restaurant: { cuisine: "Ugandan, Chinese, Grill", priceRange: "Budget", hours: "8am–10pm daily" },
  },
  {
    type: "restaurant", businessName: "Le Petit Kampala Bistro", location: "Kampala",
    vendorDescription: "A small French-inspired bistro in Kampala.",
    title: "Le Petit Kampala Bistro", description: "A short, seasonal menu of French-inspired plates in an intimate setting.",
    priceMinor: 60000, priceUnit: "/person",
    restaurant: { cuisine: "French, European", priceRange: "High", hours: "6pm–11pm Tue–Sun" },
  },
  {
    type: "restaurant", businessName: "Sunset Terrace Restaurant", location: "Entebbe",
    vendorDescription: "A terrace restaurant known for sunset views over the lake.",
    title: "Sunset Terrace Restaurant", description: "Grilled dishes and cocktails on a terrace facing Lake Victoria's sunset side.",
    priceMinor: 45000, priceUnit: "/person",
    restaurant: { cuisine: "International, Grill", priceRange: "Mid-range", hours: "10am–11pm daily" },
  },
  // Experiences
  {
    type: "experience", businessName: "Nile Source Tours", location: "Jinja",
    vendorDescription: "A boat tour operator at the source of the Nile.",
    title: "Source of the Nile Boat Tour", description: "A guided boat ride to the spot where the Nile begins its journey to the Mediterranean.",
    priceMinor: 60000, priceUnit: "/person",
    experience: { durationText: "1.5 hours", groupSizeText: "2–12 people", whatsIncluded: "Life jackets, guide, boat" },
  },
  {
    type: "experience", businessName: "Kampala Walks", location: "Kampala",
    vendorDescription: "A local walking-tour operator covering Kampala's neighbourhoods.",
    title: "Kampala City Walking Tour", description: "A guided walk through Old Kampala, the markets, and the city's hills.",
    priceMinor: 45000, priceUnit: "/person",
    experience: { durationText: "3 hours", groupSizeText: "1–10 people", whatsIncluded: "Local guide, market tastings" },
  },
  {
    type: "experience", businessName: "Ziika Forest Trails", location: "Mukono",
    vendorDescription: "A nature-walk operator running guided trails near Kampala.",
    title: "Ziika Forest Nature Walk", description: "An easy guided forest walk with birdwatching, an hour from the city.",
    priceMinor: 30000, priceUnit: "/person",
    experience: { durationText: "2 hours", groupSizeText: "1–15 people", whatsIncluded: "Guide, walking trail access" },
  },
  {
    type: "experience", businessName: "Mabira Canopy Adventures", location: "Mabira",
    vendorDescription: "A zipline and canopy adventure operator in Mabira Forest.",
    title: "Mabira Forest Zipline Adventure", description: "Nine ziplines through the Mabira Forest canopy, with a guided nature walk.",
    priceMinor: 120000, priceUnit: "/person",
    experience: { durationText: "2.5 hours", groupSizeText: "1–8 people", whatsIncluded: "Safety gear, guide, forest walk" },
  },
  {
    type: "experience", businessName: "Victoria Sunset Cruises", location: "Entebbe",
    vendorDescription: "A sunset boat cruise operator on Lake Victoria.",
    title: "Lake Victoria Sunset Cruise", description: "A relaxed evening cruise with drinks, watching the sun set over the lake.",
    priceMinor: 90000, priceUnit: "/person",
    experience: { durationText: "2 hours", groupSizeText: "2–20 people", whatsIncluded: "Boat, drinks, life jackets" },
  },
  {
    type: "experience", businessName: "Kampala Craft Collective", location: "Kampala",
    vendorDescription: "A workshop studio teaching Ugandan crafts and coffee roasting.",
    title: "Uganda Craft & Coffee Workshop", description: "A hands-on session roasting Ugandan coffee and making a small craft to take home.",
    priceMinor: 70000, priceUnit: "/person",
    experience: { durationText: "2.5 hours", groupSizeText: "2–10 people", whatsIncluded: "Materials, coffee tasting, take-home craft" },
  },
  {
    type: "experience", businessName: "Bwindi Trek Partners", location: "Bwindi",
    vendorDescription: "A trekking operator arranging gorilla permit day trips.",
    title: "Bwindi Gorilla Trek Day Pass", description: "A full-day guided gorilla trek in Bwindi Impenetrable Forest, permit included.",
    priceMinor: 1500000, priceUnit: "/person",
    experience: { durationText: "Full day", groupSizeText: "1–8 people", whatsIncluded: "Permit, ranger guide, trekking poles" },
  },
  {
    type: "experience", businessName: "Kampala Food Crawls", location: "Kampala",
    vendorDescription: "A street-food tour operator covering Kampala's best stalls.",
    title: "Kampala Street Food Crawl", description: "A guided evening crawl through Kampala's best street-food stops.",
    priceMinor: 55000, priceUnit: "/person",
    experience: { durationText: "3 hours", groupSizeText: "2–12 people", whatsIncluded: "All tastings, guide" },
  },
  {
    type: "experience", businessName: "Murchison Day Safaris", location: "Murchison Falls",
    vendorDescription: "A safari operator running day trips into Murchison Falls National Park.",
    title: "Murchison Falls Day Safari", description: "A game drive and a boat cruise to the base of the falls, in one day.",
    priceMinor: 380000, priceUnit: "/person",
    experience: { durationText: "Full day", groupSizeText: "2–6 people", whatsIncluded: "Park fees, game drive, boat cruise" },
  },
  {
    type: "experience", businessName: "Ssese Paddle Co.", location: "Ssese Islands",
    vendorDescription: "A kayaking outfitter on the Ssese Islands.",
    title: "Ssese Islands Kayaking Trip", description: "A guided kayak paddle around the calm bays of the Ssese Islands.",
    priceMinor: 65000, priceUnit: "/person",
    experience: { durationText: "2 hours", groupSizeText: "1–10 people", whatsIncluded: "Kayak, life jacket, guide" },
  },
  // Transport
  {
    type: "transport", businessName: "QuickHop Airport Transfers", location: "Entebbe",
    vendorDescription: "An airport transfer service covering Entebbe and Kampala.",
    title: "Entebbe Airport Transfer", description: "A private car transfer between Entebbe International Airport and Kampala.",
    priceMinor: 90000, priceUnit: "/trip",
  },
  {
    type: "transport", businessName: "Kampala City Shuttle", location: "Kampala",
    vendorDescription: "A scheduled shuttle service around Kampala's main hubs.",
    title: "Kampala City Shuttle Pass", description: "A day pass on the scheduled shuttle loop connecting Kampala's main areas.",
    priceMinor: 15000, priceUnit: "/day",
  },
  {
    type: "transport", businessName: "Pearl Rides Car Hire", location: "Kampala",
    vendorDescription: "A self-drive and chauffeured car hire company.",
    title: "Pearl Rides Car Hire — Self-Drive SUV", description: "A self-drive 4x4 rental, ideal for a Kampala-to-parks road trip.",
    priceMinor: 150000, priceUnit: "/day",
  },
  {
    type: "transport", businessName: "Boda Express Riders", location: "Kampala",
    vendorDescription: "A vetted boda-boda rider network for quick city trips.",
    title: "Boda Express — City Ride", description: "A vetted boda rider for a quick trip across Kampala, booked in advance.",
    priceMinor: 8000, priceUnit: "/trip",
  },
  {
    type: "transport", businessName: "Nile Cruiser Boat Transfers", location: "Jinja",
    vendorDescription: "A boat transfer service on the Nile at Jinja.",
    title: "Nile Cruiser Boat Transfer", description: "A boat transfer between riverside points in Jinja, scenic and quick.",
    priceMinor: 25000, priceUnit: "/trip",
  },
  {
    type: "transport", businessName: "Highland Coach Services", location: "Mbarara",
    vendorDescription: "An intercity coach line serving southwestern Uganda.",
    title: "Highland Coach — Kampala to Mbarara", description: "A scheduled coach seat between Kampala and Mbarara.",
    priceMinor: 35000, priceUnit: "/seat",
  },
  {
    type: "transport", businessName: "SafeTrail 4x4 Rentals", location: "Kampala",
    vendorDescription: "A 4x4 rental company geared toward safari road trips.",
    title: "SafeTrail 4x4 Rental — With Driver", description: "A rugged 4x4 with an experienced driver-guide for park road trips.",
    priceMinor: 220000, priceUnit: "/day",
  },
  {
    type: "transport", businessName: "Entebbe Direct Shuttle", location: "Entebbe",
    vendorDescription: "A direct shuttle connecting Entebbe to central Kampala.",
    title: "Entebbe Direct Shuttle Seat", description: "A shared shuttle seat running direct between Entebbe and Kampala.",
    priceMinor: 20000, priceUnit: "/seat",
  },
  {
    type: "transport", businessName: "Kampala Bike Rentals", location: "Kampala",
    vendorDescription: "A bicycle rental stand for exploring Kampala at street level.",
    title: "Kampala Bike Rental — Full Day", description: "A city bike rental for a self-guided day exploring Kampala.",
    priceMinor: 25000, priceUnit: "/day",
  },
  {
    type: "transport", businessName: "Northern Star Bus Line", location: "Gulu",
    vendorDescription: "An intercity bus line connecting Kampala to the north.",
    title: "Northern Star Bus — Kampala to Gulu", description: "A scheduled overnight bus seat between Kampala and Gulu.",
    priceMinor: 40000, priceUnit: "/seat",
  },
  // Spa & salon
  {
    type: "spa_salon", businessName: "Zen Garden Spa & Wellness", location: "Kampala",
    vendorDescription: "A wellness spa set around a quiet garden in Kampala.",
    title: "Zen Garden Full Body Massage", description: "A one-hour full body massage in a calm garden setting.",
    priceMinor: 90000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Kololo Beauty Lounge", location: "Kampala",
    vendorDescription: "A beauty lounge offering facials, nails, and hair styling.",
    title: "Kololo Beauty Lounge — Signature Facial", description: "A signature facial treatment using locally sourced ingredients.",
    priceMinor: 75000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Golden Touch Salon", location: "Kampala",
    vendorDescription: "A full-service hair and nail salon.",
    title: "Golden Touch — Full Hair Styling", description: "Wash, treatment, and styling from a Kampala salon regulars swear by.",
    priceMinor: 60000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Lakeside Relaxation Spa", location: "Entebbe",
    vendorDescription: "A spa with lake views near Entebbe.",
    title: "Lakeside Relaxation Spa — Couples Massage", description: "A side-by-side couples massage with a view of Lake Victoria.",
    priceMinor: 160000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Radiance Hair & Beauty", location: "Kampala",
    vendorDescription: "A hair and beauty studio specialising in braiding and natural hair.",
    title: "Radiance — Braiding Session", description: "A full braiding session with a stylist specialising in natural hair.",
    priceMinor: 50000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Tranquil Waters Spa", location: "Jinja",
    vendorDescription: "A riverside spa in Jinja.",
    title: "Tranquil Waters — Riverside Massage", description: "A relaxing massage in a treatment room overlooking the Nile.",
    priceMinor: 85000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "The Polished Look Salon", location: "Kampala",
    vendorDescription: "A nail and grooming salon in central Kampala.",
    title: "The Polished Look — Manicure & Pedicure", description: "A full manicure and pedicure package.",
    priceMinor: 40000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Savannah Wellness Retreat", location: "Kampala",
    vendorDescription: "A day-retreat spa combining massage, sauna, and a pool.",
    title: "Savannah Wellness Day Pass", description: "A half-day pass including pool, sauna, and a 45-minute massage.",
    priceMinor: 130000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Pearl Glow Beauty Spa", location: "Kampala",
    vendorDescription: "A beauty spa offering skincare and grooming packages.",
    title: "Pearl Glow — Deep Cleanse Facial", description: "A deep-cleanse facial package using Ugandan botanical products.",
    priceMinor: 70000, priceUnit: "/session",
  },
  {
    type: "spa_salon", businessName: "Highland Retreat Spa", location: "Mbarara",
    vendorDescription: "A spa attached to a highland lodge in Mbarara.",
    title: "Highland Retreat — Hot Stone Massage", description: "A hot stone massage session after a long day on the road.",
    priceMinor: 95000, priceUnit: "/session",
  },
];

const DEMO_EVENTS = [
  { title: "Kampala Jazz Night", category: "music", location: "Sheraton Gardens, Kampala", priceHint: "UGX 40,000", daysOut: 12 },
  { title: "Sunset Yoga by the Lake", category: "wellness", location: "Entebbe Botanical Gardens", priceHint: "UGX 20,000", daysOut: 6 },
  { title: "Uganda Cultural Heritage Fair", category: "culture", location: "Uganda Museum, Kampala", priceHint: "UGX 15,000", daysOut: 20 },
  { title: "Nile Adventure Race", category: "adventure", location: "Jinja", priceHint: "UGX 60,000", daysOut: 30 },
  { title: "Kampala Comedy Slam", category: "comedy", location: "Envy Bar, Kampala", priceHint: "UGX 25,000", daysOut: 9 },
  { title: "Entebbe Food & Wine Festival", category: "food", location: "Lake Victoria Serena, Entebbe", priceHint: "UGX 50,000", daysOut: 25 },
  { title: "Kampala Tech & Innovation Meetup", category: "business", location: "Innovation Village, Kampala", priceHint: "Free", daysOut: 14 },
  { title: "Full Moon Beach Party Entebbe", category: "nightlife", location: "Anderita Beach, Entebbe", priceHint: "UGX 30,000", daysOut: 18 },
  { title: "Kids Fun Day at Lugogo", category: "family", location: "Lugogo Cricket Oval, Kampala", priceHint: "UGX 10,000", daysOut: 22 },
  { title: "Kampala Marathon Warm-Up Run", category: "sports", location: "Kololo Airstrip, Kampala", priceHint: "UGX 20,000", daysOut: 35 },
];

const DEMO_CLUBS: { name: string; interestKey: string; description: string; cadence: string }[] = [
  { name: "Kampala Foodies Club", interestKey: "food", description: "A group for discovering Kampala's best hidden food spots together.", cadence: "Monthly" },
  { name: "Rolex Lovers United", interestKey: "food", description: "Weekly meetups to try a different rolex stand across the city.", cadence: "Weekly" },
  { name: "Sunday Brunch Society", interestKey: "food", description: "A rotating Sunday brunch crew that tries a new restaurant every month.", cadence: "Monthly" },
  { name: "Nile Explorers Club", interestKey: "adventure", description: "For anyone who wants a standing crew for rafting, hiking, and day trips.", cadence: "Monthly" },
  { name: "Weekend Hikers Uganda", interestKey: "adventure", description: "Weekend hiking trips around the hills and forests near Kampala.", cadence: "Bi-weekly" },
  { name: "Kampala Cycling Crew", interestKey: "adventure", description: "Group rides around Kampala and the surrounding countryside.", cadence: "Weekly" },
  { name: "Young Entrepreneurs Kampala", interestKey: "business", description: "A peer network for early-stage founders and small business owners.", cadence: "Monthly" },
  { name: "Wano Business Network", interestKey: "business", description: "Networking meetups for Wano's own accredited partners and vendors.", cadence: "Monthly" },
  { name: "Startup Founders Circle", interestKey: "business", description: "A closed-door discussion group for founders building in Uganda.", cadence: "Bi-weekly" },
  { name: "Kampala Creatives Collective", interestKey: "art", description: "A gathering for painters, designers, and makers to share work.", cadence: "Monthly" },
  { name: "Photography Walkers Club", interestKey: "art", description: "Guided photo walks through Kampala's most photogenic corners.", cadence: "Bi-weekly" },
  { name: "Uganda Music & Arts Society", interestKey: "art", description: "A community for musicians and visual artists to collaborate.", cadence: "Monthly" },
];

export async function seedDemoInventory(adminUserId: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let vendorsCreated = 0;
  let listingsCreated = 0;
  let eventsCreated = 0;
  let clubsCreated = 0;

  for (const spec of DEMO_LISTINGS) {
    const [existingListing] = await db.select({ id: listings.id }).from(listings).where(eq(listings.title, spec.title)).limit(1);
    if (existingListing) continue;

    const email = `demo.${spec.businessName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@wano.app`;
    let [vendorUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let vendorProfileId: string;
    if (!vendorUser) {
      [vendorUser] = await db
        .insert(users)
        .values({ email, passwordHash, name: spec.businessName, role: "vendor", username: await uniqueUsername(spec.businessName) })
        .returning();
      const [vendorProfile] = await db
        .insert(vendorProfiles)
        .values({
          userId: vendorUser.id,
          businessName: spec.businessName,
          location: spec.location,
          description: spec.vendorDescription,
          accreditationStatus: "trusted",
        })
        .returning();
      vendorProfileId = vendorProfile.id;
      vendorsCreated++;
    } else {
      const [vendorProfile] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.userId, vendorUser.id)).limit(1);
      vendorProfileId = vendorProfile.id;
    }

    const [listing] = await db
      .insert(listings)
      .values({
        vendorProfileId,
        type: spec.type,
        title: spec.title,
        description: spec.description,
        priceLabel: "From",
        priceMinor: spec.priceMinor,
        currency: "UGX",
        priceUnit: spec.priceUnit,
        isPublished: true,
        active: true,
      })
      .returning();
    listingsCreated++;

    await db.insert(offers).values({ listingId: listing.id, discountText: "10% off for Wano members", freebieText: null });

    if (spec.hotel) await db.insert(hotelDetails).values({ listingId: listing.id, ...spec.hotel });
    if (spec.restaurant) await db.insert(restaurantDetails).values({ listingId: listing.id, ...spec.restaurant });
    if (spec.experience) await db.insert(experienceDetails).values({ listingId: listing.id, ...spec.experience });

    await generatePlaceAddedItem(listing.id);
  }

  for (const spec of DEMO_EVENTS) {
    const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.title, spec.title)).limit(1);
    if (existing) continue;
    await db.insert(events).values({
      title: spec.title,
      description: `${spec.title} — a Wano demo event in ${spec.location}.`,
      category: spec.category,
      startAt: daysFromNow(spec.daysOut),
      location: spec.location,
      priceHint: spec.priceHint,
      active: true,
    });
    eventsCreated++;
  }

  for (const spec of DEMO_CLUBS) {
    const [existing] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.name, spec.name)).limit(1);
    if (existing) continue;

    const [interest] = await db.select().from(interests).where(eq(interests.key, spec.interestKey)).limit(1);
    if (!interest) continue; // launch categories are always seeded first; skip rather than guess a label

    const slug = await uniqueSlug(spec.name, clubSlugExists);
    const [club] = await db
      .insert(clubs)
      .values({
        interestId: interest.id,
        name: spec.name,
        slug,
        description: spec.description,
        hostUserId: adminUserId,
        city: "Kampala",
        cadence: spec.cadence,
        whatsappInviteUrl: "https://chat.whatsapp.com/placeholder-invite-link",
        status: "approved",
        createdByUserId: adminUserId,
        reviewedByUserId: adminUserId,
      })
      .returning();

    const [meetup] = await db
      .insert(events)
      .values({
        title: `${spec.name} Meetup`,
        description: `${spec.name}'s regular meetup — ${spec.cadence.toLowerCase()}.`,
        category: spec.interestKey,
        startAt: daysFromNow(14),
        location: "Kampala",
        priceHint: "Free to attend",
        clubId: club.id,
      })
      .returning();
    await generateClubMeetupItem(meetup.id);
    clubsCreated++;
  }

  return { vendorsCreated, listingsCreated, eventsCreated, clubsCreated };
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
