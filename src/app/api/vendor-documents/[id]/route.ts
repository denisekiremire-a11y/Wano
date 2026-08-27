import { NextResponse } from "next/server";
import { db } from "@/db";
import { documentAccessLogs } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getVendorDocumentFile, getVendorProfileByUserId } from "@/lib/data/vendor";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getVendorDocumentFile(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "admin") {
    const vendorProfile = await getVendorProfileByUserId(session.userId);
    if (!vendorProfile || vendorProfile.id !== doc.vendorProfileId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Audit trail — every successful fetch of the actual bytes is logged,
  // regardless of role, so accreditation reviews stay accountable.
  await db.insert(documentAccessLogs).values({ documentId: id, accessedByUserId: session.userId });

  if (doc.fileData) {
    return new NextResponse(new Uint8Array(doc.fileData), {
      headers: {
        "Content-Type": doc.fileMimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${(doc.fileName ?? "document").replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (doc.documentUrl) {
    return NextResponse.redirect(doc.documentUrl);
  }

  return NextResponse.json({ error: "This document has no file or link." }, { status: 404 });
}
