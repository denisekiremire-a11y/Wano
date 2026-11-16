/**
 * Create (or promote) a registry administrator.
 *
 *   npm run create-admin -- owner@example.com
 *
 * Prompts for a password (min 12 chars) unless ADMIN_PASSWORD is set. Reads
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) from the
 * environment or .env.local. Run it from your own computer — never expose the secret key.
 */
import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Usage: npm run create-admin -- you@example.com");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (in .env.local or the environment).");
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password for the admin account (min 12 characters, shown as you type): ");
    rl.close();
  }
  if (password.length < 12) {
    console.error("Please use a password of at least 12 characters.");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Find an existing user with this email, or create one.
  let userId: string | null = null;
  for (let page = 1; page < 50 && !userId; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (userId) {
    const { error } = await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) throw error;
    console.log(`Existing user ${email} found; password updated.`);
  } else {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created user ${email}.`);
  }

  const { error } = await sb.from("admin_profiles").upsert({ user_id: userId, display_name: "Registry owner" });
  if (error) throw error;
  console.log(`✔ ${email} is now a registry administrator. Sign in at /admin/login`);
}

main().catch((e) => {
  console.error("Failed:", e.message ?? e);
  process.exit(1);
});
