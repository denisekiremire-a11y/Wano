import type { Metadata } from "next";
import { GeneralSettingsForm, RateForm } from "@/components/admin/SettingsForms";
import { requireAdmin } from "@/lib/admin";
import { loadAdminCore } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ settings }, history] = await Promise.all([
    loadAdminCore(supabase),
    supabase.from("exchange_rate_history").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-4xl">Settings</h1>
      <section className="card space-y-4 p-5" aria-labelledby="cur">
        <div>
          <h2 id="cur" className="text-2xl">
            Currency
          </h2>
          <p className="text-sm text-muted">
            AED is the reference currency. UGX amounts are calculated from this rate and labelled approximate.{" "}
            {settings.aed_to_ugx_rate
              ? `Current rate: 1 AED = ${settings.aed_to_ugx_rate} UGX, last updated ${formatDateTime(settings.rate_updated_at)}.`
              : "No rate is set yet — guests see AED prices only."}
          </p>
        </div>
        <RateForm settings={settings} />
        {(history.data?.length ?? 0) > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Rate history</summary>
            <ul className="mt-2 space-y-1">
              {history.data!.map((h) => (
                <li key={h.id}>
                  {formatDateTime(h.created_at)} — 1 AED = {Number(h.rate)} UGX {h.source ? `(${h.source})` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <section className="card space-y-4 p-5" aria-labelledby="gen">
        <h2 id="gen" className="text-2xl">
          Registry
        </h2>
        <GeneralSettingsForm settings={settings} />
      </section>
    </div>
  );
}
