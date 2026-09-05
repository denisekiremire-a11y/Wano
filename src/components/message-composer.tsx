"use client";

import { useRef, useState } from "react";
import { sendMessageAction } from "@/lib/actions/message-actions";
import type { ActionState } from "@/lib/validation";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, setState] = useState<ActionState>({});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-3 border-t border-forest-900/10 pt-3">
      <form
        ref={formRef}
        action={async (formData) => {
          const result = await sendMessageAction(state, formData);
          setState(result);
          if (!result.error) formRef.current?.reset();
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input
          name="content"
          placeholder="Write a message…"
          required
          maxLength={2000}
          autoComplete="off"
          className="flex-1 rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <button type="submit" className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white">
          Send
        </button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
    </div>
  );
}
