"use client";

import { useActionState } from "react";
import { submitVendorDocumentAction } from "@/lib/actions/vendor-document-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const docTypeOptions = [
  { value: "business_registration", label: "Business registration certificate" },
  { value: "owner_id", label: "Owner/manager ID" },
  { value: "tax_certificate", label: "Tax certificate" },
  { value: "other", label: "Other" },
];

export function DocumentForm() {
  const [state, formAction, pending] = useActionState(submitVendorDocumentAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
      <div>
        <label htmlFor="docType" className="text-sm font-medium text-forest-900">
          Document type
        </label>
        <select
          id="docType"
          name="docType"
          required
          className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
        >
          {docTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="file" className="text-sm font-medium text-forest-900">
          Document file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-forest-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-forest-600"
        />
        <p className="mt-1 text-xs text-forest-800/50">PDF, JPG, PNG, or WebP — max 10MB.</p>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit document"}
      </button>
    </form>
  );
}
