"use client";

import { useState, useTransition } from "react";
import { runMilestoneSBackfillAction } from "@/lib/actions/admin-seed-actions";

export function BackfillButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof runMilestoneSBackfillAction>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const r = await runMilestoneSBackfillAction();
              setResult(r);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Something went wrong.");
            }
          })
        }
        className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Running…" : "Run backfill"}
      </button>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {result && (
        <div className="rounded-xl border border-forest-900/10 bg-white p-4 text-sm text-forest-800/80">
          <p className="font-medium text-forest-900">Done.</p>
          <ul className="mt-2 space-y-1">
            <li>Journal posts created: {result.journal.journalPostsCreated} (skipped {result.journal.journalPostsSkipped}, already existed)</li>
            <li>Clubs created: {result.clubs.clubsCreated}</li>
            <li>Clubs backfilled with host/cadence/WhatsApp: {result.clubs.clubsBackfilled}</li>
            <li>Meetups scheduled: {result.clubs.meetupsCreated}</li>
            <li>Interest categories created: {result.clubs.interestsCreated}</li>
          </ul>
          <p className="mt-3 font-medium text-forest-900">Feed items generated:</p>
          <ul className="mt-1 space-y-1">
            <li>New places: {result.feed.placeAdded}</li>
            <li>Reviews: {result.feed.reviewPosted}</li>
            <li>Perks: {result.feed.perkAdded}</li>
            <li>User posts: {result.feed.userPost}</li>
            <li>Journal posts: {result.feed.journalPublished}</li>
            <li>Club meetups: {result.feed.clubMeetup}</li>
            <li>Events crossing 3 days out: {result.feed.eventUpcomingCreated}</li>
            <li>Perks expiring within 5 days: {result.feed.perkExpiringCreated}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
