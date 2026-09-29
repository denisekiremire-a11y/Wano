import { NextResponse } from "next/server";
import { db } from "@/db";
import { documentAccessLogs } from "@/db/schema";
import { getSession } from "@/lib/session";
import { withRlsContext } from "@/lib/db-context";
import { getVendorDocumentFile, getVendorProfileByUserId } from "@/lib/data/vendor";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // vendor_documents has no public-read RLS policy, so the lookup itself
  // must already carry the requester's identity — unlike the old
  // fetch-then-check order, we need to know who's asking before querying.
  let vendorProfileId: string | null = null;
  if (session.role !== "admin") {
    const vendorProfile = await getVendorProfileByUserId(session.userId);
    if (!vendorProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    vendorProfileId = vendorProfile.id;
  }

  const doc = await withRlsContext(
    { userId: session.userId, role: session.role === "admin" ? "admin" : "vendor", vendorProfileId },
    (tx) => getVendorDocumentFile(id, tx),
  );
  // A vendor requesting someone else's document resolves to the exact
  // same "not found" as a genuinely missing one — RLS filters it out
  // before the app ever sees it exists, same end result as the old
  // explicit ownership check.
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
