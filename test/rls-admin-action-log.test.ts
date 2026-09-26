import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/db";
import { adminActionLog, users } from "../src/db/schema";

// Stage 1.3 (admin action log): same reasoning as test/rls-round-a.test.ts
// and test/rls-round-b.test.ts — a second, genuinely restricted (non-
// superuser, non-bypassrls) connection is the only real proof that
// admin_action_log's "admin-only, full stop" policy holds, independent of
// the app's own (superuser, locally) db client.
const TEST_ROLE = "wano_rls_test";
const TEST_PASSWORD = "wano_rls_test";

let restricted: ReturnType<typeof postgres>;
let anyUserId: string;
let logEntryId: string;

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

  const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
  anyUserId = anyUser.id;

  const [entry] = await db
    .insert(adminActionLog)
    .values({ actorUserId: anyUserId, action: "test.seed", summary: "Seeded for rls-admin-action-log tests" })
    .returning();
  logEntryId = entry.id;
});

afterAll(async () => {
  await restricted?.end();
  await db.delete(adminActionLog).where(eq(adminActionLog.id, logEntryId));
});

describe("RLS — admin_action_log is admin-only, full stop", () => {
  it("hides every row with no context set at all", async () => {
    const rows = await restricted`select id from admin_action_log where id = ${logEntryId}`;
    expect(rows.length).toBe(0);
  });

  it("hides every row even under a traveller or vendor context — this table has no non-admin reader", async () => {
    await restricted.begin(async (tx) => {
      await tx`select set_config('app.role', 'traveller', true)`;
      const rows = await tx`select id from admin_action_log where id = ${logEntryId}`;
      expect(rows.length).toBe(0);
    });
    await restricted.begin(async (tx) => {
      await tx`select set_config('app.role', 'vendor', true)`;
      const rows = await tx`select id from admin_action_log where id = ${logEntryId}`;
      expect(rows.length).toBe(0);
    });
  });

  it("lets an admin context read it", async () => {
    await restricted.begin(async (tx) => {
      await tx`select set_config('app.role', 'admin', true)`;
      const rows = await tx`select id from admin_action_log where id = ${logEntryId}`;
      expect(rows.length).toBe(1);
    });
  });

  it("rejects an insert with no admin context", async () => {
    await expect(
      restricted.begin(async (tx) => {
        await tx`insert into admin_action_log (actor_user_id, action, summary) values (${anyUserId}, 'test.reject', 'should not land')`;
      }),
    ).rejects.toThrow();
  });

  it("lets an admin context insert", async () => {
    await restricted.begin(async (tx) => {
      await tx`select set_config('app.role', 'admin', true)`;
      const rows = await tx`insert into admin_action_log (actor_user_id, action, summary) values (${anyUserId}, 'test.accept', 'should land') returning id`;
      expect(rows.length).toBe(1);
      await tx`delete from admin_action_log where id = ${rows[0].id}`;
    });
  });
});
