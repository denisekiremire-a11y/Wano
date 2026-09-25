import { getPendingSubmissions } from "@/lib/data/submissions";
import { requireAdminPage } from "@/lib/auth";
import { SubmissionRow } from "./submission-row";

export default async function AdminSubmissionsPage() {
  await requireAdminPage("/admin/submissions");
  const rows = await getPendingSubmissions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Vendor submissions</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          New listings, listing edits, and rewards vendors have submitted for review.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          Nothing waiting on review.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ submission, vendor, currentTitle }) => (
            <SubmissionRow
              key={submission.id}
              submissionId={submission.id}
              entityType={submission.entityType}
              isEdit={submission.entityId !== null}
              businessName={vendor.businessName}
              currentTitle={currentTitle}
              payload={submission.payload}
              createdAt={submission.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
