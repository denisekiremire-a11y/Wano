import { getVendorProfileByStaffAccessToken, getVendorTicketCheckInsToday } from "@/lib/data/vendor";
import { getVendorRedemptionsToday } from "@/lib/data/rewards";
import { requireVendorAccess } from "@/lib/vendor-access";
import { LookupTicketByRef } from "@/app/vendor/dashboard/redeem/tickets/lookup-ticket-by-ref";
import { RedeemByCode } from "@/app/vendor/dashboard/redeem/redeem-by-code";
import { UnlockForm } from "./unlock-form";
import { LockButton } from "./lock-button";

// Deliberately outside the vendor-only /vendor/dashboard layout — the
// whole point of this page is that staff reach it WITHOUT a vendor login,
// via a link the vendor shares (see the "Staff link" section on
// /vendor/dashboard/redeem). Everything it can do is also reachable from
// inside the dashboard for a logged-in vendor; this just exposes the same
// narrow surface (check in a ticket/booking, redeem a voucher) without
// needing the vendor's email/password.
export default async function StaffPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const vendorProfile = await getVendorProfileByStaffAccessToken(token);

  if (!vendorProfile) {
    return (
      <div className="font-editorial-body bg-paper min-h-screen">
        <div className="mx-auto max-w-sm px-4 py-12 text-center">
          <h1 className="font-serif-editorial text-xl text-ink">Link not valid</h1>
          <p className="mt-2 text-sm text-ink/60">
            This staff link has been rotated or doesn&apos;t exist any more. Ask the venue for a current one.
          </p>
        </div>
      </div>
    );
  }

  // A vendor who's logged in normally (e.g. testing their own link) is
  // let straight through too — that's a stronger proof of identity than
  // the PIN, not a weaker one.
  const access = await requireVendorAccess();
  const unlocked = access != null && access.vendorProfile.id === vendorProfile.id;

  if (!unlocked) {
    return (
      <div className="font-editorial-body bg-paper min-h-screen">
        <UnlockForm staffAccessToken={token} businessName={vendorProfile.businessName} />
      </div>
    );
  }

  const [checkedInToday, redemptionsToday] = await Promise.all([
    getVendorTicketCheckInsToday(vendorProfile.id),
    getVendorRedemptionsToday(vendorProfile.id),
  ]);

  return (
    <div className="font-editorial-body bg-paper min-h-screen">
      <div className="mx-auto max-w-md space-y-6 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-ink/40">{vendorProfile.businessName}</p>
            <h1 className="font-serif-editorial mt-1 text-2xl text-ink">Staff check-in</h1>
          </div>
          <LockButton />
        </div>

        <p className="text-sm text-ink/60">
          A traveller&apos;s camera opens their ticket or voucher QR straight to the right page here — or type
          their code in below if a scan fails.
        </p>

        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Check in a ticket or booking</h2>
          <LookupTicketByRef />
        </section>

        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Redeem a reward voucher</h2>
          <RedeemByCode />
        </section>

        <section className="space-y-3">
          <h2 className="font-serif-editorial text-lg text-ink">Today</h2>
          {checkedInToday.length === 0 && redemptionsToday.length === 0 ? (
            <p className="text-sm text-ink/60">Nothing checked in or redeemed yet today.</p>
          ) : (
            <div className="border-t border-ink/10">
              {checkedInToday.map((row) => (
                <div key={row.booking.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{row.traveller.displayName}</p>
                    <p className="text-xs text-ink/50">{row.listing?.title ?? row.event?.title}</p>
                  </div>
                  <p className="font-mono-data text-xs text-ink/50">
                    {row.booking.checkedInAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              {redemptionsToday.map(({ userReward, reward }) => (
                <div key={userReward.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                  <p className="text-sm font-medium text-ink">{reward.title}</p>
                  <p className="font-mono-data text-xs text-ink/50">
                    {userReward.redeemedAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
