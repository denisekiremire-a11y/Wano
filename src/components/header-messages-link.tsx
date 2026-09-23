import Link from "next/link";
import { MailIcon } from "@/components/icons";

/** Logged-in only — Messages folded out of the bottom nav into the
 * Social tab, so this is its one remaining entry point from the header.
 * No unread badge: no read/unread tracking exists anywhere in the
 * messages schema today. */
export function HeaderMessagesLink() {
  return (
    <Link
      href="/messages"
      aria-label="Messages"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-forest-800/70 transition hover:bg-forest-900/5 hover:text-forest-900"
    >
      <MailIcon className="h-5 w-5" />
    </Link>
  );
}
