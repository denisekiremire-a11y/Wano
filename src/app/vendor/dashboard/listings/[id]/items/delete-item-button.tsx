"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteListingItemAction } from "@/lib/actions/vendor-item-actions";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm("Remove this item?")) return;
    startTransition(async () => {
      await deleteListingItemAction(itemId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleDelete}
      className="text-xs font-medium text-red-700/70 underline hover:text-red-700 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
