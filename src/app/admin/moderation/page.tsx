import {
  getCommentForModeration,
  getModerationLog,
  getOpenReports,
  getPendingReviewPosts,
  getPostForModeration,
  getUserForModeration,
} from "@/lib/data/moderation";
import { ModerationQueueRow } from "./moderation-queue-row";
import { PendingPostRow } from "./pending-post-row";

export default async function AdminModerationPage() {
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
        preview = row ? `${row.author.displayName}: "${row.post.content.slice(0, 140)}"` : preview;
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
        <h1 className="font-display text-2xl font-semibold text-forest-900">Moderation</h1>
        <p className="mt-1 text-sm text-forest-800/60">Reports and new-account posts waiting for review.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          New-account posts ({pendingPosts.length})
        </h2>
        {pendingPosts.length === 0 ? (
          <p className="text-sm text-forest-800/60">Nothing pending.</p>
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
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Open reports ({reportsWithContext.length})
        </h2>
        {reportsWithContext.length === 0 ? (
          <p className="text-sm text-forest-800/60">No open reports.</p>
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
        <h2 className="font-display text-lg font-semibold text-forest-900">Recent actions</h2>
        {log.length === 0 ? (
          <p className="text-sm text-forest-800/60">Nothing actioned yet.</p>
        ) : (
          <div className="space-y-1 text-xs text-forest-800/70">
            {log.map(({ action, performedBy }) => (
              <p key={action.id}>
                {action.performedByUserId === performedBy.id ? performedBy.name : "Admin"} {action.action}d a{" "}
                {action.targetType}
                {action.reason ? ` — ${action.reason}` : ""} ·{" "}
                {new Date(action.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
