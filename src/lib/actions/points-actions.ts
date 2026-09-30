"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminLevel } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-action-log";
import { addManualPointsAdjustment } from "@/lib/data/points";
import type { ActionState } from "@/lib/validation";

const adjustmentSchema = z.object({
  travellerId: z.string().uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Enter a non-zero amount."),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
});

/** Manual points correction — always a new ledger row, never an edit of a
 * past one (append-only, per business rule). Positive delta grants points,
 * negative corrects an over-award. */
export async function addPointsAdjustmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const parsed = adjustmentSchema.safeParse({
    travellerId: formData.get("travellerId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the adjustment fields." };
  }

  await addManualPointsAdjustment(session.userId, parsed.data.travellerId, parsed.data.delta, parsed.data.reason);

  await logAdminAction(
    session.userId,
    "points.manual_adjustment",
    `${parsed.data.delta > 0 ? "+" : ""}${parsed.data.delta} points: ${parsed.data.reason}`,
    { type: "traveller_profile", id: parsed.data.travellerId },
  );

  revalidatePath("/admin/rewards/points");
  revalidatePath(`/admin/travellers/${parsed.data.travellerId}`);
  return {};
}
