import { savePersonaAction } from "@/lib/actions/onboarding-actions";
import { requireRole } from "@/lib/auth";

const personas = [
  {
    value: "newcomer",
    label: "I just arrived in Uganda",
    hint: "New here — help me get set up: SIM, transport, a place to stay.",
  },
  {
    value: "tourist",
    label: "I'm visiting as a tourist",
    hint: "Here for a trip — show me experiences, journeys, and top-rated stays.",
  },
  {
    value: "local",
    label: "I live here and want to explore",
    hint: "Local — surface new places, events, and deals near me.",
  },
] as const;

export default async function OnboardingPersonaPage() {
  await requireRole("traveller");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">Step 1 of 3</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900">
        Which one sounds like you?
      </h1>
      <p className="mt-1 text-sm text-forest-800/70">
        This just shapes what we show you first — you can explore everything either way.
      </p>

      <form action={savePersonaAction} className="mt-6 space-y-3">
        {personas.map((p) => (
          <label
            key={p.value}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-forest-900/10 bg-white p-4 transition has-[:checked]:border-forest-700 has-[:checked]:bg-forest-50"
          >
            <input
              type="radio"
              name="persona"
              value={p.value}
              required
              className="mt-1 h-4 w-4 accent-forest-700"
            />
            <span>
              <span className="block text-sm font-semibold text-forest-900">{p.label}</span>
              <span className="block text-xs text-forest-800/60">{p.hint}</span>
            </span>
          </label>
        ))}

        <button
          type="submit"
          className="mt-4 w-full rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
