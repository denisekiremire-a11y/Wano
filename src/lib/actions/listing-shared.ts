import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  charityDetails,
  experienceDetails,
  hotelDetails,
  listingJourneys,
  listings,
  offers,
  restaurantDetails,
  vendorProfiles,
} from "@/db/schema";
import type { Tx } from "@/lib/db-context";
import { generatePlaceAddedItem } from "@/lib/feed-generators";
import { CHARITY_AGREEMENT_VERSION } from "@/lib/charity-config";

// Shared by the admin's direct-edit form (applies immediately) and the
// vendor-submission approval flow (applies once an admin approves the
// vendor's proposed payload) — same field set either way, so both paths
// stay in sync instead of drifting apart.
export const listingContentSchema = z
  .object({
    type: z.enum([
      "hotel",
      "restaurant",
      "experience",
      "transport",
      "spa_salon",
      "attraction",
      "event",
      "rental",
      "charity",
    ]),
    title: z.string().min(2).max(150),
    description: z.string().min(10).max(1000),
    priceLabel: z.string().max(30).optional().or(z.literal("")),
    // Charities have no price (coerces an omitted/null field to 0 fine,
    // and applyListingContent never shows it for type "charity" anyway).
    priceMinor: z.coerce.number().int().min(0),
    currency: z.string().min(1).max(10).optional().or(z.literal("")),
    priceUnit: z.string().max(20).optional().or(z.literal("")),
    externalBookingUrl: z.string().url().max(300).optional().or(z.literal("")),
    latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
    longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
    journeyIds: z.array(z.string().uuid()).default([]),
    // Not required at the schema level (a charity has no "member offer")
    // — required for every other type via superRefine below instead, same
    // place the charity-field requirements are enforced.
    discountText: z.string().max(200).optional().or(z.literal("")),
    freebieText: z.string().max(200).optional().or(z.literal("")),
    hotelRoomTypes: z.string().max(300).optional().or(z.literal("")),
    hotelAmenities: z.string().max(300).optional().or(z.literal("")),
    hotelCheckIn: z.string().max(20).optional().or(z.literal("")),
    hotelCheckOut: z.string().max(20).optional().or(z.literal("")),
    restaurantCuisine: z.string().max(100).optional().or(z.literal("")),
    restaurantPriceRange: z.string().max(20).optional().or(z.literal("")),
    restaurantHours: z.string().max(100).optional().or(z.literal("")),
    // Gates whether the booking form offers a menu pre-order step — see
    // restaurantDetails.allowsPreorder.
    restaurantAllowsPreorder: z.boolean().optional().default(false),
    experienceDuration: z.string().max(60).optional().or(z.literal("")),
    experienceGroupSize: z.string().max(60).optional().or(z.literal("")),
    experienceIncluded: z.string().max(300).optional().or(z.literal("")),
    instagramUrl: z.string().url().max(300).optional().or(z.literal("")),
    facebookUrl: z.string().url().max(300).optional().or(z.literal("")),
    tiktokUrl: z.string().url().max(300).optional().or(z.literal("")),
    websiteUrl: z.string().url().max(300).optional().or(z.literal("")),
    // One perk per line, free text (late checkout, airport pickup) — split
    // into listings.wanoOnlyExtras in applyListingContent below.
    wanoOnlyExtras: z.string().max(2000).optional().or(z.literal("")),
    charityLegalName: z.string().max(150).optional().or(z.literal("")),
    charityOrgType: z.string().max(50).optional().or(z.literal("")),
    charityRegistrationNumber: z.string().max(100).optional().or(z.literal("")),
    charityContactName: z.string().max(100).optional().or(z.literal("")),
    charityContactRole: z.string().max(100).optional().or(z.literal("")),
    charityContactPhone: z.string().max(30).optional().or(z.literal("")),
    charityMissionStatement: z.string().max(1000).optional().or(z.literal("")),
    charityFocusArea: z.string().max(50).optional().or(z.literal("")),
    charityPayoutAccountDetail: z.string().max(200).optional().or(z.literal("")),
    // Only meaningful (and only required) on first creation — an edit to
    // an existing charity listing doesn't re-show the checkbox, see
    // applyListingContent's "only set agreementAcceptedAt once" handling.
    charityAgreementAccepted: z.boolean().optional().default(false),
  })
  .superRefine((d, ctx) => {
    if (d.type === "charity") {
      const required: [string | undefined, string][] = [
        [d.charityLegalName, "Legal name is required."],
        [d.charityOrgType, "Organisation type is required."],
        [d.charityRegistrationNumber, "Registration number is required."],
        [d.charityContactName, "Contact person name is required."],
        [d.charityContactRole, "Contact person role is required."],
        [d.charityContactPhone, "Contact person phone is required."],
        [d.charityMissionStatement, "Mission statement is required."],
        [d.charityFocusArea, "Focus area is required."],
        [d.charityPayoutAccountDetail, "A mobile money number or merchant code is required."],
      ];
      for (const [value, message] of required) {
        if (!value) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
      // Required on every charity submission, not just the first — the
      // form always submits it checked (disabled/pre-checked, "accepted
      // on [date]") once a charity already has one on file, so this never
      // actually blocks an edit in practice; it just closes the gap where
      // a tampered or missing field would otherwise create/keep a charity
      // listing with no agreement on record.
      if (!d.charityAgreementAccepted) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You must accept the charity vendor agreement.",
          path: ["charityAgreementAccepted"],
        });
      }
    } else if (!d.discountText) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Discount text is required.", path: ["discountText"] });
    }
  });

