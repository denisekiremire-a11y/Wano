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
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-lg">
        <p className="eyebrow text-ember">Step 1 / 3</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">Which one sounds like you?</h1>
        <p className="mt-2 text-sm text-ink/60">
          This just shapes what we show you first — you can explore everything either way.
        </p>

        <form action={savePersonaAction} className="mt-8">
          <div className="border-t border-ink/10">
            {personas.map((p) => (
              <label
                key={p.value}
                className="flex cursor-pointer items-start gap-4 border-b border-ink/10 py-5 transition-colors has-[:checked]:bg-ink/5"
              >
                <input
                  type="radio"
                  name="persona"
                  value={p.value}
                  required
                  className="mt-1 h-4 w-4 accent-ink"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">{p.label}</span>
                  <span className="block text-xs text-ink/50">{p.hint}</span>
                </span>
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
