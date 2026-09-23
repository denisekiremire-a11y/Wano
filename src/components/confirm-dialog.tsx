"use client";

import { useState } from "react";

/** A small "are you sure?" step in front of an action — same fixed-overlay
 * convention as image-lightbox.tsx (no portal library, no native <dialog>).
 * `trigger` renders the button that opens the dialog; `onConfirm` is called
 * when the traveller confirms, and is responsible for actually submitting
 * whatever form/action this is guarding. */
export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  disabled,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger(() => setOpen(true))}

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-forest-950/50 p-4 md:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="font-display text-lg font-semibold text-forest-900">
              {title}
            </h2>
            <div className="mt-2 text-sm text-forest-800/70">{body}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-forest-900/15 px-4 py-2 text-sm font-semibold text-forest-900 transition hover:bg-forest-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                className="rounded-full bg-marigold-500 px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
