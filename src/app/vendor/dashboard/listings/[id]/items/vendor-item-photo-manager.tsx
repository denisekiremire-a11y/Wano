"use client";

import { useActionState, useTransition } from "react";
import { deleteListingItemImageAction, uploadListingItemPhotosAction } from "@/lib/actions/vendor-item-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

/** Smaller sibling of VendorPhotoManager, scoped to one listingItem instead
 * of a whole listing. Only rendered once the item exists — same
 * add-photos-after-creation pattern the listing-level manager uses. */
export function VendorItemPhotoManager({ itemId, existingImages }: { itemId: string; existingImages: string[] }) {
  const [state, formAction, pending] = useActionState(uploadListingItemPhotosAction, initialState);
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <div>
      <h3 className="text-sm font-medium text-forest-900">Photos</h3>
      <p className="mt-0.5 text-xs text-forest-800/50">The first photo is the thumbnail shown alongside this item.</p>

      {existingImages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {existingImages.map((imageId) => (
            <div key={imageId} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/listing-item-images/${imageId}`}
                alt=""
                className="h-20 w-20 rounded-lg border border-forest-900/10 object-cover"
              />
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => startDeleteTransition(() => deleteListingItemImageAction(imageId))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white disabled:opacity-50"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="itemId" value={itemId} />
        <input
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-sm text-forest-800/70 file:mr-3 file:rounded-full file:border-0 file:bg-forest-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
      <p className="mt-1 text-xs text-forest-800/50">JPG, PNG, or WebP, up to 8MB each.</p>
    </div>
  );
}
