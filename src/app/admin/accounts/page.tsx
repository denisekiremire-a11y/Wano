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
        <h1 className="font-serif-editorial text-3xl text-ink">Admin accounts</h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Create admin accounts and set their level — support, ops, or super. See src/lib/admin-permissions.ts
          for exactly what each level can reach.
        </p>
      </div>

      <CreateAdminForm />

      <div className="border-t border-ink/10">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 py-4"
          >
            <div>
              <p className="font-medium text-ink">
                {admin.name}
                {admin.id === session.userId && <span className="eyebrow ml-2 text-ink/40">(you)</span>}
              </p>
              <p className="text-sm text-ink/60">{admin.email}</p>
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
