import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllInterests } from "@/lib/data/social";
import { ApplyClubForm } from "./apply-club-form";

export default async function StartAClubPage() {
  await requireRole("traveller");
  const interests = await getAllInterests();

  return (
    <main className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <Link href="/social" className="text-sm text-nile-700 hover:underline">
        ← Social
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold text-forest-900">Start a club</h1>
      <p className="mt-1 text-sm text-forest-800/60">
        Don&apos;t see your category, or want a second club in one that exists? Tell us about it — an admin
        reviews every application.
      </p>

      <div className="mt-6">
        <ApplyClubForm interests={interests.map((i) => ({ id: i.id, label: i.label }))} />
      </div>
    </main>
  );
}
