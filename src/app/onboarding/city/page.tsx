import { saveCityAction } from "@/lib/actions/onboarding-actions";
import { requireRole } from "@/lib/auth";

const cities = ["Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu", "Fort Portal"];

export default async function OnboardingCityPage() {
  await requireRole("traveller");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">Step 2 of 3</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900">
        Where are you based?
      </h1>
      <p className="mt-1 text-sm text-forest-800/70">
        We'll prioritize places and events near you first.
      </p>

      <form action={saveCityAction} className="mt-6 space-y-4">
        <input
          name="city"
          list="wano-cities"
          required
          placeholder="e.g. Kampala"
          className="w-full rounded-lg border border-forest-900/15 px-3 py-2.5 text-sm outline-none focus:border-forest-600"
        />
        <datalist id="wano-cities">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <p className="text-xs text-forest-800/50">
          Popular: {cities.join(" · ")} — or type your own.
        </p>

        <button
          type="submit"
          className="w-full rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
