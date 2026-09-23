import Link from "next/link";
import { FollowButton } from "@/components/follow-button";

type Person = {
  traveller: { id: string; displayName: string };
  user: { username: string | null; avatarUrl: string | null };
  following: boolean;
};

/** Mobile-only compact rail — on desktop this same content already lives
 * in the sidebar. On mobile the sidebar only appears after the entire
 * feed (single-column stacking), which buries people-discovery below a
 * long scroll; this surfaces a quick version of it near the top instead. */
export function PeopleToFollowRail({ people }: { people: Person[] }) {
  if (people.length === 0) return null;

  return (
    <div className="md:hidden">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-forest-800/50">People to follow</h2>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {people.map(({ traveller, user, following }) => (
          <div key={traveller.id} className="flex w-20 flex-none flex-col items-center gap-1 text-center">
            <Link href={user.username ? `/profile/${user.username}` : "#"}>
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-lg font-semibold text-forest-700">
                  {traveller.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            <p className="w-full truncate text-[11px] font-medium text-forest-800/80">{traveller.displayName}</p>
            <FollowButton targetTravellerId={traveller.id} initialFollowing={following} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
