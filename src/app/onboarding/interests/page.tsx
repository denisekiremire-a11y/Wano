import { saveInterestsAction } from "@/lib/actions/onboarding-actions";
import { requireRole } from "@/lib/auth";
import { getAllInterests } from "@/lib/data/interests";

export default async function OnboardingPage() {
  await requireRole("traveller");
  const interests = await getAllInterests();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">Step 3 of 3</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900">
        What are you into?
      </h1>
      <p className="mt-1 text-sm text-forest-800/70">
        Pick a few interests so Wano can surface the right places, events and people for you. You
        can change these anytime.
      </p>

      <form action={saveInterestsAction} className="mt-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {interests.map((interest) => (
            <label
              key={interest.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-forest-900/10 bg-white px-3 py-2.5 text-sm font-medium text-forest-800 transition has-[:checked]:border-forest-700 has-[:checked]:bg-forest-50"
            >
              <input
                type="checkbox"
                name="interestIds"
                value={interest.id}
                className="h-4 w-4 accent-forest-700"
              />
              {interest.label}
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
