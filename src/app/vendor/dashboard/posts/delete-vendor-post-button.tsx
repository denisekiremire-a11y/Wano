"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVendorPostAction } from "@/lib/actions/vendor-post-actions";

export function DeleteVendorPostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm("Delete this post?")) return;
    startTransition(async () => {
      await deleteVendorPostAction(postId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleDelete}
      className="text-xs font-medium text-ink/50 hover:text-red-600 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
