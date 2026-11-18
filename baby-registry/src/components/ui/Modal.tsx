"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function Modal({ open, onClose, title, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      className={`m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-3xl border border-linen bg-ivory p-0 text-ink shadow-[var(--shadow-lift)] ${wide ? "max-w-2xl" : "max-w-lg"}`}
    >
      {open && (
        <div className="relative p-5 sm:p-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-muted hover:bg-cream hover:text-ink"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
