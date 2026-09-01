import Link from "next/link";
import { notFound } from "next/navigation";
import { getHostCandidates } from "@/lib/data/admin";
import { getClubById, getClubMeetups } from "@/lib/data/social";
import { ClubDetailsForm } from "./club-details-form";
import { ScheduleMeetupForm } from "./schedule-meetup-form";
import { ApproveRejectRow } from "../club-review-row";

export default async function AdminClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row, hosts, meetups] = await Promise.all([getClubById(id), getHostCandidates(), getClubMeetups(id)]);
  if (!row) notFound();
  const { club, interest, vendorProfile, host } = row;

  const ready = Boolean(club.hostUserId) && meetups.upcoming.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/clubs" className="text-sm text-nile-700 hover:underline">
          ← All clubs
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900">{club.name}</h1>
        <p className="text-sm text-forest-800/60">
          {interest.label}
          {vendorProfile ? ` · Run by ${vendorProfile.businessName}` : ""}
        </p>
        <p className="mt-1 text-sm text-forest-800/70">{club.description}</p>
        {club.applicantContact && (
          <p className="mt-1 text-xs text-forest-800/50">Applicant contact: {club.applicantContact}</p>
        )}
      </div>

      <ApproveRejectRow clubId={club.id} status={club.status} ready={ready} host={host?.name ?? null} />

      <section className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Details</h2>
        <ClubDetailsForm
          clubId={club.id}
          hosts={hosts}
          initial={{
            hostUserId: club.hostUserId ?? "",
            coverImage: club.coverImage ?? "",
            city: club.city ?? "",
            cadence: club.cadence ?? "",
            whatsappInviteUrl: club.whatsappInviteUrl ?? "",
          }}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Meetups</h2>
        {meetups.upcoming.length === 0 ? (
          <p className="text-sm text-forest-800/60">No upcoming meetup scheduled — required before publishing.</p>
        ) : (
          <ul className="space-y-1 text-sm text-forest-800/80">
            {meetups.upcoming.map((e) => (
              <li key={e.id}>
                {e.title} — {new Date(e.startAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </li>
            ))}
          </ul>
        )}
        <ScheduleMeetupForm clubId={club.id} defaultCategory={interest.key} />
      </section>
    </div>
  );
}
