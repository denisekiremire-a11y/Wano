"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { vendorDocuments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import type { ActionState } from "@/lib/validation";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const submitDocSchema = z.object({
  docType: z.enum(["business_registration", "owner_id", "tax_certificate", "other"]),
});

export async function submitVendorDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const parsed = submitDocSchema.safeParse({ docType: formData.get("docType") });
  if (!parsed.success) {
    return { error: "Choose a document type." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large — max 10MB." };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "Unsupported file type — upload a PDF, JPG, PNG, or WebP." };
  }

  const fileData = Buffer.from(await file.arrayBuffer());

  await db.insert(vendorDocuments).values({
    vendorProfileId: vendorProfile.id,
    docType: parsed.data.docType,
    fileName: file.name,
    fileMimeType: file.type,
    fileSize: file.size,
    fileData,
  });

  revalidatePath("/vendor/dashboard/documents");
  revalidatePath("/admin/vendors");

  return {};
}