export type ListingContent = z.infer<typeof listingContentSchema>;

export function parseListingContentFromFormData(formData: FormData) {
  return listingContentSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    priceLabel: formData.get("priceLabel") ?? "",
    priceMinor: formData.get("priceMinor"),
    currency: formData.get("currency") ?? "",
    priceUnit: formData.get("priceUnit") ?? "",
    externalBookingUrl: formData.get("externalBookingUrl") ?? "",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
    journeyIds: formData.getAll("journeyIds"),
    discountText: formData.get("discountText") ?? "",
    freebieText: formData.get("freebieText") ?? "",
    hotelRoomTypes: formData.get("hotelRoomTypes") ?? "",
    hotelAmenities: formData.get("hotelAmenities") ?? "",
    hotelCheckIn: formData.get("hotelCheckIn") ?? "",
    hotelCheckOut: formData.get("hotelCheckOut") ?? "",
    restaurantCuisine: formData.get("restaurantCuisine") ?? "",
    restaurantPriceRange: formData.get("restaurantPriceRange") ?? "",
    restaurantHours: formData.get("restaurantHours") ?? "",
    restaurantAllowsPreorder: formData.get("restaurantAllowsPreorder") === "on",
    experienceDuration: formData.get("experienceDuration") ?? "",
    experienceGroupSize: formData.get("experienceGroupSize") ?? "",
    experienceIncluded: formData.get("experienceIncluded") ?? "",
    instagramUrl: formData.get("instagramUrl") ?? "",
    facebookUrl: formData.get("facebookUrl") ?? "",
    tiktokUrl: formData.get("tiktokUrl") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    wanoOnlyExtras: formData.get("wanoOnlyExtras") ?? "",
    charityLegalName: formData.get("charityLegalName") ?? "",
    charityOrgType: formData.get("charityOrgType") ?? "",
    charityRegistrationNumber: formData.get("charityRegistrationNumber") ?? "",
    charityContactName: formData.get("charityContactName") ?? "",
    charityContactRole: formData.get("charityContactRole") ?? "",
    charityContactPhone: formData.get("charityContactPhone") ?? "",
    charityMissionStatement: formData.get("charityMissionStatement") ?? "",
    charityFocusArea: formData.get("charityFocusArea") ?? "",
    charityPayoutAccountDetail: formData.get("charityPayoutAccountDetail") ?? "",
    charityAgreementAccepted: formData.get("charityAgreementAccepted") === "on",
  });
}

