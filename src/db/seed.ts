import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  accreditationReviews,
  bookings,
  challengeCompletions,
  challenges,
  experienceDetails,
  hotelDetails,
  journeys,
  listingJourneys,
  listings,
  offers,
  promoCodes,
  restaurantDetails,
  stamps,
  travellerProfiles,
  users,
  vendorDocuments,
  vendorProfiles,
} from "./schema";
import { generateReferralCode } from "../lib/referral";
import { uniqueUsername } from "../lib/username";
import { backfillFeedItems } from "../lib/feed-generators";

// Local dev only — see README.md and .env.example for the current value.
const DEMO_PASSWORD = "WanoLocalDev-9214!";

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function bookingRef() {
  return `PAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function main() {
  console.log("Seeding Wano...");
  const passwordHash = await hash(DEMO_PASSWORD);

  const journeySeed = [
    {
      slug: "relax-unwind",
      name: "Relax & Unwind",
      tagline: "Lakeside calm between match days",
      description:
        "Lakeside and riverside lodges and spas around Jinja and Lake Victoria, plus Kampala boutique retreats — built for families and travellers decompressing between matches.",
      location: "Jinja, Lake Victoria & Kampala",
      targetAudience: "Families & decompressing travellers",
      heroImage: "relax-unwind",
      sortOrder: 1,
    },
    {
      slug: "adrenaline-on-the-nile",
      name: "Adrenaline on the Nile",
      tagline: "Bungee, rapids, and quad tracks at Bujagali",
      description:
        "Bungee jumping, white-water rafting, kayaking and quad biking on the Nile at Jinja and Bujagali Falls — built for young, thrill-seeking groups.",
      location: "Jinja / Bujagali Falls",
      targetAudience: "Young & thrill-seeking groups",
      heroImage: "adrenaline-on-the-nile",
      sortOrder: 2,
    },
    {
      slug: "big-five-safari",
      name: "Big Five Safari",
      tagline: "Game drives across the Rift Valley",
      description:
        "Game drives and boat cruises through Queen Elizabeth National Park, the Kazinga Channel and Murchison Falls — built for first-time visitors to Africa.",
      location: "Queen Elizabeth NP, Kazinga Channel & Murchison Falls",
      targetAudience: "First-time Africa visitors",
      heroImage: "big-five-safari",
      sortOrder: 3,
    },
    {
      slug: "gorilla-trekking",
      name: "Gorilla Trekking",
      tagline: "Face to face with habituated gorilla families",
      description:
        "Guided treks to habituated mountain gorilla families in Bwindi Impenetrable Forest and Mgahinga — built for bucket-list and longer-stay travellers.",
      location: "Bwindi Impenetrable Forest & Mgahinga",
      targetAudience: "Bucket-list & longer-stay travellers",
      heroImage: "gorilla-trekking",
      sortOrder: 4,
    },
    {
      slug: "kampala-city-experience",
      name: "Kampala City Experience",
      tagline: "Museums, markets and nightlife in the capital",
      description:
        "Museums, markets, nightlife and the wildlife centre — the Uganda Museum, Owino Market and UWEC Entebbe — built for culture and nightlife seekers.",
      location: "Kampala & Entebbe",
      targetAudience: "Culture & nightlife seekers",
      heroImage: "kampala-city-experience",
      sortOrder: 5,
    },
  ] as const;

  const insertedJourneys = await db.insert(journeys).values([...journeySeed]).returning();
  const journeyBySlug = new Map(insertedJourneys.map((j) => [j.slug, j]));

  const challengeSeed = [
    {
      key: "refer-a-friend",
      title: "Refer a friend",
      description: "Invite a friend to join Wano with your referral link.",
      rewardText: "Unlock a bonus freebie from any Kampala City partner",
      sortOrder: 1,
    },
    {
      key: "attend-watch-party",
      title: "Attend a watch party",
      description: "Check in at a Wano-listed public watch party during the tournament.",
      rewardText: "Unlock an extra 5% discount code",
      sortOrder: 2,
    },
    {
      key: "share-on-social",
      title: "Share your journey",
      description: "Post about a booked journey and tag @WanoUG.",
      rewardText: "Entry boost toward the grand prize draw",
      sortOrder: 3,
    },
  ] as const;

  await db.insert(challenges).values([...challengeSeed]);

  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@wano.app",
      passwordHash,
      name: "Wano Campaign Admin",
      role: "admin",
      username: await uniqueUsername("Wano Campaign Admin"),
    })
    .returning();

  const [travellerUser] = await db
    .insert(users)
    .values({
      email: "amina@example.com",
      passwordHash,
      name: "Amina Okello",
      role: "traveller",
      username: await uniqueUsername("Amina Okello"),
    })
    .returning();

  const [travellerProfile] = await db
    .insert(travellerProfiles)
    .values({ userId: travellerUser.id, displayName: "Amina", referralCode: generateReferralCode() })
    .returning();

  const vendorSeed = [
    {
      email: "jinja.nile.resort@example.com",
      name: "Wanjiru Achieng",
      businessName: "Jinja Nile Resort & Spa",
      accreditationStatus: "trusted" as const,
      location: "Jinja",
      description: "A riverside resort with spa treatments overlooking the source of the Nile.",
      journeySlugs: ["relax-unwind", "adrenaline-on-the-nile"],
      listing: {
        type: "hotel" as const,
        title: "Riverside Deluxe Escape",
        description: "Two-night stays with spa access and sunset river cruises included.",
        priceLabel: "From",
        priceMinor: 670_000,
        priceUnit: "/night",
        latitude: "0.437700",
        longitude: "33.208700",
      },
      hotelDetails: {
        roomTypes: "Standard River View, Deluxe Suite",
        amenities: "Pool, spa, free breakfast, riverside restaurant",
        checkInTime: "2:00 PM",
        checkOutTime: "11:00 AM",
      },
      offer: {
        discountText: "15% off stays of 2+ nights",
        freebieText: "Complimentary sunset river cruise",
      },
    },
    {
      email: "nalubale.rafting@example.com",
      name: "Peter Mugisha",
      businessName: "Nalubale Rafting Co.",
      accreditationStatus: "trusted" as const,
      location: "Bujagali Falls, Jinja",
      description: "Grade 5 white-water rafting, bungee jumping, and quad bike trails.",
      journeySlugs: ["adrenaline-on-the-nile"],
      listing: {
        type: "experience" as const,
        title: "Full-Day Rafting & Bungee Combo",
        description: "Grade 5 rapids in the morning, bungee jump at sunset.",
        priceLabel: "From",
        priceMinor: 520_000,
        priceUnit: "/person",
        latitude: "0.487200",
        longitude: "33.140800",
      },
      experienceDetails: {
        durationText: "Full day (8 hours)",
        groupSizeText: "2–12 people",
        whatsIncluded: "Safety gear, guide, lunch, action-cam footage",
      },
      offer: {
        discountText: "10% off for groups of 4+",
        freebieText: "Free action-cam footage of your run",
      },
    },
    {
      email: "queens.trail.safaris@example.com",
      name: "Sarah Nabatanzi",
      businessName: "Queen's Trail Safaris",
      accreditationStatus: "trusted" as const,
      location: "Queen Elizabeth National Park",
      description: "Game drives and Kazinga Channel boat cruises with veteran guides.",
      journeySlugs: ["big-five-safari"],
      listing: {
        type: "experience" as const,
        title: "3-Day Big Five Explorer",
        description: "Two game drives and a Kazinga Channel boat cruise.",
        priceLabel: "From",
        priceMinor: 1_550_000,
        priceUnit: "/person",
        latitude: "-0.200000",
        longitude: "29.900000",
      },
      experienceDetails: {
        durationText: "3 days / 2 nights",
        groupSizeText: "2–6 people per vehicle",
        whatsIncluded: "Game drives, boat cruise, park fees, guide",
      },
      offer: {
        discountText: "12% off 3-day+ packages",
        freebieText: "Free park entry for one child under 12",
      },
    },
    {
      email: "bwindi.trekkers.lodge@example.com",
      name: "Moses Byaruhanga",
      businessName: "Bwindi Trekkers Lodge",
      accreditationStatus: "pending" as const,
      location: "Bwindi Impenetrable Forest",
      description: "Lodge and guided trekking permits for habituated gorilla families.",
      journeySlugs: ["gorilla-trekking"],
      listing: {
        type: "hotel" as const,
        title: "Gorilla Permit & Lodge Package",
        description: "Guided trek, permit handling, and two nights at the lodge.",
        priceLabel: "From",
        priceMinor: 2_800_000,
        priceUnit: "/person",
        latitude: "-1.063600",
        longitude: "29.661500",
      },
      hotelDetails: {
        roomTypes: "Forest View Cabin, Family Cabin",
        amenities: "Trekking pole rental, packed lunches, campfire lounge",
        checkInTime: "1:00 PM",
        checkOutTime: "10:00 AM",
      },
      offer: {
        discountText: "8% off permit + lodge bundles",
        freebieText: "Complimentary trekking pole rental",
      },
      pendingDocument: {
        docType: "business_registration" as const,
        documentUrl: "https://drive.example.com/bwindi-trekkers-registration",
      },
    },
    {
      email: "kampala.culture.tours@example.com",
      name: "Grace Kintu",
      businessName: "Kampala Culture Tours",
      accreditationStatus: "trusted" as const,
      location: "Kampala & Entebbe",
      description: "Museum, market, and UWEC wildlife centre tours with local guides.",
      journeySlugs: ["kampala-city-experience"],
      listing: {
        type: "experience" as const,
        title: "Kampala & Entebbe Day Tour",
        description: "Uganda Museum, Owino Market, and UWEC Entebbe in one day.",
        priceLabel: "From",
        priceMinor: 240_000,
        priceUnit: "/person",
        latitude: "0.313600",
        longitude: "32.581100",
      },
      experienceDetails: {
        durationText: "Full day (7 hours)",
        groupSizeText: "1–15 people",
        whatsIncluded: "Guide, transport between stops, UWEC entry",
      },
      offer: {
        discountText: "20% off for AFCON ticket holders",
        freebieText: "Free UWEC wildlife centre entry",
      },
    },
    {
      email: "lechateau.brasserie@example.com",
      name: "Daniel Okwir",
      businessName: "Le Chateau Brasserie",
      accreditationStatus: "trusted" as const,
      location: "Kampala",
      description: "A Kampala institution serving Ugandan and continental dishes since 2005.",
      journeySlugs: ["kampala-city-experience"],
      listing: {
        type: "restaurant" as const,
        title: "Le Chateau Brasserie",
        description: "Ugandan and continental cuisine in a relaxed courtyard setting.",
        priceLabel: "Mains from",
        priceMinor: 30_000,
        priceUnit: null,
        latitude: "0.314900",
        longitude: "32.590200",
      },
      restaurantDetails: {
        cuisine: "Ugandan, Continental",
        hours: "11:00 AM – 11:00 PM daily",
      },
      offer: {
        discountText: "15% off the bill for members",
        freebieText: "Free dessert with any main course",
      },
    },
    {
      email: "entebbe.transit.hotel@example.com",
      name: "Lydia Nansubuga",
      businessName: "Entebbe Airport Transit Hotel",
      accreditationStatus: "trusted" as const,
      location: "Entebbe",
      description:
        "A comfortable stopover hotel five minutes from Entebbe International Airport — no journey tie-in, just a trusted place to land.",
      journeySlugs: [],
      listing: {
        type: "hotel" as const,
        title: "Airport Transit Rooms",
        description: "Soundproofed rooms and a 24-hour airport shuttle.",
        priceLabel: "From",
        priceMinor: 350_000,
        priceUnit: "/night",
        latitude: "0.042300",
        longitude: "32.443600",
      },
      hotelDetails: {
        roomTypes: "Standard, Twin",
        amenities: "24-hour shuttle, soundproofing, express checkout",
        checkInTime: "Anytime (24-hour)",
        checkOutTime: "Anytime (24-hour)",
      },
      offer: {
        discountText: "10% off stopover bookings",
        freebieText: "Free airport shuttle",
      },
    },
    {
      email: "nile.serenity.spa@example.com",
      name: "Esther Nakato",
      businessName: "Nile Serenity Spa",
      accreditationStatus: "trusted" as const,
      location: "Jinja",
      description: "A riverside spa and salon offering massages, facials, and braiding.",
      journeySlugs: ["relax-unwind"],
      listing: {
        type: "spa_salon" as const,
        title: "Riverside Spa Day Package",
        description: "Full-body massage, facial, and a private riverside relaxation lounge.",
        priceLabel: "From",
        priceMinor: 165_000,
        priceUnit: "/session",
        latitude: "0.435100",
        longitude: "33.205400",
      },
      offer: {
        discountText: "15% off spa day packages",
        freebieText: "Free herbal tea service",
      },
    },
  ];

  for (const v of vendorSeed) {
    const [vendorUser] = await db
      .insert(users)
      .values({
        email: v.email,
        passwordHash,
        name: v.name,
        role: "vendor",
        username: await uniqueUsername(v.name),
      })
      .returning();

    const [vendorProfile] = await db
      .insert(vendorProfiles)
      .values({
        userId: vendorUser.id,
        businessName: v.businessName,
        accreditationStatus: v.accreditationStatus,
        location: v.location,
        description: v.description,
      })
      .returning();

    const [listing] = await db
      .insert(listings)
      .values({
        vendorProfileId: vendorProfile.id,
        type: v.listing.type,
        title: v.listing.title,
        description: v.listing.description,
        priceLabel: v.listing.priceLabel,
        priceMinor: v.listing.priceMinor,
        priceUnit: v.listing.priceUnit,
        latitude: v.listing.latitude,
        longitude: v.listing.longitude,
        viewCount: Math.floor(Math.random() * 400) + 20,
      })
      .returning();

    if (v.journeySlugs.length > 0) {
      await db.insert(listingJourneys).values(
        v.journeySlugs.map((slug) => {
          const journey = journeyBySlug.get(slug);
          if (!journey) throw new Error(`Unknown journey slug ${slug}`);
          return { listingId: listing.id, journeyId: journey.id };
        }),
      );
    }

    if ("hotelDetails" in v && v.hotelDetails) {
      await db.insert(hotelDetails).values({ listingId: listing.id, ...v.hotelDetails });
    }
    if ("restaurantDetails" in v && v.restaurantDetails) {
      await db.insert(restaurantDetails).values({ listingId: listing.id, ...v.restaurantDetails });
    }
    if ("experienceDetails" in v && v.experienceDetails) {
      await db.insert(experienceDetails).values({ listingId: listing.id, ...v.experienceDetails });
    }

    await db.insert(offers).values({
      listingId: listing.id,
      discountText: v.offer.discountText,
      freebieText: v.offer.freebieText,
    });

    if (v.accreditationStatus === "trusted") {
      await db.insert(accreditationReviews).values({
        vendorProfileId: vendorProfile.id,
        reviewerUserId: admin.id,
        decision: "trusted",
        notes: "Approved at campaign launch seed.",
      });
    }

    if ("pendingDocument" in v && v.pendingDocument) {
      await db.insert(vendorDocuments).values({
        vendorProfileId: vendorProfile.id,
        docType: v.pendingDocument.docType,
        documentUrl: v.pendingDocument.documentUrl,
      });
    }

    const relaxJourney = journeyBySlug.get("relax-unwind")!;
    const safariJourney = journeyBySlug.get("big-five-safari")!;
    const bookJourneyId =
      v.businessName === "Jinja Nile Resort & Spa"
        ? relaxJourney.id
        : v.businessName === "Queen's Trail Safaris"
          ? safariJourney.id
          : null;

    if (bookJourneyId) {
      const [booking] = await db
        .insert(bookings)
        .values({
          travellerId: travellerProfile.id,
          listingId: listing.id,
          journeyId: bookJourneyId,
          status: "confirmed",
          bookingRef: bookingRef(),
          estimatedCommission: "18.00",
        })
        .returning();

      await db.insert(stamps).values({
        travellerId: travellerProfile.id,
        journeyId: bookJourneyId,
        bookingId: booking.id,
      });
    }
  }

  const allChallenges = await db.select().from(challenges);
  const referFriend = allChallenges.find((c) => c.key === "refer-a-friend");
  if (referFriend) {
    await db.insert(challengeCompletions).values({
      travellerId: travellerProfile.id,
      challengeId: referFriend.id,
      status: "verified",
      completedAt: new Date(),
    });
  }

  await db.insert(promoCodes).values([
    {
      code: "AFCON27",
      title: "Tournament kickoff special",
      discountText: "Extra 5% off any journey booking",
      freebieText: "Commemorative Wano travel tag",
      journeyId: null,
    },
    {
      code: "KAMPALA10",
      title: "Kampala explorer special",
      discountText: "Extra 10% off any hotel stay",
      journeyId: null,
    },
    {
      code: "NILEWEEK",
      title: "Nile adventure week",
      discountText: "15% off rafting and river tours",
      freebieText: "Free waterproof bag",
      journeyId: null,
      // Deliberately inside the 5-day perk_expiring window at seed time, so
      // a fresh seed demonstrates that generator too, not just perk_added.
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  const feedCounts = await backfillFeedItems();
  console.log("Feed items generated:", feedCounts);

  console.log("Seed complete.");
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);
  console.log(`Admin login: admin@wano.app`);
  console.log(`Traveller login: amina@example.com`);
  console.log(`Vendor logins: ${vendorSeed.map((v) => v.email).join(", ")}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
