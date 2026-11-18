"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { saveRateAction, saveSettingsAction, type ActionResult } from "@/app/actions/admin";
import type { RegistrySettings } from "@/lib/types";

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p className={`text-sm ${state.ok ? "text-sage-700" : "text-rose-700"}`} role="status" data-testid="form-status">
      {state.message}
    </p>
  );
}

export function RateForm({ settings }: { settings: RegistrySettings }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveRateAction, null);
  return (
    <form action={action} className="space-y-4" data-testid="rate-form">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="rate">
            1 AED = ? UGX
          </label>
          <input id="rate" name="rate" inputMode="decimal" defaultValue={settings.aed_to_ugx_rate ?? ""} className="field-input" placeholder="e.g. enter today’s rate" />
          <p className="field-hint">Look up the current rate from your bank or a currency site. Leave blank to show AED only.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="source">
            Source (optional)
          </label>
          <input id="source" name="source" maxLength={200} defaultValue={settings.rate_source ?? ""} className="field-input" placeholder="e.g. Bank of Uganda, 16 Nov 2026" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />} Save rate
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function GeneralSettingsForm({ settings }: { settings: RegistrySettings }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveSettingsAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="registryTitle">
          Registry title
        </label>
        <input id="registryTitle" name="registryTitle" required maxLength={120} defaultValue={settings.registry_title} className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="welcomeHeading">
          Welcome heading
        </label>
        <input id="welcomeHeading" name="welcomeHeading" required maxLength={200} defaultValue={settings.welcome_heading} className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="welcomeText">
          Welcome text
        </label>
        <textarea id="welcomeText" name="welcomeText" maxLength={2000} defaultValue={settings.welcome_text} className="field-input min-h-28" />
      </div>
      <div>
        <label className="field-label" htmlFor="priceNotice">
          Price notice
        </label>
        <textarea id="priceNotice" name="priceNotice" maxLength={600} defaultValue={settings.price_notice} className="field-input min-h-20" />
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-linen bg-white p-4">
        <legend className="px-1 text-sm font-medium">Optional: automatic reservation expiry</legend>
        <p className="text-xs text-muted">
          Off by default. When on, reservations that haven’t been marked purchased are released automatically after the number of hours
          below (checked once a day). Leave off to release reservations only by hand.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="reservationExpiryEnabled" defaultChecked={settings.reservation_expiry_enabled} className="size-4 accent-[var(--color-sage-700)]" />
          Release unpurchased reservations automatically
        </label>
        <div className="max-w-48">
          <label className="field-label" htmlFor="hours">
            After (hours)
          </label>
          <input id="hours" name="reservationExpiryHours" type="number" min={1} max={8760} defaultValue={settings.reservation_expiry_hours ?? ""} className="field-input" />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-2xl border border-linen bg-white p-4 md:grid-cols-2">
        <legend className="px-1 text-sm font-medium">Spam protection</legend>
        <div>
          <label className="field-label" htmlFor="maxRes">
            Max reservations per guest per day
          </label>
          <input id="maxRes" name="maxReservationsPerDay" type="number" min={1} max={100} defaultValue={settings.max_reservations_per_client_per_day} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="maxAtt">
            Max attempts per guest per 10 minutes
          </label>
          <input id="maxAtt" name="maxAttemptsPer10Min" type="number" min={1} max={500} defaultValue={settings.max_attempts_per_client_per_10min} className="field-input" />
        </div>
        <p className="text-xs text-muted md:col-span-2">Guests are identified by a salted hash of their network address; raw addresses are never stored.</p>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />} Save settings
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
