"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { vendorDocuments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import type { ActionState } from "@/lib/validation";

const submitDocSchema = z.object({
  docType: z.enum(["business_registration", "owner_id", "tax_certificate", "other"]),
  documentUrl: z.string().url(),
});

export async function submitVendorDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const parsed = submitDocSchema.safeParse({
    docType: formData.get("docType"),
    documentUrl: formData.get("documentUrl"),
  });
  if (!parsed.success) {
    return { error: "Provide a valid document link." };
  }

  await db.insert(vendorDocuments).values({
    vendorProfileId: vendorProfile.id,
    docType: parsed.data.docType,
    documentUrl: parsed.data.documentUrl,
  });

  revalidatePath("/vendor/dashboard/documents");
  revalidatePath("/admin/vendors");

  return {};
}
