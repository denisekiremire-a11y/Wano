"use client";

import { useState, useTransition } from "react";
import { issueFunzoneClaimAction } from "@/lib/actions/funzone-actions";

type RewardOption = { id: string; title: string; targetTitle: string };

export function IssueForm({ rewardOptions }: { rewardOptions: RewardOption[] }) {
  const [phone, setPhone] = useState("");
  const [rewardId, setRewardId] = useState(rewardOptions[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ claimUrl: string } | { error: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function issue() {
    if (!phone.trim() || !rewardId) return;
    startTransition(async () => {
      const res = await issueFunzoneClaimAction(phone, rewardId);
      setResult(res);
      setCopied(false);
    });
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be denied — the link is still visible to copy manually.
    }
  }

  if (rewardOptions.length === 0) {
    return (
      <p className="text-sm text-forest-800/60">
        No active Fun Zone prizes yet — add one at{" "}
        <a href="/admin/rewards" className="underline">
          /admin/rewards
        </a>{" "}
        with source &quot;Fun Zone&quot;.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-forest-900">Winner&apos;s phone number</label>
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setResult(null);
            }}
            placeholder="+256 7xx xxx xxx"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Prize</label>
          <select
            value={rewardId}
            onChange={(e) => {
              setRewardId(e.target.value);
              setResult(null);
            }}
            className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
          >
            {rewardOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.targetTitle})
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={issue}
        disabled={pending || !phone.trim()}
        className="rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
      >
        {pending ? "Issuing…" : "Issue prize"}
      </button>

      {result && "error" in result && <p className="text-sm text-red-700">{result.error}</p>}
      {result && "claimUrl" in result && (
        <div className="rounded-xl border border-forest-900/10 bg-forest-50 p-3">
          <p className="text-xs font-medium text-forest-800/70">
            Show or send this link to the winner — no SMS is sent automatically.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="truncate text-sm font-mono text-forest-900">{result.claimUrl}</p>
            <button
              type="button"
              onClick={() => copyLink(result.claimUrl)}
              className="shrink-0 rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-800"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
