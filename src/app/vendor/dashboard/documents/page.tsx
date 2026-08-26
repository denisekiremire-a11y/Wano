import { getVendorDocuments, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { DocumentForm } from "./document-form";

const docTypeLabels: Record<string, string> = {
  business_registration: "Business registration certificate",
  owner_id: "Owner/manager ID",
  tax_certificate: "Tax certificate",
  other: "Other",
};

const statusStyles: Record<string, string> = {
  pending: "bg-marigold-100 text-marigold-800",
  approved: "bg-forest-100 text-forest-800",
  rejected: "bg-red-100 text-red-700",
};

export default async function VendorDocumentsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const documents = await getVendorDocuments(vendorProfile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">
          KYC documents
        </h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Submit the documents Wano needs to verify your business before your listing goes live.
        </p>
      </div>

      <DocumentForm />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Submitted documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-forest-800/60">No documents submitted yet.</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-2xl border border-forest-900/10 bg-white p-4"
            >
              <div>
                <p className="font-medium text-forest-900">{docTypeLabels[doc.docType]}</p>
                <a
                  href={`/api/vendor-documents/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-nile-700 hover:underline"
                >
                  {doc.fileName ?? "View document"}
                </a>
                {doc.notes && <p className="mt-1 text-xs text-forest-800/50">Note: {doc.notes}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[doc.status]}`}>
                {doc.status}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
