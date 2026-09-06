import { getActiveFunzoneRewards } from "@/lib/data/rewards";
import { IssueForm } from "./issue-form";

export default async function AdminFunzonePage() {
  const rewardsList = await getActiveFunzoneRewards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Fun Zone</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          When someone wins a game on match day, issue their prize here. They get a link to claim
          it — claiming requires an account, which is the point: it&apos;s how a free-to-play game
          turns into a signup.
        </p>
      </div>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <IssueForm
          rewardOptions={rewardsList.map((r) => ({
            id: r.id,
            title: r.title,
            targetTitle: r.target?.title ?? "Unknown",
          }))}
        />
      </section>
    </div>
  );
}
