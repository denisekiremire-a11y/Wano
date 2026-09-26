import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/db";
import { listings, vendorDocuments, vendorProfiles } from "../src/db/schema";

// These tests deliberately do NOT go through the app's own db client (a
// superuser locally, which bypasses RLS entirely — see db-context.ts's
// warning). They open a second, genuinely restricted connection — no
// superuser bit, no BYPASSRLS, not the table owner — to prove the RLS
// policies in drizzle/manual_rls_round_a.sql hold on their own, with zero
// application code involved. This is what actually answers "can a vendor
// reach another vendor's data even if an app-level check is missing?".
const TEST_ROLE = "wano_rls_test";
const TEST_PASSWORD = "wano_rls_test";

let restricted: ReturnType<typeof postgres>;
let vendorAId: string;
let vendorBId: string;
let listingAId: string;

beforeAll(async () => {
  await db.execute(sql.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
        CREATE ROLE ${TEST_ROLE} LOGIN PASSWORD '${TEST_PASSWORD}' NOSUPERUSER NOBYPASSRLS;
      END IF;
    END
    $$;
  `));
  const dbName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
  await db.execute(sql.raw(`GRANT CONNECT ON DATABASE ${dbName} TO ${TEST_ROLE};`));
  await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${TEST_ROLE};`));
  await db.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${TEST_ROLE};`));

  const url = new URL(process.env.DATABASE_URL!);
  restricted = postgres({
    host: url.hostname,
    port: Number(url.port || 5432),
    database: dbName,
    username: TEST_ROLE,
    password: TEST_PASSWORD,
  });

  const allVendors = await db.select().from(vendorProfiles).limit(2);
  vendorAId = allVendors[0].id;
  vendorBId = allVendors[1]?.id ?? allVendors[0].id;
  const [listingA] = await db.select().from(listings).where(eq(listings.vendorProfileId, vendorAId)).limit(1);
  listingAId = listingA.id;
});

afterAll(async () => {
  await restricted?.end();
});

describe("RLS Round A — cross-vendor isolation with zero application code involved", () => {
  it("lets anyone read listings with no session context set (public browse stays open)", async () => {
    const rows = await restricted`select count(*)::int as count from listings`;
    expect(rows[0].count).toBeGreaterThan(0);
  });

  it("blocks vendor A from updating vendor B's listing", async () => {
    await restricted.begin(async (tx) => {
      await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorBId}, true)`;
      const result = await tx`update listings set title = 'HACKED' where id = ${listingAId} and vendor_profile_id != ${vendorBId}`;
      expect(result.count).toBe(0);
    });
  });

  it("lets vendor A update their own listing", async () => {
    await restricted.begin(async (tx) => {
      await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorAId}, true)`;
      const result = await tx`update listings set title = title where id = ${listingAId}`;
      expect(result.count).toBe(1);
    });
  });

  it("rejects any listings write with no role/vendor context set at all", async () => {
    await restricted.begin(async (tx) => {
      const result = await tx`update listings set title = title where id = ${listingAId}`;
      expect(result.count).toBe(0);
    });
  });

  it("hides another vendor's KYC documents entirely (fully-private table)", async () => {
    const [docA] = await db
      .insert(vendorDocuments)
      .values({ vendorProfileId: vendorAId, docType: "owner_id", fileName: "vendor-a-id.pdf", status: "pending" })
      .returning();
    try {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorBId}, true)`;
        const rows = await tx`select id from vendor_documents where id = ${docA.id}`;
        expect(rows.length).toBe(0);
      });
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorAId}, true)`;
        const rows = await tx`select id from vendor_documents where id = ${docA.id}`;
        expect(rows.length).toBe(1);
      });
    } finally {
      await db.delete(vendorDocuments).where(eq(vendorDocuments.id, docA.id));
    }
  });

  it("lets an admin session write to any vendor's listing regardless of vendor_profile_id", async () => {
    await restricted.begin(async (tx) => {
      await tx`select set_config('app.role', 'admin', true)`;
      const result = await tx`update listings set title = title where id = ${listingAId}`;
      expect(result.count).toBe(1);
    });
  });
});
