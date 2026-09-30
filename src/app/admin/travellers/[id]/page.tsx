import Link from "next/link";
import { notFound } from "next/navigation";
import { getTravellerWithUserById } from "@/lib/data/admin";
import { getMyWallet } from "@/lib/data/rewards";
import { getPostsByTraveller } from "@/lib/data/social";
import { getPassportProgress, getReferralStats, getTravellerBookings } from "@/lib/data/traveller";
import { requireAdminPage } from "@/lib/auth";
import { formatRewardDiscount } from "@/lib/reward-format";

type WalletEntry = Awaited<ReturnType<typeof getMyWallet>>["active"][number];

function WalletRow({ entry, statusLabel }: { entry: WalletEntry; statusLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border border-ink/10 bg-white p-3">
      <div>
        <p className="font-medium text-ink">{entry.reward.title}</p>
        <p className="font-mono-data text-xs text-ink/50">
          {formatRewardDiscount(entry.reward.discountType, entry.reward.discountValue)}
          {entry.target ? ` · ${entry.target.title}` : ""}
        </p>
      </div>
      <span className="eyebrow text-ink/40">{statusLabel}</span>
    </div>
  );
}

export default async function AdminTravellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("/admin/travellers");
  const { id } = await params;
  const row = await getTravellerWithUserById(id);
  if (!row) notFound();
  const { traveller, user } = row;

  const [passport, bookings, wallet, posts, referral] = await Promise.all([
    getPassportProgress(traveller.id),
    getTravellerBookings(traveller.id),
    getMyWallet(traveller.id),
    getPostsByTraveller(traveller.id),
    getReferralStats(traveller.id),
  ]);

  const walletEntries = [
    ...wallet.active.map((entry) => ({ entry, statusLabel: "Active" })),
    ...wallet.used.map((entry) => ({ entry, statusLabel: "Used" })),
    ...wallet.expired.map((entry) => ({ entry, statusLabel: "Expired" })),
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/travellers" className="eyebrow text-ink/40 hover:text-ink">
          ← Members
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif-editorial text-2xl text-ink">{user.name}</h1>
          {user.username && (
            <Link href={`/profile/${user.username}`} className="text-sm font-medium text-ember hover:underline">
              View public profile →
            </Link>
          )}
        </div>
        <p className="text-sm text-ink/60">{user.email}</p>
        <p className="font-mono-data mt-1 text-xs text-ink/40">
          Joined {traveller.createdAt.toLocaleDateString()}
          {traveller.city ? ` · ${traveller.city}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden border border-ink/10 bg-ink/10 sm:grid-cols-4">
        <div className="bg-white p-4">
          <p className="eyebrow text-ink/40">Passport</p>
          <p className="font-mono-data mt-1 text-2xl text-ink">
            {passport.stampCount}/{passport.totalJourneys}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="eyebrow text-ink/40">Bookings</p>
          <p className="font-mono-data mt-1 text-2xl text-ink">{bookings.length}</p>
        </div>
        <div className="bg-white p-4">
          <p className="eyebrow text-ink/40">Active rewards</p>
          <p className="font-mono-data mt-1 text-2xl text-ink">{wallet.active.length}</p>
        </div>
        <div className="bg-white p-4">
          <p className="eyebrow text-ink/40">Referrals</p>
          <p className="font-mono-data mt-1 text-2xl text-ink">{referral.referredCount}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-ink/60">No bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {bookings.map(({ booking, listing, event, journey }) => (
              <div key={booking.id} className="border border-ink/10 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">{listing?.title ?? event?.title ?? "Untitled"}</p>
                  <span className="eyebrow capitalize text-ink/50">{booking.status}</span>
                </div>
                <p className="font-mono-data text-xs text-ink/50">
                  {journey?.name ?? "General booking"} · ref {booking.bookingRef} ·{" "}
                  {booking.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">Rewards wallet</h2>
        {walletEntries.length === 0 ? (
          <p className="text-sm text-ink/60">No rewards claimed.</p>
        ) : (
          <div className="space-y-2">
            {walletEntries.map(({ entry, statusLabel }) => (
              <WalletRow key={entry.userReward.id} entry={entry} statusLabel={statusLabel} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">Social posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-ink/60">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {posts.map(({ post }) => (
              <div key={post.id} className="border border-ink/10 bg-white p-3">
                <p className="text-sm text-ink">{post.content}</p>
                <p className="font-mono-data mt-1 text-xs text-ink/40">
                  {post.createdAt.toLocaleDateString()} · {post.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
