import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function VendorVisitorScanPage() {
  await requireRole("vendor");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Scan a visitor</h1>
        <p className="mt-1 text-sm text-ink/60">
          A traveller&apos;s camera opens their personal Wano QR straight to this page, which lists
          anything they can claim at your venue right now.
        </p>
        <Link href="/vendor/dashboard/redeem" className="mt-2 inline-block text-sm text-ember hover:underline">
          ← Redeeming one specific voucher instead?
        </Link>
      </div>

      <section className="border border-ink/10 bg-white p-5 text-sm text-ink/60">
        Point your camera at the traveller&apos;s Wano QR from their Rewards tab — no code to type in
        here. If the scan fails, ask them to open the specific reward instead and use{" "}
        <Link href="/vendor/dashboard/redeem" className="text-ember hover:underline">
          Enter a code
        </Link>{" "}
        on the main Redeem page.
      </section>
    </div>
  );
}
