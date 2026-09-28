import Link from "next/link";
import { notFound } from "next/navigation";
import { getHostCandidates } from "@/lib/data/admin";
import { getClubById, getClubMeetups } from "@/lib/data/social";
import { requireAdminPage } from "@/lib/auth";
import { ClubDetailsForm } from "./club-details-form";
import { ScheduleMeetupForm } from "./schedule-meetup-form";
import { ApproveRejectRow } from "../club-review-row";

export default async function AdminClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("/admin/clubs");
  const { id } = await params;
  const [row, hosts, meetups] = await Promise.all([getClubById(id), getHostCandidates(), getClubMeetups(id)]);
  if (!row) notFound();
  const { club, interest, vendorProfile, host } = row;

  const ready = Boolean(club.hostUserId) && meetups.upcoming.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/clubs" className="eyebrow text-ember hover:text-ink">
          ← All clubs
        </Link>
        <h1 className="mt-2 font-serif-editorial text-2xl text-ink">{club.name}</h1>
        <p className="text-sm text-ink/60">
          {interest.label}
          {vendorProfile ? ` · Run by ${vendorProfile.businessName}` : ""}
        </p>
        <p className="mt-1 text-sm text-ink/70">{club.description}</p>
        {club.applicantContact && (
          <p className="mt-1 text-xs text-ink/50">Applicant contact: {club.applicantContact}</p>
        )}
      </div>

      <ApproveRejectRow clubId={club.id} status={club.status} ready={ready} host={host?.name ?? null} />

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Details</h2>
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

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Meetups</h2>
        {meetups.upcoming.length === 0 ? (
          <p className="text-sm text-ink/60">No upcoming meetup scheduled — required before publishing.</p>
        ) : (
          <ul className="border-t border-ink/10">
            {meetups.upcoming.map((e) => (
              <li key={e.id} className="border-b border-ink/10 py-2 text-sm text-ink/70">
                {e.title} —{" "}
                <span className="font-mono-data text-ink/50">
                  {new Date(e.startAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <ScheduleMeetupForm clubId={club.id} defaultCategory={interest.key} />
      </section>
    </div>
  );
}
