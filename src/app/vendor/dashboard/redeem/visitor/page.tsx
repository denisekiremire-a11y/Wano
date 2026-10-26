import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { VisitorCodeForm } from "./visitor-code-form";

export default async function VendorVisitorScanPage() {
  await requireRole("vendor");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Scan a visitor</h1>
        <p className="mt-1 text-sm text-ink/60">
          Scanning a visitor&apos;s Wano QR logs their visit and lists anything they can claim at
          your venue right now.
        </p>
        <Link href="/vendor/dashboard/redeem" className="mt-2 inline-block text-sm text-ember hover:underline">
          ← Redeeming one specific voucher instead?
        </Link>
      </div>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <p className="text-sm text-ink/60">
          Point your camera at the visitor&apos;s Wano QR from their Passport. If the scan fails, type
          the 6-digit code shown under their QR instead. Either way the visit counts towards their
          weekly challenges.
        </p>
        <VisitorCodeForm />
      </section>
    </div>
  );
}
