import { inviteLinks } from "@/lib/invite-link";
import { FRIEND_FIRST_VISIT_XP } from "@/lib/rewards-config";

/** "Bring your friends": a WhatsApp invite with the member's own join link.
 * Friends who join with it are connected automatically, and the member
 * earns XP when each one makes a first visit. */
export function InviteFriendsCard({ referralCode, displayName }: { referralCode: string; displayName: string }) {
  const { whatsappUrl } = inviteLinks(referralCode, displayName.split(" ")[0] || displayName);
  return (
    <section className="border border-ink/10 bg-white p-5 text-left">
      <p className="eyebrow text-ember">Bring your friends</p>
      <h2 className="font-serif-editorial mt-1 text-xl text-ink">Wano is better with your people</h2>
      <p className="mt-1 text-sm text-ink/60">
        Friends who join from your link are added as friends straight away, so you see where each other
        is going. You get {FRIEND_FIRST_VISIT_XP} XP when each one makes their first visit.
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block rounded-full bg-[#1f7a4d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#186440]"
      >
        Invite on WhatsApp
      </a>
    </section>
  );
}
