import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { journalPosts, users } from "./schema";
import { generateJournalPublishedItem } from "../lib/feed-generators";

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  if (!admin) {
    console.error("No admin user found — run db:seed first.");
    process.exit(1);
  }

  const existing = await db.select({ slug: journalPosts.slug }).from(journalPosts);
  const existingSlugs = new Set(existing.map((r) => r.slug));

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const posts = [
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

- **Entebbe International Airport**: kiosks in the arrivals hall, open for every flight. Slightly pricier, but you land connected.
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

**Ride-hailing apps** — the easiest for a first-time visitor. Book from inside the arrivals hall once you have SIM data; fixed pricing means no negotiation.

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

  let inserted = 0;
  for (const post of posts) {
    if (existingSlugs.has(post.slug)) continue;
    const [row] = await db
      .insert(journalPosts)
      .values({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        authorUserId: admin.id,
        category: post.category,
        tags: [...post.tags],
        status: "published",
        publishedAt: daysAgo(posts.indexOf(post) + 1),
        seoDescription: post.excerpt,
      })
      .returning();
    await generateJournalPublishedItem(row.id);
    inserted++;
  }

  console.log(`Seeded ${inserted} journal posts (${posts.length - inserted} already existed).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
