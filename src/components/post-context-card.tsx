import Link from "next/link";
import type { PostContextCard as PostContextCardData } from "@/lib/data/post-context";

/** The inline card under a post that carries its topic tag toward
 * something transactable — a listing, event, club, journey, perk, or
 * journal post. Untagged posts render without this; that's expected. */
export function PostContextCard({ context }: { context: PostContextCardData }) {
  return (
    <Link
      href={context.href}
      className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-forest-900/10 bg-forest-50/50 px-3 py-2 transition hover:bg-forest-50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-forest-900">{context.title}</p>
        <p className="truncate text-xs text-forest-800/50">{context.subtitle}</p>
      </div>
      <span className="flex-none rounded-full bg-forest-800 px-3 py-1 text-xs font-semibold text-white">
        {context.ctaLabel}
      </span>
    </Link>
  );
}

/** "in <Club Name>" — shown on a post's own card when it's addressed to a
 * club rather than the public feed. Nothing renders for a public post. */
export function AudienceChip({ clubName, clubId }: { clubName: string; clubId: string }) {
  return (
    <Link
      href={`/social/clubs/${clubId}`}
      className="inline-flex items-center rounded-full bg-nile-100 px-2 py-0.5 text-[11px] font-medium text-nile-800 hover:bg-nile-200"
    >
      in {clubName}
    </Link>
  );
}
