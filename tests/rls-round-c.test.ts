import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/db";
import { pointsLedger, travellerProfiles, users } from "../src/db/schema";

// Same reasoning as tests/rls-round-a.test.ts and rls-round-b.test.ts: a
// second, genuinely restricted (non-superuser, non-owner) connection is
// the only way to prove points_ledger's policies (manual_rewards_v2.sql)
// actually hold, independent of the app's own (superuser, locally) client.
const TEST_ROLE = "wano_rls_test";
const TEST_PASSWORD = "wano_rls_test";

let restricted: ReturnType<typeof postgres>;
let travellerAUserId: string;
let travellerBUserId: string;
let travellerAId: string;
let travellerBId: string;

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

  const suffix = Math.random().toString(36).slice(2, 10);
  const [userA] = await db
    .insert(users)
    .values({ email: `rls-c-a-${suffix}@test.local`, passwordHash: "x", name: "RLS C Traveller A", role: "traveller" })
    .returning();
  const [userB] = await db
    .insert(users)
    .values({ email: `rls-c-b-${suffix}@test.local`, passwordHash: "x", name: "RLS C Traveller B", role: "traveller" })
    .returning();
  travellerAUserId = userA.id;
  travellerBUserId = userB.id;
  const [travellerA] = await db
    .insert(travellerProfiles)
    .values({ userId: userA.id, displayName: "RLS C Traveller A", referralCode: `RLSCA${suffix}` })
    .returning();
  const [travellerB] = await db
    .insert(travellerProfiles)
    .values({ userId: userB.id, displayName: "RLS C Traveller B", referralCode: `RLSCB${suffix}` })
    .returning();
  travellerAId = travellerA.id;
  travellerBId = travellerB.id;

  await db.insert(pointsLedger).values([
    { travellerId: travellerAId, delta: 150, reason: "seed", sourceType: "manual_adjustment" },
    { travellerId: travellerBId, delta: 200, reason: "seed", sourceType: "manual_adjustment" },
  ]);
});

afterAll(async () => {
  await db.delete(pointsLedger).where(eq(pointsLedger.travellerId, travellerAId));
  await db.delete(pointsLedger).where(eq(pointsLedger.travellerId, travellerBId));
  await db.delete(travellerProfiles).where(eq(travellerProfiles.id, travellerAId));
  await db.delete(travellerProfiles).where(eq(travellerProfiles.id, travellerBId));
  await db.delete(users).where(eq(users.id, travellerAUserId));
  await db.delete(users).where(eq(users.id, travellerBUserId));
  await restricted.end();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function asTraveller(travellerId: string, fn: (sql: any) => Promise<any>) {
  return restricted.begin(async (tx) => {
    await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerId}, true)`;
    return fn(tx);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function asAdmin(fn: (sql: any) => Promise<any>) {
  return restricted.begin(async (tx) => {
    await tx`select set_config('app.role', 'admin', true)`;
    return fn(tx);
  });
}

describe("points_ledger RLS", () => {
  it("a traveller sees only their own ledger rows", async () => {
    const rows = await asTraveller(travellerAId, (tx) => tx`select * from points_ledger`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r: { traveller_id: string }) => r.traveller_id === travellerAId)).toBe(true);
  });

  it("an admin sees every traveller's ledger rows", async () => {
    const rows = await asAdmin((tx) => tx`select * from points_ledger where traveller_id in (${travellerAId}, ${travellerBId})`);
    expect(rows).toHaveLength(2);
  });

  it("a traveller cannot insert directly into their own ledger (system/admin-only writes)", async () => {
    await expect(
      asTraveller(travellerAId, (tx) =>
        tx`insert into points_ledger (traveller_id, delta, reason, source_type) values (${travellerAId}, 999, 'self-insert', 'manual_adjustment')`,
      ),
    ).rejects.toThrow();
  });

  it("an admin can insert a ledger row", async () => {
    const rows = await asAdmin(
      (tx) =>
        tx`insert into points_ledger (traveller_id, delta, reason, source_type) values (${travellerAId}, 50, 'admin-insert', 'manual_adjustment') returning id`,
    );
    expect(rows).toHaveLength(1);
  });
});
