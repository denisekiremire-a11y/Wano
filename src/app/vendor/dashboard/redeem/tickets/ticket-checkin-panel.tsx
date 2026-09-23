"use client";

import { useActionState, useEffect, useRef } from "react";
import { useToast } from "@/components/toast/toast-provider";
import { checkInTicketAction, type TicketCheck } from "@/lib/actions/ticket-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const REJECTION_COPY: Record<Exclude<TicketCheck, { ok: true }>["reason"], string> = {
  invalid: "Ticket not found. Double-check the code or ask the traveller to reopen their QR.",
  not_a_ticket: "That confirmation code isn't a ticket booking.",
  already_checked_in: "This ticket has already been checked in.",
  wrong_venue: "This ticket isn't for your venue.",
  cancelled: "This booking was cancelled.",
};

export function TicketCheckInPanel({ check, bookingId }: { check: TicketCheck; bookingId?: string }) {
  const [state, formAction, pending] = useActionState(checkInTicketAction, initialState);
  const wasPending = useRef(false);
  const { push } = useToast();
  const justCheckedIn = !state.error && state !== initialState;

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      push(`Checked in — ${check.ok ? check.travellerName : "ticket"}.`);
    }
    wasPending.current = pending;
  }, [pending, state.error, push, check]);

  if (!check.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-800">Can&apos;t check in this ticket</p>
        <p className="mt-1 text-sm text-red-700">
          {REJECTION_COPY[check.reason]}
          {check.reason === "already_checked_in" && check.detail ? ` (${check.detail})` : ""}
        </p>
      </div>
    );
  }

  if (justCheckedIn) {
    return (
      <div className="rounded-2xl border border-forest-300 bg-forest-50 p-5 text-center">
        <p className="text-sm font-semibold text-forest-900">Checked in</p>
        <p className="mt-1 text-sm text-forest-800/70">
          {check.title} — {check.travellerName}
          {check.partySize ? ` (party of ${check.partySize})` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-forest-800/50">Checking in</p>
      <p className="mt-1 font-display text-xl font-semibold text-forest-900">{check.travellerName}</p>
      <p className="mt-2 text-sm text-forest-800/80">{check.title}</p>
      {check.partySize && <p className="text-sm text-forest-800/60">Party of {check.partySize}</p>}
      <p className="mt-1 font-mono text-xs text-forest-800/50">ref {check.bookingRef}</p>

      <form action={formAction} className="mt-4">
        <input type="hidden" name="bookingId" value={bookingId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
        >
          {pending ? "Checking in…" : "Check in"}
        </button>
        {state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
      </form>
    </div>
  );
}
