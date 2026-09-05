"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FollowButton } from "@/components/follow-button";
import { searchTravellersAction } from "@/lib/actions/social-actions";

type Result = Awaited<ReturnType<typeof searchTravellersAction>>[number];

export function UserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const handle = setTimeout(() => {
      setLoading(true);
      searchTravellersAction(query).then((r) => {
        setResults(r);
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-forest-800/60">
        Find people
      </h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or @username"
        className="mt-2 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
      />

      {query.trim().length >= 2 && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-xs text-forest-800/50">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-forest-800/50">No one found.</p>
          ) : (
            results.map(({ traveller, user, following }) => (
              <div key={traveller.id} className="flex items-center justify-between gap-2">
                <Link href={user.username ? `/profile/${user.username}` : "#"} className="min-w-0">
                  <p className="truncate text-sm font-medium text-forest-900 hover:underline">
                    {traveller.displayName}
                  </p>
                  {user.username && <p className="text-xs text-forest-800/50">@{user.username}</p>}
                </Link>
                <FollowButton targetTravellerId={traveller.id} initialFollowing={following} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
