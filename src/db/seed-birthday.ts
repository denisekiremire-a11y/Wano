import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { birthdayPerks, events, listings, users, vendorProfiles } from "./schema";
import { uniqueUsername } from "../lib/username";

// One-time incremental seed adding two new venues (Izumi, 1420) and their
// birthday perks. Both are added with clearly-placeholder business details —
// real address/hours/etc. should be confirmed and edited by the business
// owner via the vendor dashboard once they're onboarded for real.

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
  console.log("Seeding birthday-perk venues (Izumi, 1420)...");

  const izumiVendor = await ensureVendor({
    email: "izumi@example.com",
    contactName: "Izumi Management (placeholder)",
    businessName: "Izumi",
    description:
      "Placeholder listing added for the Wano birthday-perks feature — address, hours and menu details are pending confirmation from the business.",
  });

  if (izumiVendor) {
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.vendorProfileId, izumiVendor.id))
      .limit(1);

    const izumiListing =
      existingListing ??
      (
        await db
          .insert(listings)
          .values({
            vendorProfileId: izumiVendor.id,
            type: "restaurant",
            title: "Izumi",
            description: "Placeholder details — to be confirmed by the business.",
            // Not published — no confirmed price/details yet, see
            // listingPublishConditions. Confirm with the business, then
            // fill in a real price and flip isPublished via /admin/vendors.
            isPublished: false,
          })
          .returning()
      )[0];

    const [existingPerk] = await db
      .select()
      .from(birthdayPerks)
      .where(eq(birthdayPerks.listingId, izumiListing.id))
      .limit(1);

    if (!existingPerk) {
      await db.insert(birthdayPerks).values({
        listingId: izumiListing.id,
        title: "Birthday at Izumi",
        minPartySize: 2,
        discountText: "10% off the bill",
        freebieText: "A birthday cake",
      });
      console.log("Added Izumi birthday perk.");
    } else {
      console.log("Izumi birthday perk already exists, skipping.");
    }
  }

  const venue1420Vendor = await ensureVendor({
    email: "1420@example.com",
    contactName: "1420 Management (placeholder)",
    businessName: "1420",
    description:
      "Placeholder listing added for the Wano birthday-perks feature — address, hours and menu details are pending confirmation from the business.",
  });

  if (venue1420Vendor) {
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.vendorProfileId, venue1420Vendor.id))
      .limit(1);

    const venue1420Listing =
      existingListing ??
      (
        await db
          .insert(listings)
          .values({
            vendorProfileId: venue1420Vendor.id,
            type: "restaurant",
            title: "1420",
            description: "Placeholder details — to be confirmed by the business.",
            // Not published — see the same note on the Izumi listing above.
            isPublished: false,
          })
          .returning()
      )[0];

    const [existingEvent] = await db
      .select()
      .from(events)
      .where(eq(events.title, "Malfy Brunch"))
      .limit(1);

    const malfyBrunch =
      existingEvent ??
      (
        await db
          .insert(events)
          .values({
            title: "Malfy Brunch",
            description:
              "Weekly brunch at 1420 — details to be confirmed by the business.",
            category: "food",
            startAt: hoursFromNow(96),
            endAt: hoursFromNow(99),
            location: "1420, Kampala",
            organizerVendorProfileId: venue1420Vendor.id,
            priceHint: "TBC",
            // Tied to the not-yet-published 1420 listing above — don't show
            // this publicly until the venue is confirmed and flipped on.
            active: false,
          })
          .returning()
      )[0];

    const [existingPerk] = await db
      .select()
      .from(birthdayPerks)
      .where(eq(birthdayPerks.listingId, venue1420Listing.id))
      .limit(1);

    if (!existingPerk) {
      await db.insert(birthdayPerks).values({
        listingId: venue1420Listing.id,
        eventId: malfyBrunch.id,
        title: "Malfy Brunch birthday perk",
        minPartySize: 5,
        freebieText: "A free bottle of Malfy",
      });
      console.log("Added 1420 / Malfy Brunch birthday perk.");
    } else {
      console.log("1420 birthday perk already exists, skipping.");
    }
  }

  console.log("Birthday-perk seed complete.");
  console.log(`Demo login for both new venues: izumi@example.com / 1420@example.com — password ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
