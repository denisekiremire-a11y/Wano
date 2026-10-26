"use client";

import { useEffect, useRef, useState } from "react";
import { checkInVisitorAction, type CheckInOutcome } from "@/lib/actions/check-in-actions";

/** Logs the visit as soon as staff open a visitor's QR (or typed code), so
 * the member's weekly challenges and neighbourhood stamps count it. */
export function CheckInOnOpen({ token, via }: { token: string; via: "qr" | "code" }) {
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    checkInVisitorAction(token, via).then(setOutcome, () => setOutcome({ ok: false, reason: "invalid" }));
  }, [token, via]);

  if (!outcome) return <p className="text-sm text-ink/50">Logging the visit…</p>;
  if (!outcome.ok) {
    if (outcome.reason === "not_trusted") {
      return (
        <p className="border border-ink/10 bg-white p-4 text-sm text-ink/60">
          Visits start counting for Passport challenges once Wano has verified your venue.
        </p>
      );
    }
    return null;
  }

  return (
    <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
      <p className="font-semibold">{outcome.created ? "Visit logged" : "Already logged today"}</p>
      {outcome.newArea && <p className="mt-1">New neighbourhood stamp: {outcome.newArea}.</p>}
      {outcome.completed.map((c) => (
        <p key={c.title} className="mt-1">
          Challenge done: {c.title} (+{c.xp} XP)
        </p>
      ))}
    </div>
  );
}
