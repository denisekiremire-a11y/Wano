import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { seedJournalPosts } from "../lib/seed-content";

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  if (!admin) {
    console.error("No admin user found — run db:seed first.");
    process.exit(1);
  }

  const result = await seedJournalPosts(admin.id);
  console.log(`Seeded ${result.journalPostsCreated} journal posts (${result.journalPostsSkipped} already existed).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
