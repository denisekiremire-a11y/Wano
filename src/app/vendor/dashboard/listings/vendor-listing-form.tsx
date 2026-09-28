"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitListingAction } from "@/lib/actions/vendor-listing-actions";
import type { ActionState } from "@/lib/validation";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";

const initialState: ActionState = {};

type Journey = { id: string; name: string };

export function VendorListingForm({
  journeys,
  vendorSocials,
  existing,
}: {
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
    priceLabel: string;
    priceMinor: number | null;
    currency: string;
    priceUnit: string | null;
    externalBookingUrl: string | null;
    latitude: string | null;
    longitude: string | null;
    discountText: string;
    freebieText: string;
    journeyIds: string[];
    hotel?: { roomTypes: string | null; amenities: string | null; checkInTime: string | null; checkOutTime: string | null } | null;
    restaurant?: {
      cuisine: string | null;
      priceRange: string | null;
      hours: string | null;
      allowsPreorder: boolean;
    } | null;
    experience?: { durationText: string | null; groupSizeText: string | null; whatsIncluded: string | null } | null;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitListingAction, initialState);
  const [type, setType] = useState<ListingType>(existing?.type ?? "experience");
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      router.push("/vendor/dashboard/listings");
    }
    wasPending.current = pending;
  }, [pending, state, router]);

  return (
    <form action={formAction} className="space-y-4 border border-ink/10 bg-white p-5">
      {existing && <input type="hidden" name="listingId" value={existing.listingId} />}

      <div className="border border-ink/10 bg-ink/5 p-3 text-xs text-ink/70">
        {existing
          ? "Changes here go to the Wano team for review before they replace what's currently live."
          : "New listings go to the Wano team for review before they appear on Explore."}
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Listing type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ListingType)}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
        >
          {Object.entries(listingTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Title</label>
        <input
          name="title"
          required
          defaultValue={existing?.title}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Description</label>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={existing?.description}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-sm font-medium text-ink">Price label</label>
          <input
            name="priceLabel"
            placeholder="From"
            defaultValue={existing?.priceLabel ?? "From"}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Price (UGX)</label>
          <input
            name="priceMinor"
            type="number"
            min={0}
            step={1}
            required
            placeholder="670000"
            defaultValue={existing?.priceMinor ?? ""}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Price unit</label>
          <input
            name="priceUnit"
            placeholder="/night"
            defaultValue={existing?.priceUnit ?? ""}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Currency</label>
          <input
            name="currency"
            defaultValue={existing?.currency ?? "UGX"}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-ink">External booking URL (optional)</label>
        <input
          name="externalBookingUrl"
          type="url"
          placeholder="Leave blank for normal in-app booking"
          defaultValue={existing?.externalBookingUrl ?? ""}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-ink">Latitude</label>
          <input
            name="latitude"
            type="number"
            step="any"
            defaultValue={existing?.latitude ?? ""}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Longitude</label>
          <input
            name="longitude"
            type="number"
            step="any"
            defaultValue={existing?.longitude ?? ""}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      </div>

      {!existing && (
        <p className="text-xs text-ink/50">You can add photos once this listing is approved and live.</p>
      )}

      <div>
        <label className="text-sm font-medium text-ink">Journey tags (optional)</label>
        <div className="mt-1 flex flex-wrap gap-3">
          {journeys.map((j) => (
            <label key={j.id} className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="checkbox"
                name="journeyIds"
                value={j.id}
                defaultChecked={existing?.journeyIds.includes(j.id)}
                className="h-4 w-4 rounded border-ink/30"
              />
              {j.name}
            </label>
          ))}
        </div>
      </div>

      {type === "hotel" && (
        <div className="space-y-3 bg-ink/5 p-4">
          <p className="eyebrow text-ink/40">Hotel details</p>
          <input
            name="hotelRoomTypes"
            placeholder="Room types (e.g. Standard, Deluxe, Suite)"
            defaultValue={existing?.hotel?.roomTypes ?? ""}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <input
            name="hotelAmenities"
            placeholder="Amenities (e.g. Pool, spa, free breakfast)"
            defaultValue={existing?.hotel?.amenities ?? ""}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="hotelCheckIn"
              placeholder="Check-in (e.g. 2:00 PM)"
              defaultValue={existing?.hotel?.checkInTime ?? ""}
              className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
            <input
              name="hotelCheckOut"
              placeholder="Check-out (e.g. 11:00 AM)"
              defaultValue={existing?.hotel?.checkOutTime ?? ""}
              className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
        </div>
      )}

      {type === "restaurant" && (
        <div className="space-y-3 bg-ink/5 p-4">
          <p className="eyebrow text-ink/40">Restaurant details</p>
          <input
            name="restaurantCuisine"
            placeholder="Cuisine (e.g. Ugandan, Continental)"
            defaultValue={existing?.restaurant?.cuisine ?? ""}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="restaurantPriceRange"
              placeholder="Price range (e.g. Mid-range) — not shown publicly"
              defaultValue={existing?.restaurant?.priceRange ?? ""}
              className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
            <input
              name="restaurantHours"
              placeholder="Hours (e.g. 11am–11pm daily)"
              defaultValue={existing?.restaurant?.hours ?? ""}
              className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="restaurantAllowsPreorder"
              defaultChecked={existing?.restaurant?.allowsPreorder ?? false}
              className="h-4 w-4 rounded border-ink/30"
            />
            Allow menu pre-ordering
          </label>
        </div>
      )}

      {type === "experience" && (
        <div className="space-y-3 bg-ink/5 p-4">
          <p className="eyebrow text-ink/40">Experience details</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="experienceDuration"
              placeholder="Duration (e.g. Half-day)"
              defaultValue={existing?.experience?.durationText ?? ""}
              className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
            <input
              name="experienceGroupSize"
              placeholder="Group size (e.g. 2–8 people)"
              defaultValue={existing?.experience?.groupSizeText ?? ""}
              className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
          <input
            name="experienceIncluded"
            placeholder="What's included"
            defaultValue={existing?.experience?.whatsIncluded ?? ""}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      )}

      <div className="space-y-3 bg-ink/5 p-4">
        <p className="eyebrow text-ink/40">Business socials (shown on your partner profile)</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="instagramUrl"
            type="url"
            placeholder="Instagram URL"
            defaultValue={vendorSocials?.instagramUrl ?? ""}
            className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <input
            name="facebookUrl"
            type="url"
            placeholder="Facebook URL"
            defaultValue={vendorSocials?.facebookUrl ?? ""}
            className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <input
            name="tiktokUrl"
            type="url"
            placeholder="TikTok URL"
            defaultValue={vendorSocials?.tiktokUrl ?? ""}
            className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <input
            name="websiteUrl"
            type="url"
            placeholder="Website URL"
            defaultValue={vendorSocials?.websiteUrl ?? ""}
            className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      </div>

      <div className="space-y-3 bg-ember/5 p-4">
        <p className="eyebrow text-ember">Member offer</p>
        <input
          name="discountText"
          required
          placeholder="Discount text (e.g. 15% off stays of 2+ nights)"
          defaultValue={existing?.discountText ?? ""}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <input
          name="freebieText"
          placeholder="Freebie text (optional)"
          defaultValue={existing?.freebieText ?? ""}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Submitting…" : existing ? "Submit changes for review" : "Submit new listing for review"}
      </button>
    </form>
  );
}
