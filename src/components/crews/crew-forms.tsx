"use client";

import { useActionState } from "react";
import {
  createCrewAction,
  joinCrewAction,
  removeCrewMemberAction,
  renameCrewAction,
  resetCrewInviteAction,
} from "@/lib/actions/crew-actions";
import { CREW_NAME_MAX } from "@/lib/crew-limits";

const input = "min-w-0 flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember";
const primary =
  "rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60";

function ErrorLine({ error }: { error?: string }) {
  return error ? <p className="text-sm text-red-600">{error}</p> : null;
}

export function CreateCrewForm() {
  const [state, action, pending] = useActionState(createCrewAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="name" maxLength={CREW_NAME_MAX} required placeholder="Kololo Friday crew" className={input} />
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Starting…" : "Start a crew"}
        </button>
      </div>
      <ErrorLine error={state?.error} />
    </form>
  );
}

export function JoinCrewButton({ token, name }: { token: string; name: string }) {
  const [state, action, pending] = useActionState(joinCrewAction.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-2">
      <button type="submit" disabled={pending} className={`${primary} w-full`}>
        {pending ? "Joining…" : `Join ${name}`}
      </button>
      <ErrorLine error={state?.error} />
    </form>
  );
}

export function RenameCrewForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(renameCrewAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input name="name" defaultValue={current} maxLength={CREW_NAME_MAX} required className={input} />
        <button type="submit" disabled={pending} className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60">
          {pending ? "Saving…" : "Rename"}
        </button>
      </div>
      <ErrorLine error={state?.error} />
      {state && !state.error && <p className="text-xs text-ink/50">Saved.</p>}
    </form>
  );
}

export function RemoveMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const [state, action, pending] = useActionState(removeCrewMemberAction.bind(null, memberId), undefined);
  return (
    <form action={action} className="inline">
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remove ${name} from the crew`}
        className="text-xs text-ink/40 hover:text-red-700 disabled:opacity-60"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {state?.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ResetInviteButton() {
  const [state, action, pending] = useActionState(resetCrewInviteAction, undefined);
  return (
    <form action={action} className="inline">
      <button type="submit" disabled={pending} className="text-xs text-ink/50 hover:text-ink disabled:opacity-60">
        {pending ? "Making a new link…" : "Make a new link (the old one stops working)"}
      </button>
      {state?.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
