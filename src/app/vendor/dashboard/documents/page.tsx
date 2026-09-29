import { getVendorDocuments, getVendorProfileByUserId } from "@/lib/data/vendor";
import { withRlsContext } from "@/lib/db-context";
import { getSession } from "@/lib/session";
import { DocumentForm } from "./document-form";

const docTypeLabels: Record<string, string> = {
  business_registration: "Business registration certificate",
  owner_id: "Owner/manager ID",
  tax_certificate: "Tax certificate",
  other: "Other",
};

const statusTextStyles: Record<string, string> = {
  pending: "text-ember",
  approved: "text-ink",
  rejected: "text-red-600",
};

export default async function VendorDocumentsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const documents = await withRlsContext(
    { userId: session!.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) => getVendorDocuments(vendorProfile.id, tx),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink md:text-3xl">
          KYC documents
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Submit the documents Wano needs to verify your business before your listing goes live.
        </p>
      </div>

      <DocumentForm />

      <section>
        <h2 className="font-serif-editorial text-lg text-ink">Submitted documents</h2>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">No documents submitted yet.</p>
        ) : (
          <div className="mt-3 border-t border-ink/10">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 border-b border-ink/10 py-4">
                <div>
                  <p className="text-sm font-medium text-ink">{docTypeLabels[doc.docType]}</p>
                  <a
                    href={`/api/vendor-documents/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-ember hover:underline"
                  >
                    {doc.fileName ?? "View document"}
                  </a>
                  {doc.notes && <p className="mt-1 text-xs text-ink/50">Note: {doc.notes}</p>}
                </div>
                <span className={`eyebrow ${statusTextStyles[doc.status]}`}>{doc.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
