"use client";

import { useActionState, useState } from "react";
import { upsertVendorListingAction } from "@/lib/actions/admin-actions";
import type { ActionState } from "@/lib/validation";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";

const initialState: ActionState = {};

type Journey = { id: string; name: string };

export function ListingForm({
  vendorProfileId,
  journeys,
  vendorSocials,
  existing,
}: {
  vendorProfileId: string;
  journeys: Journey[];
  vendorSocials?: {
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
    websiteUrl: string | null;
  };
  existing?: {
    listingId: string;
    type: ListingType;
    title: string;
    description: string;
    priceHint: string;
    latitude: string | null;
    longitude: string | null;
    discountText: string;
    freebieText: string;
    journeyIds: string[];
    hotel?: { roomTypes: string | null; amenities: string | null; checkInTime: string | null; checkOutTime: string | null } | null;
    restaurant?: { cuisine: string | null; priceRange: string | null; hours: string | null } | null;
    experience?: { durationText: string | null; groupSizeText: string | null; whatsIncluded: string | null } | null;
  };
}) {
  const [state, formAction, pending] = useActionState(upsertVendorListingAction, initialState);
  const [type, setType] = useState<ListingType>(existing?.type ?? "experience");

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
      <input type="hidden" name="vendorProfileId" value={vendorProfileId} />
      {existing && <input type="hidden" name="listingId" value={existing.listingId} />}

      <h2 className="font-display text-lg font-semibold text-forest-900">
        {existing ? "Edit listing" : "Create listing"}
      </h2>

      <div>
        <label className="text-sm font-medium text-forest-900">Listing type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ListingType)}
          className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
        >
          {Object.entries(listingTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Title</label>
        <input
          name="title"
          required
          defaultValue={existing?.title}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Description</label>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={existing?.description}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="text-sm font-medium text-forest-900">Price hint</label>
          <input
            name="priceHint"
            required
            placeholder="From $120/night"
            defaultValue={existing?.priceHint}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Latitude</label>
          <input
            name="latitude"
            type="number"
            step="any"
            defaultValue={existing?.latitude ?? ""}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Longitude</label>
          <input
            name="longitude"
            type="number"
            step="any"
            defaultValue={existing?.longitude ?? ""}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Journey tags (optional)</label>
        <div className="mt-1 flex flex-wrap gap-3">
          {journeys.map((j) => (
            <label key={j.id} className="flex items-center gap-1.5 text-sm text-forest-800">
              <input
                type="checkbox"
                name="journeyIds"
                value={j.id}
                defaultChecked={existing?.journeyIds.includes(j.id)}
                className="h-4 w-4 rounded border-forest-900/30"
              />
              {j.name}
            </label>
          ))}
        </div>
      </div>

      {type === "hotel" && (
        <div className="space-y-3 rounded-xl bg-forest-50 p-4">
          <p className="text-xs font-medium text-forest-800/70">Hotel details</p>
          <input
            name="hotelRoomTypes"
            placeholder="Room types (e.g. Standard, Deluxe, Suite)"
            defaultValue={existing?.hotel?.roomTypes ?? ""}
            className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
          <input
            name="hotelAmenities"
            placeholder="Amenities (e.g. Pool, spa, free breakfast)"
            defaultValue={existing?.hotel?.amenities ?? ""}
            className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="hotelCheckIn"
              placeholder="Check-in (e.g. 2:00 PM)"
              defaultValue={existing?.hotel?.checkInTime ?? ""}
              className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
            <input
              name="hotelCheckOut"
              placeholder="Check-out (e.g. 11:00 AM)"
              defaultValue={existing?.hotel?.checkOutTime ?? ""}
              className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
        </div>
      )}

      {type === "restaurant" && (
        <div className="space-y-3 rounded-xl bg-forest-50 p-4">
          <p className="text-xs font-medium text-forest-800/70">Restaurant details</p>
          <input
            name="restaurantCuisine"
            placeholder="Cuisine (e.g. Ugandan, Continental)"
            defaultValue={existing?.restaurant?.cuisine ?? ""}
            className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="restaurantPriceRange"
              placeholder="Price range (e.g. $$)"
              defaultValue={existing?.restaurant?.priceRange ?? ""}
              className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
            <input
              name="restaurantHours"
              placeholder="Hours (e.g. 11am–11pm daily)"
              defaultValue={existing?.restaurant?.hours ?? ""}
              className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
        </div>
      )}

      {type === "experience" && (
        <div className="space-y-3 rounded-xl bg-forest-50 p-4">
          <p className="text-xs font-medium text-forest-800/70">Experience details</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="experienceDuration"
              placeholder="Duration (e.g. Half-day)"
              defaultValue={existing?.experience?.durationText ?? ""}
              className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
            <input
              name="experienceGroupSize"
              placeholder="Group size (e.g. 2–8 people)"
              defaultValue={existing?.experience?.groupSizeText ?? ""}
              className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <input
            name="experienceIncluded"
            placeholder="What's included"
            defaultValue={existing?.experience?.whatsIncluded ?? ""}
            className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      )}

      <div className="space-y-3 rounded-xl bg-forest-50 p-4">
        <p className="text-xs font-medium text-forest-800/70">
          Business socials (shown on their partner profile)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="instagramUrl"
            type="url"
            placeholder="Instagram URL"
            defaultValue={vendorSocials?.instagramUrl ?? ""}
            className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
          <input
            name="facebookUrl"
            type="url"
            placeholder="Facebook URL"
            defaultValue={vendorSocials?.facebookUrl ?? ""}
            className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
          <input
            name="tiktokUrl"
            type="url"
            placeholder="TikTok URL"
            defaultValue={vendorSocials?.tiktokUrl ?? ""}
            className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
          <input
            name="websiteUrl"
            type="url"
            placeholder="Website URL"
            defaultValue={vendorSocials?.websiteUrl ?? ""}
            className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-marigold-50 p-4">
        <p className="text-xs font-medium text-marigold-900">Member offer</p>
        <input
          name="discountText"
          required
          placeholder="Discount text (e.g. 15% off stays of 2+ nights)"
          defaultValue={existing?.discountText ?? ""}
          className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <input
          name="freebieText"
          placeholder="Freebie text (optional)"
          defaultValue={existing?.freebieText ?? ""}
          className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : existing ? "Save listing" : "Create listing"}
      </button>
    </form>
  );
}
