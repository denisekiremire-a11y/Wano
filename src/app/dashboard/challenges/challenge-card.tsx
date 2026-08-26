"use client";

import { useState, useTransition } from "react";
import { completeChallengeAction } from "@/lib/actions/challenge-actions";
import { FlagIcon } from "@/components/icons";

export function ChallengeCard({
  title,
  description,
  rewardText,
  challengeId,
  completed,
  referral,
}: {
  title: string;
  description: string;
  rewardText: string;
  challengeId: string;
  completed: boolean;
  referral?: { code: string; count: number };
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const referralUrl = referral
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${referral.code}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail without permission; the code is shown as text either way.
    }
  };

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-5">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${
            completed ? "bg-forest-800 text-marigold-300" : "bg-forest-50 text-forest-400"
          }`}
        >
          <FlagIcon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-forest-900">{title}</h3>
          <p className="mt-1 text-sm text-forest-800/60">{description}</p>
          <p className="mt-1 text-xs font-medium text-marigold-700">{rewardText}</p>
        </div>
        {!referral && (
          <button
            type="button"
            disabled={completed || pending}
            onClick={() => startTransition(() => completeChallengeAction(challengeId))}
            className={`flex-none rounded-full px-4 py-2 text-xs font-semibold transition ${
              completed
                ? "bg-forest-100 text-forest-500"
                : "bg-marigold-500 text-forest-950 hover:bg-marigold-400"
            } disabled:opacity-70`}
          >
            {completed ? "Done" : pending ? "Marking…" : "Mark done"}
          </button>
        )}
      </div>

      {referral && (
        <div className="mt-4 rounded-xl bg-forest-50 p-3">
          <p className="text-xs font-medium text-forest-800/60">
            {referral.count > 0
              ? `${referral.count} friend${referral.count === 1 ? "" : "s"} joined with your link — this challenge is verified automatically.`
              : "Share your link — this challenge verifies automatically the moment someone signs up with it."}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={referralUrl}
              className="flex-1 rounded-lg border border-forest-900/15 bg-white px-3 py-1.5 text-xs text-forest-800"
            />
            <button
              type="button"
              onClick={copyLink}
              className="flex-none rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
