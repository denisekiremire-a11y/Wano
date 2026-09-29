"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { AdminLevel } from "@/lib/admin-permissions";
import { logAdminAction } from "@/lib/admin-action-log";
import { hashPassword, requireAdminLevel } from "@/lib/auth";
import { uniqueUsername } from "@/lib/username";
import type { ActionState } from "@/lib/validation";

const createAdminSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  level: z.enum(["support", "ops", "super"]),
});

/** Replaces manually setting users.role='admin' in the database — the
 * only other way an admin account has ever come into being. Super-only:
 * this is how new admin access gets granted at all. */
export async function createAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const parsed = createAdminSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    level: formData.get("level"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);
  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: "admin",
      adminLevel: parsed.data.level,
      username: await uniqueUsername(parsed.data.name),
    })
    .returning();
  await logAdminAction(session.userId, "admin.created", `Created admin account "${parsed.data.email}" (${parsed.data.level})`, {
    type: "user",
    id: created.id,
  });

  revalidatePath("/admin/accounts");
  return {};
}

/** Changing an existing admin's level. Refuses to take the last "super"
 * account below super — otherwise a mistake here could lock everyone out
 * of the pages only super can reach, including this one. */
export async function setAdminLevelAction(userId: string, level: AdminLevel): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const [target] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.role, "admin"))).limit(1);
  if (!target) return { error: "Admin account not found." };

  if (target.adminLevel === "super" && level !== "super") {
    const superAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.adminLevel, "super")));
    if (superAdmins.length <= 1) {
      return { error: "Can't demote the last super admin — promote someone else to super first." };
    }
  }

  await db.update(users).set({ adminLevel: level }).where(eq(users.id, userId));
  await logAdminAction(session.userId, "admin.level_changed", `Changed "${target.email}"'s level from "${target.adminLevel}" to "${level}"`, {
    type: "user",
    id: userId,
  });
  revalidatePath("/admin/accounts");
  return {};
}
