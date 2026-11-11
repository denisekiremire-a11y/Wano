import "server-only";
import { getSession } from "@/lib/session";
import { getStaffSession } from "@/lib/staff-token";
import { getVendorProfileById, getVendorProfileByUserId } from "@/lib/data/vendor";

/** Resolves which vendor is acting, from either a normal vendor login or
 * an unlocked staff-link session (src/app/staff/[token]) — used only by
 * the narrow set of actions a staff member should ever reach (ticket/
 * booking check-in, voucher redemption), never the full vendor dashboard,
 * which stays requireRole("vendor")-only. userId is always the vendor
 * account's own id either way (vendorProfiles.userId) — there's no
 * separate per-staff identity, same as the PIN itself not tracking which
 * staff member used it. */
export async function requireVendorAccess(): Promise<
  | { vendorProfile: NonNullable<Awaited<ReturnType<typeof getVendorProfileByUserId>>>; userId: string; via: "login" | "staff" }
  | null
> {
  const session = await getSession();
  if (session?.role === "vendor") {
    const vendorProfile = await getVendorProfileByUserId(session.userId);
    if (vendorProfile) return { vendorProfile, userId: session.userId, via: "login" };
  }

  const staff = await getStaffSession();
  if (staff) {
    const vendorProfile = await getVendorProfileById(staff.vendorProfileId);
    // The live row's staffAccessToken must still match what this cookie
    // was issued against — rotating the link (lost phone, staff turnover)
    // invalidates every outstanding cookie the instant this check runs,
    // not just future PIN unlocks.
    if (vendorProfile && vendorProfile.staffAccessToken && vendorProfile.staffAccessToken === staff.staffAccessToken) {
      return { vendorProfile, userId: vendorProfile.userId, via: "staff" };
    }
  }

  return null;
}
