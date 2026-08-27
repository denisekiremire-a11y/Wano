import { getEventCounts, getRecentDocumentAccess, getRecentEvents } from "@/lib/data/admin-analytics";

export default async function AdminAnalyticsPage() {
  const [counts, recent, docAccess] = await Promise.all([
    getEventCounts(),
    getRecentEvents(50),
    getRecentDocumentAccess(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Analytics</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Raw product-event log — for debugging the funnel, not a full dashboard.
        </p>
      </div>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Totals by event</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {counts.length === 0 ? (
            <p className="text-sm text-forest-800/60">No events logged yet.</p>
          ) : (
            counts.map((c) => (
              <div key={c.eventName} className="rounded-xl bg-forest-50 p-3">
                <p className="text-xs text-forest-800/60">{c.eventName}</p>
                <p className="font-display text-xl font-semibold text-forest-900">{c.total}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Recent events</h2>
        <div className="mt-3 space-y-1 text-sm">
          {recent.map(({ event, user }) => (
            <div key={event.id} className="flex items-center justify-between border-b border-forest-900/5 py-1.5">
              <span className="font-medium text-forest-900">{event.eventName}</span>
              <span className="text-xs text-forest-800/50">
                {user?.email ?? "guest"} · {new Date(event.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">KYC document access log</h2>
        <p className="mt-1 text-xs text-forest-800/60">
          Every fetch of a sensitive vendor document's actual bytes, audited.
        </p>
        <div className="mt-3 space-y-1 text-sm">
          {docAccess.length === 0 ? (
            <p className="text-forest-800/60">No document access yet.</p>
          ) : (
            docAccess.map(({ log, doc, accessedBy }) => (
              <div key={log.id} className="flex items-center justify-between border-b border-forest-900/5 py-1.5">
                <span className="text-forest-900">{doc.docType}</span>
                <span className="text-xs text-forest-800/50">
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
