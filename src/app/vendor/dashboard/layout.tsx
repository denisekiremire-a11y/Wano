import { requireRole } from "@/lib/auth";

export default async function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("vendor");
  return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">{children}</div>;
}
