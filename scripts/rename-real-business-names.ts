import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";

/** One-off fix: several demo/seed vendors were named after real Uganda
 * businesses (SafeBoda, Jinja Nile Resort, Nalubale Rafting, Le Chateau
 * Brasserie, Izumi, 1420/"Malfy Brunch", Mama Ashanti Kitchen) — a false-
 * advertising/impersonation risk if someone found this preview build and
 * mistook it for a real partnership. The seed scripts (seed.ts,
 * seed-birthday.ts, seed-content.ts, seed-wano.ts) now use fictional
 * replacements; this script renames any rows a past seed run already
 * created, in whatever database it's pointed at. Matches by the OLD value
 * and no-ops if that value is gone (already renamed, or never existed),
 * so it's safe to run more than once and against a DB that only has some
 * of these rows. */

type Rename = { table: string; column: string; from: string; to: string };

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const log = (msg: string) => console.log(msg);

    async function renameText({ table, column, from, to }: Rename) {
      const result = await sql`
        update ${sql(table)} set ${sql(column)} = ${to} where ${sql(column)} = ${from}
      `;
      if (result.count > 0) log(`${table}.${column}: "${from}" -> "${to}" (${result.count} row(s))`);
    }

    // --- vendor_profiles.business_name ---
    const businessNameRenames: [string, string][] = [
      ["Jinja Nile Resort & Spa", "Nile Haven Resort & Spa"],
      ["Nalubale Rafting Co.", "Source Rapids Co."],
      ["Queen's Trail Safaris", "Savannah Trail Safaris"],
      ["Bwindi Trekkers Lodge", "Misty Ridge Gorilla Lodge"],
      ["Kampala Culture Tours", "Seven Hills Culture Tours"],
      ["Le Chateau Brasserie", "La Promenade Brasserie"],
      ["Entebbe Airport Transit Hotel", "Lakeside Transit Hotel"],
      ["Nile Serenity Spa", "Riverside Serenity Spa"],
      ["SafeBoda", "Pamoja Rides"],
      ["Izumi", "Sakura Table"],
      ["1420", "The Nightjar Lounge"],
      ["Mama Ashanti Kitchen", "Mama Zawadi Kitchen"],
    ];
    for (const [from, to] of businessNameRenames) {
      await renameText({ table: "vendor_profiles", column: "business_name", from, to });
    }

    // --- vendor_profiles.description (text that named the real business) ---
    await renameText({
      table: "vendor_profiles",
      column: "description",
      from: "A Kampala institution serving Ugandan and continental dishes since 2005.",
      to: "A relaxed courtyard brasserie serving Ugandan and continental dishes.",
    });
    await renameText({
      table: "vendor_profiles",
      column: "description",
      from: "Uganda's ride-hailing app for boda and car rides — the fastest way from Entebbe Airport into Kampala, or around the city once you're there.",
      to: "A fictional ride-hailing app for boda and car rides — the fastest way from Entebbe Airport into Kampala, or around the city once you're there.",
    });

    // --- users.name (only where the contact name was itself the real brand) ---
    await renameText({ table: "users", column: "name", from: "SafeBoda Partnerships", to: "Joseph Kato" });
    await renameText({
      table: "users",
      column: "name",
      from: "Izumi Management (placeholder)",
      to: "Sakura Table Management (demo)",
    });
    await renameText({
      table: "users",
      column: "name",
      from: "1420 Management (placeholder)",
      to: "The Nightjar Lounge Management (demo)",
    });

    // --- users.email (demo accounts only — never real addresses) ---
    const emailRenames: [string, string][] = [
      ["jinja.nile.resort@example.com", "nile.haven.resort@example.com"],
      ["nalubale.rafting@example.com", "source.rapids@example.com"],
      ["queens.trail.safaris@example.com", "savannah.trail.safaris@example.com"],
      ["bwindi.trekkers.lodge@example.com", "misty.ridge.lodge@example.com"],
      ["kampala.culture.tours@example.com", "seven.hills.tours@example.com"],
      ["lechateau.brasserie@example.com", "lapromenade.brasserie@example.com"],
      ["entebbe.transit.hotel@example.com", "lakeside.transit.hotel@example.com"],
      ["nile.serenity.spa@example.com", "riverside.serenity.spa@example.com"],
      ["safeboda.partnerships@example.com", "pamoja.rides.partnerships@example.com"],
      ["izumi@example.com", "sakura.table@example.com"],
      ["1420@example.com", "nightjar.lounge@example.com"],
      ["demo.mama.ashanti.kitchen@wano.app", "demo.mama.zawadi.kitchen@wano.app"],
    ];
    for (const [from, to] of emailRenames) {
      await renameText({ table: "users", column: "email", from, to });
    }

    // --- listings.title ---
    const listingTitleRenames: [string, string][] = [
      ["Le Chateau Brasserie", "La Promenade Brasserie"],
      ["Airport & City Rides with SafeBoda", "Airport & City Rides with Pamoja Rides"],
      ["Izumi", "Sakura Table"],
      ["1420", "The Nightjar Lounge"],
      ["Mama Ashanti Kitchen", "Mama Zawadi Kitchen"],
    ];
    for (const [from, to] of listingTitleRenames) {
      await renameText({ table: "listings", column: "title", from, to });
    }

    // --- listings.description (text that named the real business) ---
    await renameText({
      table: "listings",
      column: "description",
      from: "Verified boda and car rides with fixed upfront fares — book straight from the SafeBoda app. Look for the Wano welcome stand in the Entebbe arrivals hall for pickup and a SIM card in one stop.",
      to: "Verified boda and car rides with fixed upfront fares — book straight from the Pamoja Rides app. Look for the Wano welcome stand in the Entebbe arrivals hall for pickup and a SIM card in one stop.",
    });

    // --- listings.external_booking_url — remove the real safeboda.com link ---
    const extUrlResult = await sql`
      update listings set external_booking_url = null where external_booking_url = 'https://safeboda.com'
    `;
    if (extUrlResult.count > 0) log(`listings.external_booking_url: cleared real safeboda.com link (${extUrlResult.count} row(s))`);

    // --- vendor_documents.document_url (pending-accreditation doc URL) ---
    await renameText({
      table: "vendor_documents",
      column: "document_url",
      from: "https://drive.example.com/bwindi-trekkers-registration",
      to: "https://drive.example.com/misty-ridge-lodge-registration",
    });

    // --- rewards.title (Fun Zone prize text) ---
    await renameText({
      table: "rewards",
      column: "title",
      from: "20% off at Le Chateau Brasserie",
      to: "20% off at La Promenade Brasserie",
    });

    // --- events (the "Malfy Brunch" / 1420 event) ---
    await renameText({ table: "events", column: "title", from: "Malfy Brunch", to: "Golden Hour Brunch" });
    await renameText({
      table: "events",
      column: "description",
      from: "Weekly brunch at 1420 — details to be confirmed by the business.",
      to: "Weekly brunch at The Nightjar Lounge — fictional demo event, sample data only.",
    });
    await renameText({ table: "events", column: "location", from: "1420, Kampala", to: "The Nightjar Lounge, Kampala" });

    // --- birthday_perks ---
    await renameText({ table: "birthday_perks", column: "title", from: "Birthday at Izumi", to: "Birthday at Sakura Table" });
    await renameText({
      table: "birthday_perks",
      column: "title",
      from: "Malfy Brunch birthday perk",
      to: "Golden Hour Brunch birthday perk",
    });
    await renameText({
      table: "birthday_perks",
      column: "freebie_text",
      from: "A free bottle of Malfy",
      to: "A free round of drinks",
    });

    log("Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
