"use client";

import { ErrorScreen } from "@/components/site/StateScreens";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorScreen
      retry={
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
      }
    />
  );
}
