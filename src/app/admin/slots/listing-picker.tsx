"use client";

import { useRouter } from "next/navigation";

export function ListingPicker({
  listings,
  selectedListingId,
}: {
  listings: { id: string; title: string; businessName: string }[];
  selectedListingId?: string;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={selectedListingId ?? ""}
      onChange={(e) => router.push(e.target.value ? `/admin/slots?listingId=${e.target.value}` : "/admin/slots")}
      className="w-full max-w-md rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
    >
      <option value="">Choose a listing to manage…</option>
      {listings.map((l) => (
        <option key={l.id} value={l.id}>
          {l.title} ({l.businessName})
        </option>
      ))}
    </select>
  );
}
