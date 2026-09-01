import Link from "next/link";
import { CalendarIcon, ChartIcon, StampIcon, TagIcon } from "@/components/icons";
import type { FeedEntry } from "@/lib/data/feed";

type GeneratedEntry = Extract<FeedEntry, { kind: "generated" }>;

function timeAgo(createdAt: Date, now: Date) {
  const hours = Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / (60 * 60 * 1000)));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const STYLES: Record<string, { icon: typeof StampIcon; wrap: string; iconWrap: string }> = {
  place_added: { icon: TagIcon, wrap: "border-forest-900/10 bg-white", iconWrap: "bg-forest-100 text-forest-700" },
  review_posted: { icon: StampIcon, wrap: "border-forest-900/10 bg-white", iconWrap: "bg-nile-100 text-nile-700" },
  event_upcoming: { icon: CalendarIcon, wrap: "border-forest-900/10 bg-white", iconWrap: "bg-nile-100 text-nile-700" },
  event_momentum: { icon: ChartIcon, wrap: "border-marigold-300 bg-marigold-50", iconWrap: "bg-marigold-200 text-marigold-900" },
  perk_added: { icon: TagIcon, wrap: "border-marigold-300 bg-marigold-50", iconWrap: "bg-marigold-200 text-marigold-900" },
  perk_expiring: { icon: TagIcon, wrap: "border-red-200 bg-red-50", iconWrap: "bg-red-100 text-red-700" },
  journal_published: { icon: TagIcon, wrap: "border-forest-900/10 bg-white", iconWrap: "bg-forest-100 text-forest-700" },
  club_meetup: { icon: CalendarIcon, wrap: "border-forest-900/10 bg-white", iconWrap: "bg-forest-100 text-forest-700" },
};

export function FeedItemCard({ entry, now }: { entry: GeneratedEntry; now: Date }) {
  const style = STYLES[entry.type] ?? STYLES.place_added;
  const Icon = style.icon;
  const p = entry.payload as Record<string, string | number | null | undefined>;

  let title = "";
  let subtitle = "";
  let href = "/explore";

  switch (entry.type) {
    case "place_added":
      title = `New on Wano: ${p.title}`;
      subtitle = String(p.subtitle ?? "");
      href = String(p.href ?? href);
      break;
    case "review_posted":
      title = `${p.reviewerName} rated ${p.listingTitle} ${p.rating}/5`;
      subtitle = String(p.comment ?? "");
      href = String(p.href ?? href);
      break;
    case "event_upcoming":
      title = String(p.title);
      subtitle = `${p.location} · ${new Date(String(p.startAt)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
      href = String(p.href ?? href);
      break;
    case "event_momentum":
      title = `${p.title} is picking up`;
      subtitle = `${p.threshold}+ people are going`;
      href = String(p.href ?? href);
      break;
    case "perk_added":
      title = `New perk: ${p.title}`;
      subtitle = String(p.discountText ?? "");
      href = String(p.href ?? href);
      break;
    case "perk_expiring":
      title = `${p.title} expires soon`;
      subtitle = `${p.discountText} · ends ${new Date(String(p.expiresAt)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
      href = String(p.href ?? href);
      break;
    case "journal_published":
      title = String(p.title);
      subtitle = String(p.excerpt ?? "");
      href = String(p.href ?? href);
      break;
    case "club_meetup":
      title = `${p.clubName} meetup`;
      subtitle = `${p.location} · ${new Date(String(p.startAt)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
      href = String(p.href ?? href);
      break;
  }

  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-2xl border p-4 transition hover:shadow-sm ${style.wrap}`}
    >
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${style.iconWrap}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-forest-900">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-forest-800/60">{subtitle}</p>}
      </div>
      <span className="flex-none text-[11px] text-forest-800/40">{timeAgo(entry.createdAt, now)}</span>
    </Link>
  );
}
