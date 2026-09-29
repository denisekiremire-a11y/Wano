import {
  getCommentForModeration,
  getModerationLog,
  getOpenReports,
  getPendingReviewPosts,
  getPostForModeration,
  getUserForModeration,
} from "@/lib/data/moderation";
import { requireAdminPage } from "@/lib/auth";
import { ModerationQueueRow } from "./moderation-queue-row";
import { PendingPostRow } from "./pending-post-row";

export default async function AdminModerationPage() {
  await requireAdminPage("/admin/moderation");
  const [reportRows, pendingPosts, log] = await Promise.all([
    getOpenReports(),
    getPendingReviewPosts(),
    getModerationLog(30),
  ]);

  const reportsWithContext = await Promise.all(
    reportRows.map(async ({ report, reporter }) => {
      let preview = "(content unavailable)";
      if (report.targetType === "post") {
        const row = await getPostForModeration(report.targetId);
        preview = row ? `${row.authorName}: "${row.post.content.slice(0, 140)}"` : preview;
      } else if (report.targetType === "comment") {
        const row = await getCommentForModeration(report.targetId);
        preview = row ? `${row.author.displayName}: "${row.comment.content.slice(0, 140)}"` : preview;
      } else if (report.targetType === "user") {
        const row = await getUserForModeration(report.targetId);
        preview = row ? `Profile: ${row.traveller.displayName} (@${row.user.username})` : preview;
      } else {
        preview = "Review (see admin data for details)";
      }
      return { report, reporter, preview };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink md:text-3xl">Moderation</h1>
        <p className="mt-1 text-sm text-ink/60">Reports and new-account posts waiting for review.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">
          New-account posts <span className="font-mono-data text-ink/40">({pendingPosts.length})</span>
        </h2>
        {pendingPosts.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing pending.</p>
        ) : (
          pendingPosts.map(({ post, author, authorUser }) => (
            <PendingPostRow
              key={post.id}
              postId={post.id}
              authorName={author.displayName}
              authorUsername={authorUser.username}
              content={post.content}
              createdAt={post.createdAt}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">
          Open reports <span className="font-mono-data text-ink/40">({reportsWithContext.length})</span>
        </h2>
        {reportsWithContext.length === 0 ? (
          <p className="text-sm text-ink/50">No open reports.</p>
        ) : (
          reportsWithContext.map(({ report, reporter, preview }) => (
            <ModerationQueueRow
              key={report.id}
              reportId={report.id}
              targetType={report.targetType}
              reason={report.reason}
              note={report.note}
              preview={preview}
              reporterName={reporter.displayName}
              createdAt={report.createdAt}
            />
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif-editorial text-lg text-ink">Recent actions</h2>
        {log.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing actioned yet.</p>
        ) : (
          <div className="border-t border-ink/10 text-xs text-ink/70">
            {log.map(({ action, performedBy }) => (
              <p key={action.id} className="border-b border-ink/10 py-2">
                {action.performedByUserId === performedBy.id ? performedBy.name : "Admin"} {action.action}d a{" "}
                {action.targetType}
                {action.reason ? ` — ${action.reason}` : ""} ·{" "}
                <span className="font-mono-data">
                  {new Date(action.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
