"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<{ push: (message: string, variant?: ToastVariant) => void } | null>(null);

const TOAST_TTL_MS = 4000;

/** App-wide toast state, mounted once in the root layout. Plain fixed-
 * overlay + context, same house convention as image-lightbox.tsx — no
 * portal library. Toasts are for the new flows this phase adds (claim
 * confirm, review submit, reward redeem, ticket check-in); most of the
 * app's forms still use inline error text + redirect-on-success. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-sm rounded-full px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg ${
              toast.variant === "error" ? "bg-red-700" : "bg-forest-900"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Push a toast from any client component under ToastProvider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider.");
  return ctx;
}
