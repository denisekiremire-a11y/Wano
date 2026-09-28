import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllInterests } from "@/lib/data/social";
import { ApplyClubForm } from "./apply-club-form";

export default async function StartAClubPage() {
  await requireRole("traveller");
  const interests = await getAllInterests();

  return (
    <main className="font-editorial-body mx-auto max-w-lg bg-paper px-4 py-8 md:px-6">
      <Link href="/social" className="eyebrow text-ink/40 hover:text-ink">
        ← Social
      </Link>

      <h1 className="font-serif-editorial mt-3 text-4xl text-ink md:text-5xl">Start a club</h1>
      <p className="mt-3 max-w-md text-ink/60">
        Don&apos;t see your category, or want a second club in one that exists? Tell us about it — an admin
        reviews every application.
      </p>

      <div className="mt-8">
        <ApplyClubForm interests={interests.map((i) => ({ id: i.id, label: i.label }))} />
      </div>
    </main>
  );
}
