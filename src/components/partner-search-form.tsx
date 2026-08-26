import { listingTypeLabels } from "@/lib/listing-type";

export function PartnerSearchForm({
  locations,
  filters,
  hiddenFields,
}: {
  locations: string[];
  filters: { type?: string; location?: string; q?: string };
  hiddenFields?: Record<string, string>;
}) {
  return (
    <form className="flex flex-wrap gap-2 rounded-2xl border border-forest-900/10 bg-white p-4">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <input
        type="text"
        name="q"
        defaultValue={filters.q ?? ""}
        placeholder="Search by name, business, or place..."
        className="min-w-[200px] flex-1 rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
      />
      <select
        name="type"
        defaultValue={filters.type ?? ""}
        className="rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
      >
        <option value="">All types</option>
        {Object.entries(listingTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        name="location"
        defaultValue={filters.location ?? ""}
        className="rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
      >
        <option value="">All locations</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
      >
        Search
      </button>
    </form>
  );
}
