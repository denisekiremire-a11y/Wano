import { ListingTypeIcon } from "@/components/listing-type-icon";
import type { ListingItem } from "@/lib/data/listing-items";
import { formatMinor } from "@/lib/currency";
import { listingTypeGradient, type ListingType } from "@/lib/listing-type";

function ItemThumb({ item, listingType, imageId }: { item: ListingItem; listingType: ListingType; imageId?: string }) {
  return imageId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/listing-item-images/${imageId}`} alt={item.name} className="h-14 w-14 flex-none rounded-lg object-cover" />
  ) : (
    <div
      className={`flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-gradient-to-br ${listingTypeGradient[listingType]}`}
    >
      <ListingTypeIcon type={listingType} className="h-6 w-6 text-white/70" />
    </div>
  );
}

/** Single-select radio picker — room, vehicle, service, ticket tier, or
 * package. Used by every type except a restaurant's optional pre-order. */
export function SingleItemPicker({
  items,
  itemImageIds,
  listingType,
  name,
  label,
  preselectedId,
  showQuantity,
  required = true,
}: {
  items: ListingItem[];
  itemImageIds: Map<string, string[]>;
  listingType: ListingType;
  name: string;
  label: string;
  preselectedId?: string;
  showQuantity?: boolean;
  required?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-xs font-medium text-forest-900">
        {label}
        {!required && <span className="font-normal text-forest-800/50"> (optional)</span>}
      </legend>
      {items.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-forest-900/10 p-2 transition has-[:checked]:border-nile-600 has-[:checked]:bg-nile-50/40"
        >
          <input
            type="radio"
            name={name}
            value={item.id}
            defaultChecked={preselectedId ? item.id === preselectedId : false}
            required={required}
            className="ml-1 accent-nile-700"
          />
          <ItemThumb item={item} listingType={listingType} imageId={itemImageIds.get(item.id)?.[0]} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-forest-900">{item.name}</span>
            {(item.durationText || item.capacityText) && (
              <span className="block text-xs text-forest-800/50">
                {[item.durationText, item.capacityText].filter(Boolean).join(" · ")}
              </span>
            )}
          </span>
          {item.priceMinor != null && (
            <span className="flex-none text-sm font-semibold text-ember">
              {formatMinor(item.priceMinor)}
              {item.priceUnit ?? ""}
            </span>
          )}
        </label>
      ))}
      {showQuantity && (
        <Field label="Quantity" name="itemQuantity" />
      )}
    </fieldset>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div className="w-24">
      <label htmlFor={name} className="text-xs font-medium text-forest-900">
        {label}
      </label>
      <input
        id={name}
        type="number"
        name={name}
        min={1}
        defaultValue={1}
        className="mt-1 w-full rounded-md border border-forest-900/15 px-2 py-1.5 text-sm outline-none focus:border-forest-600"
      />
    </div>
  );
}

/** Multi-select checkbox + quantity picker — a restaurant's optional menu
 * pre-order, the one case where more than one item can be chosen at once. */
export function PreorderPicker({
  items,
  itemImageIds,
  listingType,
}: {
  items: ListingItem[];
  itemImageIds: Map<string, string[]>;
  listingType: ListingType;
}) {
  if (items.length === 0) return null;
  const bySection = new Map<string, ListingItem[]>();
  for (const item of items) {
    const key = item.sectionLabel ?? "";
    bySection.set(key, [...(bySection.get(key) ?? []), item]);
  }
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-xs font-medium text-forest-900">Pre-order from the menu (optional)</legend>
      {[...bySection.entries()].map(([section, sectionItems]) => (
        <div key={section || "_"} className="space-y-2">
          {section && <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-800/50">{section}</p>}
          {sectionItems.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-forest-900/10 p-2 transition has-[:checked]:border-nile-600 has-[:checked]:bg-nile-50/40"
            >
              <input type="checkbox" name="preorderItemIds" value={item.id} className="ml-1 accent-nile-700" />
              <ItemThumb item={item} listingType={listingType} imageId={itemImageIds.get(item.id)?.[0]} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-forest-900">{item.name}</span>
              {item.priceMinor != null && (
                <span className="flex-none text-sm font-semibold text-ember">
                  {formatMinor(item.priceMinor)}
                  {item.priceUnit ?? ""}
                </span>
              )}
              <input
                type="number"
                name={`qty_${item.id}`}
                min={1}
                defaultValue={1}
                aria-label={`Quantity of ${item.name}`}
                className="w-14 flex-none rounded-md border border-forest-900/15 px-1.5 py-1 text-sm outline-none focus:border-forest-600"
              />
            </label>
          ))}
        </div>
      ))}
    </fieldset>
  );
}
