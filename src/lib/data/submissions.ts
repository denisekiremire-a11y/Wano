import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, rewards, users, vendorProfiles, vendorSubmissions } from "@/db/schema";
import type { DbOrTx } from "@/lib/db-context";

// vendor_submissions has no public-read RLS policy (it's a vendor's
// private pending-edit queue) — every function here takes an optional
// trailing `client`, defaulting to `db` for callers that don't need it
// (nothing to read yet, or the table isn't RLS-covered at their call
// site), but every real caller must pass the `tx` from an open
// withRlsContext or these return nothing once RLS is enabled.

export async function getPendingSubmissionsCount(client: DbOrTx = db) {
  const [row] = await client.select({ total: count() }).from(vendorSubmissions).where(eq(vendorSubmissions.status, "pending"));
  return row?.total ?? 0;
}

/** The vendor's own submissions (listing/reward creates and edits), newest
 * first — shown on their dashboard so they can see what's pending, what
 * was approved, and why anything was rejected. */
export async function getSubmissionsForVendor(vendorProfileId: string, client: DbOrTx = db) {
  return client
    .select()
    .from(vendorSubmissions)
    .where(eq(vendorSubmissions.vendorProfileId, vendorProfileId))
    .orderBy(desc(vendorSubmissions.createdAt));
}

/** The one pending submission proposing an edit to an existing listing/
 * reward, if any — used to fold a resubmitted edit into the existing
 * pending row instead of piling up duplicates. Brand-new listing/reward
 * proposals (entityId null) don't need this: a vendor can have several
 * of those in flight at once, each independent. */
export async function getPendingEditSubmission(
  vendorProfileId: string,
  entityType: "listing" | "reward",
  entityId: string,
  client: DbOrTx = db,
) {
  const [row] = await client
    .select()
    .from(vendorSubmissions)
    .where(
      and(
        eq(vendorSubmissions.vendorProfileId, vendorProfileId),
        eq(vendorSubmissions.entityType, entityType),
        eq(vendorSubmissions.entityId, entityId),
        eq(vendorSubmissions.status, "pending"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Pending submissions tied to a specific listing/reward — for the vendor's
 * own edit-form page to show "you have an edit awaiting review" alongside
 * the still-live approved content. */
export async function getPendingSubmissionsForEntities(
  entityType: "listing" | "reward",
  entityIds: string[],
  client: DbOrTx = db,
) {
  if (entityIds.length === 0) return new Map<string, typeof vendorSubmissions.$inferSelect>();
  const rows = await client
    .select()
    .from(vendorSubmissions)
    .where(and(eq(vendorSubmissions.entityType, entityType), eq(vendorSubmissions.status, "pending")));
  const map = new Map<string, typeof vendorSubmissions.$inferSelect>();
  for (const row of rows) {
    if (row.entityId && entityIds.includes(row.entityId)) map.set(row.entityId, row);
  }
  return map;
}

export async function getSubmissionById(id: string, client: DbOrTx = db) {
  const [row] = await client.select().from(vendorSubmissions).where(eq(vendorSubmissions.id, id)).limit(1);
  return row ?? null;
}

/** Admin review queue — every pending submission, newest first, with the
 * vendor's business name and (for edits) the listing/reward's current
 * title so admin can tell what's being proposed at a glance. */
export async function getPendingSubmissions(client: DbOrTx = db) {
  const rows = await client
    .select({ submission: vendorSubmissions, vendor: vendorProfiles })
    .from(vendorSubmissions)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, vendorSubmissions.vendorProfileId))
    .where(eq(vendorSubmissions.status, "pending"))
    .orderBy(desc(vendorSubmissions.createdAt));

  return Promise.all(
    rows.map(async ({ submission, vendor }) => {
      let currentTitle: string | null = null;
      if (submission.entityId) {
        if (submission.entityType === "listing") {
          const [l] = await client.select({ title: listings.title }).from(listings).where(eq(listings.id, submission.entityId)).limit(1);
          currentTitle = l?.title ?? null;
        } else {
          const [r] = await client.select({ title: rewards.title }).from(rewards).where(eq(rewards.id, submission.entityId)).limit(1);
          currentTitle = r?.title ?? null;
        }
      }
      return { submission, vendor, currentTitle };
    }),
  );
}

export async function getVendorUserEmail(vendorProfileId: string) {
  const [row] = await db
    .select({ email: users.email, businessName: vendorProfiles.businessName })
    .from(vendorProfiles)
    .innerJoin(users, eq(users.id, vendorProfiles.userId))
    .where(eq(vendorProfiles.id, vendorProfileId))
    .limit(1);
  return row ?? null;
}
