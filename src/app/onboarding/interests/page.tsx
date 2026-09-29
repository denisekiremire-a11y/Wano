import { saveInterestsAction } from "@/lib/actions/onboarding-actions";
import { requireRole } from "@/lib/auth";
import { getAllInterests } from "@/lib/data/interests";

export default async function OnboardingPage() {
  await requireRole("traveller");
  const interests = await getAllInterests();

  return (
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-lg">
        <p className="eyebrow text-ember">Step 3 / 3</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">What are you into?</h1>
        <p className="mt-2 text-sm text-ink/60">
          Pick a few interests so Wano can surface the right places, events and people for you. You
          can change these anytime.
        </p>

        <form action={saveInterestsAction} className="mt-8">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {interests.map((interest) => (
              <label
                key={interest.id}
                className="flex cursor-pointer items-center gap-2 border border-ink/10 bg-white px-3 py-2.5 text-sm font-medium text-ink/70 transition-colors has-[:checked]:border-ink has-[:checked]:bg-ink/5 has-[:checked]:text-ink"
              >
                <input
                  type="checkbox"
                  name="interestIds"
                  value={interest.id}
                  className="h-4 w-4 accent-ink"
                />
                {interest.label}
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="mt-8 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
