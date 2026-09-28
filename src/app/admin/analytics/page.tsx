import { getEventCounts, getRecentDocumentAccess, getRecentEvents } from "@/lib/data/admin-analytics";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminAnalyticsPage() {
  await requireAdminPage("/admin/analytics");
  const [counts, recent, docAccess] = await Promise.all([
    getEventCounts(),
    getRecentEvents(50),
    getRecentDocumentAccess(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink/60">
          Raw product-event log — for debugging the funnel, not a full dashboard.
        </p>
      </div>

      <section className="border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Totals by event</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {counts.length === 0 ? (
            <p className="text-sm text-ink/60">No events logged yet.</p>
          ) : (
            counts.map((c) => (
              <div key={c.eventName} className="border border-ink/10 p-3">
                <p className="eyebrow text-ink/40">{c.eventName}</p>
                <p className="font-mono-data mt-1 text-xl text-ink">{c.total}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Recent events</h2>
        <div className="mt-3 border-t border-ink/10 text-sm">
          {recent.map(({ event, user }) => (
            <div key={event.id} className="flex items-center justify-between border-b border-ink/10 py-2">
              <span className="font-medium text-ink">{event.eventName}</span>
              <span className="font-mono-data text-xs text-ink/50">
                {user?.email ?? "guest"} · {new Date(event.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">KYC document access log</h2>
        <p className="mt-1 text-xs text-ink/60">
          Every fetch of a sensitive vendor document&apos;s actual bytes, audited.
        </p>
        <div className="mt-3 border-t border-ink/10 text-sm">
          {docAccess.length === 0 ? (
            <p className="py-2 text-ink/60">No document access yet.</p>
          ) : (
            docAccess.map(({ log, doc, accessedBy }) => (
              <div key={log.id} className="flex items-center justify-between border-b border-ink/10 py-2">
                <span className="text-ink">{doc.docType}</span>
                <span className="font-mono-data text-xs text-ink/50">
                  {accessedBy.email} · {new Date(log.accessedAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
