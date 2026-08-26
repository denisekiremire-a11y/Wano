import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __pamojaSql: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

const sql = globalThis.__pamojaSql ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pamojaSql = sql;
}

export const db = drizzle(sql, { schema });
