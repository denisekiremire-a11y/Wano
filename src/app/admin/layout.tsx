import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div className="font-editorial-body bg-paper min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">{children}</div>
    </div>
  );
}
