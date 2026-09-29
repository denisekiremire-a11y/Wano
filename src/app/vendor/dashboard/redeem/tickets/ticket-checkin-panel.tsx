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
      <div className="border border-red-200 bg-red-50 p-5">
        <p className="eyebrow text-red-600">Can&apos;t check in this ticket</p>
        <p className="mt-1 text-sm text-red-700">
          {REJECTION_COPY[check.reason]}
          {check.reason === "already_checked_in" && check.detail ? ` (${check.detail})` : ""}
        </p>
      </div>
    );
  }

  if (justCheckedIn) {
    return (
      <div className="border border-ink/10 bg-ink/5 p-5 text-center">
        <p className="eyebrow text-ink">Checked in</p>
        <p className="mt-1 text-sm text-ink/70">
          {check.title} — {check.travellerName}
          {check.partySize ? ` (party of ${check.partySize})` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-ink/10 bg-white p-5">
      <p className="eyebrow text-ink/40">Checking in</p>
      <p className="font-serif-editorial mt-1 text-xl text-ink">{check.travellerName}</p>
      <p className="mt-2 text-sm text-ink/70">{check.title}</p>
      {check.partySize && <p className="text-sm text-ink/50">Party of {check.partySize}</p>}
      <p className="font-mono-data mt-1 text-xs text-ink/40">ref {check.bookingRef}</p>

      <form action={formAction} className="mt-4">
        <input type="hidden" name="bookingId" value={bookingId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Checking in…" : "Check in"}
        </button>
        {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
