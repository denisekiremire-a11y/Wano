"use client";

import { startTransition, useActionState, useState } from "react";
import { updateProfilePhotoAction } from "@/lib/actions/profile-actions";
import { CameraIcon } from "@/components/icons";
import { ProfilePhotoCropModal } from "@/components/profile-photo-crop-modal";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

/** The avatar circle on the Passport header, with the camera badge wired
 * to an actual upload instead of just linking back to this same page.
 * Picking a file opens the crop/reposition modal; confirming there
 * submits the already-square cropped image (see profile-photo-crop-modal),
 * so every circular avatar render elsewhere shows the same framing the
 * traveller chose instead of an arbitrary `object-cover` center-crop. */
export function ProfilePhotoUpload({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfilePhotoAction, initialState);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  }

  function handleCropped(blob: Blob) {
    setPendingFile(null);
    const formData = new FormData();
    formData.set("photo", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    startTransition(() => {
      formAction(formData);
    });
  }

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
      <label
        aria-label="Change profile photo"
        className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-paper bg-ink text-white"
      >
        <CameraIcon className="h-3.5 w-3.5" />
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={pending}
          onChange={handleFileSelected}
        />
      </label>
      {state.error && (
        <p className="absolute top-[68px] w-40 text-center text-xs text-red-700">{state.error}</p>
      )}
      {pendingFile && (
        <ProfilePhotoCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCropped}
        />
      )}
    </div>
  );
}
