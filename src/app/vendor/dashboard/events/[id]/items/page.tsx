import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events } from "@/db/schema";
import { formatMinor } from "@/lib/currency";
import { getEventItems, getListingItemImageIds } from "@/lib/data/listing-items";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { DeleteItemButton } from "@/app/vendor/dashboard/listings/[id]/items/delete-item-button";
import { VendorItemPhotoManager } from "@/app/vendor/dashboard/listings/[id]/items/vendor-item-photo-manager";
import { VendorEventItemForm } from "./vendor-event-item-form";

export default async function VendorEventItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event || event.organizerVendorProfileId !== vendorProfile.id) notFound();

  const items = await getEventItems(event.id);
  const imageIdsByItem = await getListingItemImageIds(items.map((item) => item.id));
  const editingItem = edit ? items.find((item) => item.id === edit) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/events/${event.id}`} className="eyebrow text-ink/40 hover:text-ink">
          ← Back to {event.title}
        </Link>
        <h1 className="mt-2 font-serif-editorial text-2xl text-ink">Manage Tickets</h1>
        <p className="mt-1 text-sm text-ink/60">
          These show on your event page — add, edit, or remove them any time, no review needed.
        </p>
      </div>

      {items.length > 0 && (
        <section className="space-y-3">
          {items.map((item) => {
            const imageIds = imageIdsByItem.get(item.id) ?? [];
            const priceText = item.priceMinor != null ? `${formatMinor(item.priceMinor)}${item.priceUnit ?? ""}` : null;

            return (
              <div key={item.id} className="flex items-start gap-4 border border-ink/10 bg-white p-4">
                {imageIds[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/listing-item-images/${imageIds[0]}`}
                    alt=""
                    className="h-16 w-16 flex-none border border-ink/10 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 flex-none bg-ink/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{item.name}</p>
                  {item.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink/60">{item.description}</p>}
                  <p className="font-mono-data mt-1 text-sm font-medium text-ember">{priceText ?? "No price set"}</p>
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <Link
                    href={`/vendor/dashboard/events/${event.id}/items?edit=${item.id}`}
                    className="text-sm font-medium text-ember hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteItemButton itemId={item.id} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">
          {editingItem ? `Edit ${editingItem.name}` : "Add a ticket tier"}
        </h2>
        <VendorEventItemForm key={editingItem?.id ?? "new"} eventId={event.id} existing={editingItem} />
        {editingItem && (
          <div className="mt-4 border-t border-ink/10 pt-4">
            <VendorItemPhotoManager itemId={editingItem.id} existingImages={imageIdsByItem.get(editingItem.id) ?? []} />
          </div>
        )}
      </section>
    </div>
  );
}
