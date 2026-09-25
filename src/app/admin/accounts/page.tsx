import { getAllAdmins } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/auth";
import { AdminLevelSelect } from "./admin-level-select";
import { CreateAdminForm } from "./create-admin-form";

export default async function AdminAccountsPage() {
  const session = await requireAdminPage("/admin/accounts");
  const admins = await getAllAdmins();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Admin accounts</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Create admin accounts and set their level — support, ops, or super. See src/lib/admin-permissions.ts
          for exactly what each level can reach.
        </p>
      </div>

      <CreateAdminForm />

      <div className="space-y-2">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-forest-900/10 bg-white p-4"
          >
            <div>
              <p className="font-medium text-forest-900">
                {admin.name}
                {admin.id === session.userId && <span className="ml-2 text-xs text-forest-800/50">(you)</span>}
              </p>
              <p className="text-sm text-forest-800/60">{admin.email}</p>
            </div>
            <AdminLevelSelect
              userId={admin.id}
              level={admin.adminLevel ?? "support"}
              isSelf={admin.id === session.userId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
