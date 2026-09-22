import Link from "next/link";
import { FollowButton } from "@/components/follow-button";

export function DiscoverPersonCard({
  traveller,
  user,
  following,
  canFollow,
}: {
  traveller: { id: string; displayName: string; city: string | null };
  user: { username: string | null; avatarUrl: string | null };
  following: boolean;
  canFollow: boolean;
}) {
  const profileHref = user.username ? `/profile/${user.username}` : "#";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-forest-900/10 bg-white p-3">
      <Link href={profileHref} className="flex min-w-0 items-center gap-3">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-11 w-11 flex-none rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
            {traveller.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-forest-900 hover:underline">{traveller.displayName}</p>
          <p className="truncate text-xs text-forest-800/50">
            @{user.username}
            {traveller.city ? ` · ${traveller.city}` : ""}
          </p>
        </div>
      </Link>
      {canFollow && <FollowButton targetTravellerId={traveller.id} initialFollowing={following} />}
    </div>
  );
}
