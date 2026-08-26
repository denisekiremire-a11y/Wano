import { requireRole } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole("traveller");
  return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">{children}</div>;
}
