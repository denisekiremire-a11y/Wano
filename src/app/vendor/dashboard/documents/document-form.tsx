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
        <label htmlFor="documentUrl" className="text-sm font-medium text-forest-900">
          Document link
        </label>
        <input
          id="documentUrl"
          name="documentUrl"
          type="url"
          required
          placeholder="https://drive.google.com/..."
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <p className="mt-1 text-xs text-forest-800/50">
          Upload to Google Drive/Dropbox and paste a shareable link — direct upload is coming soon.
        </p>
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
