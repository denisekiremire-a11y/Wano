import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ADMIN_MIN_LEVEL, levelMeets, type AdminLevel, type AdminPermissionKey } from "@/lib/admin-permissions";
import { getSession, type SessionPayload } from "./session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(
  role: SessionPayload["role"] | SessionPayload["role"][],
): Promise<SessionPayload> {
  const session = await requireSession();
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(session.role)) {
    redirect("/");
  }
  return session;
}

/** Admin sub-role gate, layered under requireRole("admin"). Reads
 * adminLevel fresh from the database on every call rather than trusting
 * the session cookie's claim — a level change (or losing admin entirely)
 * takes effect on the very next request, not after the JWT happens to
 * expire. This is the actual enforcement; the level carried in the
 * session cookie (see session.ts) only drives which nav items are shown
 * and can lag behind until the admin's next login. */
export async function requireAdminLevel(minLevel: AdminLevel): Promise<SessionPayload & { adminLevel: AdminLevel }> {
  const session = await requireRole("admin");
  const [row] = await db.select({ adminLevel: users.adminLevel }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (!levelMeets(row?.adminLevel, minLevel)) {
    redirect("/admin");
  }
  return { ...session, adminLevel: row!.adminLevel! };
}

/** Same as requireAdminLevel, but looks the required level up from the
 * shared ADMIN_MIN_LEVEL map by page/action key instead of hardcoding it
 * at each call site — the map is the one place that decides who can see
 * or do what (see src/lib/admin-permissions.ts). */
export async function requireAdminPage(key: AdminPermissionKey) {
  return requireAdminLevel(ADMIN_MIN_LEVEL[key]);
}
