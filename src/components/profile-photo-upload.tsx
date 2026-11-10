"use client";

import { useActionState, useRef } from "react";
import { updateProfilePhotoAction } from "@/lib/actions/profile-actions";
import { CameraIcon } from "@/components/icons";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

/** The avatar circle on the Passport header, with the camera badge wired
 * to an actual upload instead of just linking back to this same page.
 * Picking a file auto-submits the form (see onChange) — there's no
 * separate "upload" button to press, matching the one-tap feel of every
 * other native "tap your avatar to change it" pattern. */
export function ProfilePhotoUpload({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfilePhotoAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="relative flex-none">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
          style={{ opacity: pending ? 0.6 : 1 }}
        />
      ) : (
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/5 text-2xl font-semibold text-ink/70"
          style={{ opacity: pending ? 0.6 : 1 }}
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
      <form ref={formRef} action={formAction}>
        <label
          aria-label="Change profile photo"
          className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-paper bg-ink text-white"
        >
          <CameraIcon className="h-3.5 w-3.5" />
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={pending}
            onChange={() => formRef.current?.requestSubmit()}
          />
        </label>
      </form>
      {state.error && (
        <p className="absolute top-[68px] w-40 text-center text-xs text-red-700">{state.error}</p>
      )}
    </div>
  );
}
