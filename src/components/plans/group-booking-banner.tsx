import { eq } from "drizzle-orm";
import { db } from "@/db";
import { planMembers, plans } from "@/db/schema";
import { peekGroupPlanId } from "@/lib/group-plan-cookie";

/** Shown on a place's page after "Book for the group": reminds the maker to
 * book for everyone going. Friends are added to the booking automatically. */
export async function GroupBookingBanner() {
  const planId = await peekGroupPlanId();
  if (!planId) return null;
  const [plan] = await db.select({ title: plans.title }).from(plans).where(eq(plans.id, planId)).limit(1);
  if (!plan) return null;
  const going = (await db.select({ status: planMembers.status }).from(planMembers).where(eq(planMembers.planId, planId))).filter(
    (m) => m.status === "going",
  ).length;
  return (
    <div className="mb-6 border border-ember/40 bg-ember/5 p-4 text-sm text-ink">
      <p className="font-semibold">Booking for “{plan.title}”</p>
      <p className="mt-1 text-ink/70">
        Set the party size to {going}. Everyone going is added to the booking, gets the stamp and XP, and pays at the
        venue.
      </p>
    </div>
  );
}
