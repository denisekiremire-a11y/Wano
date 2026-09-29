import { saveCityAction } from "@/lib/actions/onboarding-actions";
import { requireRole } from "@/lib/auth";

const cities = ["Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu", "Fort Portal"];

export default async function OnboardingCityPage() {
  await requireRole("traveller");

  return (
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-lg">
        <p className="eyebrow text-ember">Step 2 / 3</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">Where are you based?</h1>
        <p className="mt-2 text-sm text-ink/60">
          We&apos;ll prioritize places and events near you first.
        </p>

        <form action={saveCityAction} className="mt-8 space-y-4">
          <input
            name="city"
            list="wano-cities"
            required
            placeholder="e.g. Kampala"
            className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-ember"
          />
          <datalist id="wano-cities">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="text-xs text-ink/40">
            Popular: {cities.join(" · ")} — or type your own.
          </p>

          <button
            type="submit"
            className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
