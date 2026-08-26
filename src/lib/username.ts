import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "member";
}

export async function uniqueUsername(name: string) {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;
  while (true) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing) return candidate;
    candidate = `${base}${attempt++}`;
  }
}
