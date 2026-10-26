import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, vendorProfiles } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { getDropsForAdmin } from "@/lib/data/drops";
import { formatKampalaTime } from "@/lib/kampala-time";
import { CancelDropButton } from "./cancel-drop-button";
import { CreateDropForm } from "./create-drop-form";

const PHASE_LABEL = {
  announced_soon: "Announced 5 pm the day before",
  claimable: "Open to claim",
  live: "Live now",
  over: "Finished",
} as const;

export default async function AdminDropsPage() {
  await requireAdminPage("/admin/drops");
  const [drops, venues] = await Promise.all([
    getDropsForAdmin(),
    db
      .select({ id: listings.id, title: listings.title, vendor: vendorProfiles.businessName })
      .from(listings)
      .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
      .where(and(eq(vendorProfiles.accreditationStatus, "trusted"), eq(listings.active, true)))
      .orderBy(asc(vendorProfiles.businessName), asc(listings.title)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Daily Drops</h1>
        <p className="mt-1 text-sm text-ink/60">
          One vendor-funded perk a day. It is announced at 5 pm the day before for the first people to claim, and
          used at the venue during its window on the day. Using it earns 50 XP. One Drop per date.
        </p>
      </div>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Schedule a Drop</h2>
        <CreateDropForm venues={venues.map((v) => ({ id: v.id, label: v.title === v.vendor ? v.vendor : `${v.vendor} · ${v.title}` }))} />
      </section>

      <div className="border-t border-ink/10">
        {drops.map((d) => (
          <div key={d.dropId} className="flex items-center justify-between gap-4 border-b border-ink/10 py-4">
            <div>
              <p className="text-ink">
                <span className="font-mono-data mr-2 text-xs text-ink/50">{d.dropDate}</span>
                {d.title}
              </p>
              <p className="font-mono-data mt-0.5 text-xs text-ink/50">
                {d.vendorName} · {formatKampalaTime(d.redeemFrom)}–{formatKampalaTime(d.redeemUntil)} · {d.claimed}/
                {d.cap} claimed · {d.redeemed} used · {PHASE_LABEL[d.phase]}
              </p>
            </div>
            {d.phase !== "over" && <CancelDropButton dropId={d.dropId} />}
          </div>
        ))}
        {drops.length === 0 && <p className="py-6 text-sm text-ink/60">No Drops scheduled yet.</p>}
      </div>
    </div>
  );
}
