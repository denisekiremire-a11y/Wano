function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Avatar row + "First, Second + N more going" line for an event, journey
 * stop, or club activity. Callers pass an already-filtered (no one with the
 * attendee-list privacy toggle on) and already-sorted (mutual connections
 * first — see getEventBookers / getMutualFollowIds) list; this component
 * only renders it. First-name-only everywhere, per the privacy default. */
export function AttendeeAvatars({
  attendees,
  totalCount,
  maxAvatars = 6,
  label = "going",
}: {
  attendees: { travellerId: string; displayName: string }[];
  totalCount: number;
  maxAvatars?: number;
  label?: string;
}) {
  if (totalCount === 0) return null;

  const shown = attendees.slice(0, maxAvatars);
  const namedCount = attendees.length;
  const extra = Math.max(0, totalCount - namedCount);

  const names = shown.slice(0, 3).map((a) => firstName(a.displayName));
  const namesLine =
    names.length > 0
      ? `${names.join(", ")}${extra > 0 || namedCount > names.length ? ` + ${totalCount - names.length} more` : ""} ${label}`
      : `${totalCount} ${label}`;

  return (
    <div className="flex items-center gap-2">
      {shown.length > 0 && (
        <div className="flex -space-x-2">
          {shown.map((a) => (
            <span
              key={a.travellerId}
              title={firstName(a.displayName)}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 border-white bg-forest-700 text-[11px] font-semibold text-white"
            >
              {initials(a.displayName)}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm text-ink/60">{namesLine}</p>
    </div>
  );
}