function parseWanoOnlyExtras(raw: string): string[] | null {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

/** Creates or updates a listing (plus its journey tags, offer, and
 * type-specific detail row) from approved content. Returns the listing id.
 * Never touches isPublished/active — those are the platform gate and the
 * vendor's own pause switch respectively, orthogonal to content moderation.
 *
 * Always called from an admin action (direct edit or submission approval)
 * — takes the caller's RLS transaction (see withRlsContext) rather than
 * the bare db client, since it writes to listings, which is RLS-protected
 * and requires app.role='admin' to be set on the same transaction. */
export async function applyListingContent(
  tx: Tx,
  listingId: string | null,
  vendorProfileId: string,
  d: ListingContent,
): Promise<string> {
  const listingValues = {
    vendorProfileId,
    type: d.type,
    title: d.title,
    description: d.description,
    priceLabel: d.priceLabel || "From",
    priceMinor: d.priceMinor,
    currency: d.currency || "UGX",
    priceUnit: d.priceUnit || null,
    externalBookingUrl: d.externalBookingUrl || null,
    latitude: d.latitude === "" || d.latitude === undefined ? null : String(d.latitude),
    longitude: d.longitude === "" || d.longitude === undefined ? null : String(d.longitude),
    wanoOnlyExtras: parseWanoOnlyExtras(d.wanoOnlyExtras || ""),
  };

  let id = listingId;
  if (id) {
    await tx.update(listings).set(listingValues).where(eq(listings.id, id));
  } else {
    const [created] = await tx.insert(listings).values(listingValues).returning();
    id = created.id;
    // No-ops if the vendor isn't trusted yet — setAccreditationStatusAction
    // backfills this listing once they are.
    await generatePlaceAddedItem(id);
  }

  await tx.delete(listingJourneys).where(eq(listingJourneys.listingId, id));
  if (d.journeyIds.length > 0) {
    await tx.insert(listingJourneys).values(d.journeyIds.map((journeyId) => ({ listingId: id!, journeyId })));
  }

  // A charity has no "member offer" concept at all — skip offers entirely
  // rather than writing an empty discountText (which the schema no longer
  // even requires for this type).
  if (d.type !== "charity") {
    const [existingOffer] = await tx.select().from(offers).where(eq(offers.listingId, id)).limit(1);
    if (existingOffer) {
      await tx
        .update(offers)
        .set({ discountText: d.discountText || "", freebieText: d.freebieText || null, updatedAt: new Date() })
        .where(eq(offers.listingId, id));
    } else {
      await tx.insert(offers).values({ listingId: id, discountText: d.discountText || "", freebieText: d.freebieText || null });
    }
  }

  if (d.type === "hotel") {
    const values = {
      roomTypes: d.hotelRoomTypes || null,
      amenities: d.hotelAmenities || null,
      checkInTime: d.hotelCheckIn || null,
      checkOutTime: d.hotelCheckOut || null,
    };
    const [existing] = await tx.select().from(hotelDetails).where(eq(hotelDetails.listingId, id)).limit(1);
    if (existing) await tx.update(hotelDetails).set(values).where(eq(hotelDetails.listingId, id));
    else await tx.insert(hotelDetails).values({ listingId: id, ...values });
  } else if (d.type === "restaurant") {
    const values = {
      cuisine: d.restaurantCuisine || null,
      priceRange: d.restaurantPriceRange || null,
      hours: d.restaurantHours || null,
      allowsPreorder: d.restaurantAllowsPreorder ?? false,
    };
    const [existing] = await tx.select().from(restaurantDetails).where(eq(restaurantDetails.listingId, id)).limit(1);
    if (existing) await tx.update(restaurantDetails).set(values).where(eq(restaurantDetails.listingId, id));
    else await tx.insert(restaurantDetails).values({ listingId: id, ...values });
  } else if (d.type === "experience") {
    const values = {
      durationText: d.experienceDuration || null,
      groupSizeText: d.experienceGroupSize || null,
      whatsIncluded: d.experienceIncluded || null,
    };
    const [existing] = await tx.select().from(experienceDetails).where(eq(experienceDetails.listingId, id)).limit(1);
    if (existing) await tx.update(experienceDetails).set(values).where(eq(experienceDetails.listingId, id));
    else await tx.insert(experienceDetails).values({ listingId: id, ...values });
  } else if (d.type === "charity") {
    const values = {
      legalName: d.charityLegalName || "",
      orgType: d.charityOrgType || "",
      registrationNumber: d.charityRegistrationNumber || "",
      contactPersonName: d.charityContactName || "",
      contactPersonRole: d.charityContactRole || "",
      contactPersonPhone: d.charityContactPhone || "",
      missionStatement: d.charityMissionStatement || "",
      focusArea: d.charityFocusArea || "",
      payoutAccountDetail: d.charityPayoutAccountDetail || "",
    };
    const [existing] = await tx.select().from(charityDetails).where(eq(charityDetails.listingId, id)).limit(1);
    if (existing) {
      // Editing never re-dates the agreement — it was accepted once, at
      // creation, and an edit to (say) the mission statement doesn't mean
      // accepting it again. The checkbox only matters the one time this
      // branch creates the row, below.
      await tx.update(charityDetails).set(values).where(eq(charityDetails.listingId, id));
    } else {
      await tx.insert(charityDetails).values({
        listingId: id,
        ...values,
        agreementAcceptedAt: new Date(),
        agreementVersion: CHARITY_AGREEMENT_VERSION,
      });
    }
  }

  return id;
}

/** The vendor's own social links live on vendorProfiles, not the listing —
 * bundled into the same submission payload as a convenience since the
 * vendor-facing form edits them together, but applied separately. Takes
 * the caller's RLS transaction for the same reason as applyListingContent. */
export async function applyVendorSocialLinks(tx: Tx, vendorProfileId: string, d: ListingContent) {
  await tx
    .update(vendorProfiles)
    .set({
      instagramUrl: d.instagramUrl || null,
      facebookUrl: d.facebookUrl || null,
      tiktokUrl: d.tiktokUrl || null,
      websiteUrl: d.websiteUrl || null,
    })
    .where(eq(vendorProfiles.id, vendorProfileId));
}
