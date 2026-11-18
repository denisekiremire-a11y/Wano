import { AdminLiveRefresh } from "@/components/admin/AdminLiveRefresh";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";
import { supabasePublicKey, supabaseUrl } from "@/lib/env";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin(); // server-side gate (the proxy is only a first layer)
  return (
    <>
      <AdminNav email={user.email ?? ""} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-2 flex justify-end">
          <AdminLiveRefresh url={supabaseUrl()!} anonKey={supabasePublicKey()!} />
        </div>
        {children}
      </div>
    </>
  );
}
