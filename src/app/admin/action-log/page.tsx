import { getAdminActionLog } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/auth";

// A short, readable label for the target a log entry points at — the raw
// targetType slug ("vendor_profile") isn't what a human wants to read.
const TARGET_LABELS: Record<string, string> = {
  vendor_profile: "vendor",
  vendor_document: "KYC document",
  listing: "listing",
  listing_image: "listing photo",
  booking: "booking",
  traveller_profile: "traveller",
  vendor_submission: "submission",
  reward: "reward",
  slot: "slot",
  funzone_claim: "Fun Zone claim",
  event: "event",
  club: "club",
  journal_post: "journal post",
  journey: "journey",
  supply_lead: "supply lead",
  promo_code: "promo code",
  user: "account",
  post: "post",
  comment: "comment",
};

export default async function AdminActionLogPage() {
  await requireAdminPage("/admin/action-log");
  const entries = await getAdminActionLog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Action log</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Every admin-gated action across the app, newest first — who did what, and when. Super-only.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-forest-900/10 bg-white p-5">
        {entries.length === 0 ? (
          <p className="text-sm text-forest-800/60">Nothing logged yet.</p>
        ) : (
          entries.map(({ entry, actor }) => (
            <div key={entry.id} className="border-b border-forest-900/5 pb-2 text-sm last:border-0">
              <p className="text-forest-900">
                <span className="font-medium">{actor.name}</span> — {entry.summary}
              </p>
              <p className="text-xs text-forest-800/40">
                {entry.action}
                {entry.targetType && ` · ${TARGET_LABELS[entry.targetType] ?? entry.targetType}`} ·{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
