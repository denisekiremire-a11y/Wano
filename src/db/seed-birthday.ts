import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { birthdayPerks, events, listings, users, vendorProfiles } from "./schema";
import { uniqueUsername } from "../lib/username";

// One-time incremental seed adding two new demo venues (Sakura Table, The
// Nightjar Lounge) and their birthday perks. Both are fictional — names,
// contacts and details are made up for demo purposes only and don't
// correspond to any real business.

// Local dev only — see README.md and .env.example for the current value.
const DEMO_PASSWORD = "WanoLocalDev-9214!";

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function ensureVendor(opts: {
  email: string;
  contactName: string;
  businessName: string;
  description: string;
}) {
  const [existingUser] = await db.select().from(users).where(eq(users.email, opts.email)).limit(1);
  if (existingUser) {
    const [vendorProfile] = await db
      .select()
      .from(vendorProfiles)
      .where(eq(vendorProfiles.userId, existingUser.id))
      .limit(1);
    return vendorProfile ?? null;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [user] = await db
    .insert(users)
    .values({
      email: opts.email,
      passwordHash,
      name: opts.contactName,
      role: "vendor",
      username: await uniqueUsername(opts.contactName),
    })
    .returning();

  const [vendorProfile] = await db
    .insert(vendorProfiles)
    .values({
      userId: user.id,
      businessName: opts.businessName,
      accreditationStatus: "trusted",
      location: "Kampala",
      description: opts.description,
    })
    .returning();

  return vendorProfile;
}

async function main() {
  console.log("Seeding birthday-perk venues (Sakura Table, The Nightjar Lounge)...");

  const sakuraVendor = await ensureVendor({
    email: "sakura.table@example.com",
    contactName: "Sakura Table Management (demo)",
    businessName: "Sakura Table",
    description: "Demo listing added for the Wano birthday-perks feature — fictional business, sample data only.",
  });

  if (sakuraVendor) {
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.vendorProfileId, sakuraVendor.id))
      .limit(1);

    const sakuraListing =
      existingListing ??
      (
        await db
          .insert(listings)
          .values({
            vendorProfileId: sakuraVendor.id,
            type: "restaurant",
            title: "Sakura Table",
            description: "Demo details — fictional business, sample data only.",
            // Not published — no confirmed price/details, see
            // listingPublishConditions. Fill in a real price and flip
            // isPublished via /admin/vendors if this is ever made real.
            isPublished: false,
          })
          .returning()
      )[0];

    const [existingPerk] = await db
      .select()
      .from(birthdayPerks)
      .where(eq(birthdayPerks.listingId, sakuraListing.id))
      .limit(1);

    if (!existingPerk) {
      await db.insert(birthdayPerks).values({
        listingId: sakuraListing.id,
        title: "Birthday at Sakura Table",
        minPartySize: 2,
        discountText: "10% off the bill",
        freebieText: "A birthday cake",
      });
      console.log("Added Sakura Table birthday perk.");
    } else {
      console.log("Sakura Table birthday perk already exists, skipping.");
    }
  }

  const nightjarVendor = await ensureVendor({
    email: "nightjar.lounge@example.com",
    contactName: "The Nightjar Lounge Management (demo)",
    businessName: "The Nightjar Lounge",
    description: "Demo listing added for the Wano birthday-perks feature — fictional business, sample data only.",
  });

  if (nightjarVendor) {
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.vendorProfileId, nightjarVendor.id))
      .limit(1);

    const nightjarListing =
      existingListing ??
      (
        await db
          .insert(listings)
          .values({
            vendorProfileId: nightjarVendor.id,
            type: "restaurant",
            title: "The Nightjar Lounge",
            description: "Demo details — fictional business, sample data only.",
            // Not published — see the same note on the Sakura Table listing above.
            isPublished: false,
          })
          .returning()
      )[0];

    const [existingEvent] = await db
      .select()
      .from(events)
      .where(eq(events.title, "Golden Hour Brunch"))
      .limit(1);

    const goldenHourBrunch =
      existingEvent ??
      (
        await db
          .insert(events)
          .values({
            title: "Golden Hour Brunch",
            description: "Weekly brunch at The Nightjar Lounge — fictional demo event, sample data only.",
            category: "food",
            startAt: hoursFromNow(96),
            endAt: hoursFromNow(99),
            location: "The Nightjar Lounge, Kampala",
            organizerVendorProfileId: nightjarVendor.id,
            priceHint: "TBC",
            // Tied to the not-yet-published listing above — don't show this
            // publicly until it's confirmed and flipped on.
            active: false,
          })
          .returning()
      )[0];

    const [existingPerk] = await db
      .select()
      .from(birthdayPerks)
      .where(eq(birthdayPerks.listingId, nightjarListing.id))
      .limit(1);

    if (!existingPerk) {
      await db.insert(birthdayPerks).values({
        listingId: nightjarListing.id,
        eventId: goldenHourBrunch.id,
        title: "Golden Hour Brunch birthday perk",
        minPartySize: 5,
        freebieText: "A free round of drinks",
      });
      console.log("Added The Nightjar Lounge / Golden Hour Brunch birthday perk.");
    } else {
      console.log("The Nightjar Lounge birthday perk already exists, skipping.");
    }
  }

  console.log("Birthday-perk seed complete.");
  console.log(
    `Demo login for both new venues: sakura.table@example.com / nightjar.lounge@example.com — password ${DEMO_PASSWORD}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
