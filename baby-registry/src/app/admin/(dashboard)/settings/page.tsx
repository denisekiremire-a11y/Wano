import type { Metadata } from "next";
import { GeneralSettingsForm } from "@/components/admin/SettingsForms";
import { requireAdmin } from "@/lib/admin";
import { loadAdminCore } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { settings } = await loadAdminCore(supabase);
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-4xl">Settings</h1>
      <section className="card space-y-4 p-5" aria-labelledby="gen">
        <h2 id="gen" className="text-2xl">
          Registry
        </h2>
        <GeneralSettingsForm settings={settings} />
      </section>
    </div>
  );
}
