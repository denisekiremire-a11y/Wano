import { getPendingSubmissions } from "@/lib/data/submissions";
import { requireAdminPage } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { SubmissionRow } from "./submission-row";

export default async function AdminSubmissionsPage() {
  const session = await requireAdminPage("/admin/submissions");
  const rows = await withRlsContext({ userId: session.userId, role: "admin" }, (tx) => getPendingSubmissions(tx));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink md:text-3xl">Vendor submissions</h1>
        <p className="mt-1 text-sm text-ink/60">
          New listings, listing edits, and rewards vendors have submitted for review.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
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
