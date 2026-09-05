import { relations } from "drizzle-orm";
import {
  boolean,
  type AnyPgColumn,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const userRoleEnum = pgEnum("user_role", ["traveller", "vendor", "admin"]);
export const accreditationStatusEnum = pgEnum("accreditation_status", [
  "pending",
  "trusted",
  "rejected",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const challengeCompletionStatusEnum = pgEnum("challenge_completion_status", [
  "pending",
  "verified",
]);
export const listingTypeEnum = pgEnum("listing_type", [
  "hotel",
  "restaurant",
  "experience",
  "transport",
  "spa_salon",
]);
export const vendorDocTypeEnum = pgEnum("vendor_doc_type", [
  "business_registration",
  "owner_id",
  "tax_certificate",
  "other",
]);
export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "approved",
  "rejected",
]);
export const eventAttendanceStatusEnum = pgEnum("event_attendance_status", [
  "going",
  "interested",
  "maybe",
]);
export const travellerPersonaEnum = pgEnum("traveller_persona", ["newcomer", "tourist", "local"]);
export const journalStatusEnum = pgEnum("journal_status", ["draft", "scheduled", "published"]);
export const postStatusEnum = pgEnum("post_status", ["visible", "pending_review", "hidden", "removed"]);
export const postContextTypeEnum = pgEnum("post_context_type", [
  "listing",
  "event",
  "club",
  "journey",
  "perk",
  "journal_post",
]);
export const reportTargetTypeEnum = pgEnum("report_target_type", ["post", "comment", "user", "review"]);
export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "harassment",
  "inappropriate",
  "fake",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", ["open", "dismissed", "actioned"]);
export const moderationActionEnum = pgEnum("moderation_action", [
  "dismiss",
  "hide",
  "remove",
  "warn",
  "suspend",
]);
export const journeyKindEnum = pgEnum("journey_kind", ["editorial", "user", "creator"]);
export const journeyStatusEnum = pgEnum("journey_status", [
  "draft",
  "in_review",
  "published",
  "unlisted",
  "rejected",
]);
export const budgetBandEnum = pgEnum("budget_band", ["budget", "mid", "premium"]);
export const journeyStopTypeEnum = pgEnum("journey_stop_type", ["stay", "do", "eat", "move", "rest"]);
export const supplyLeadStatusEnum = pgEnum("supply_lead_status", [
  "open",
  "contacted",
  "listed",
  "dismissed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  username: text("username").unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  location: text("location"),
  // Set by a moderation "suspend" action — blocks login while set. Null =
  // not suspended.
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const travellerProfiles = pgTable("traveller_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  // Month/day is what matters for birthday perks; year is optional context.
  dateOfBirth: date("date_of_birth"),
  // Set during onboarding (see /onboarding) — drives Home feed personalization.
  persona: travellerPersonaEnum("persona"),
  city: text("city"),
  grandPrizeEntered: boolean("grand_prize_entered").notNull().default(false),
  // Settings > "Show my activity in the public feed" — suppresses this
  // traveller's review_posted / RSVP-derived feed items when off. Never
  // affects bookings, redemptions, saves, or search — those are never
  // surfaced regardless of this setting.
  showActivityInFeed: boolean("show_activity_in_feed").notNull().default(true),
  referralCode: text("referral_code").notNull().unique(),
  referredByTravellerId: uuid("referred_by_traveller_id").references(
    (): AnyPgColumn => travellerProfiles.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A journey is the atomic shareable/bookable unit — an ordered trip, not a
// single listing (see journeyStops). editorial ones are Wano's own 5
// campaign journeys; user/creator kinds (Milestone J phases 2-3) reuse the
// exact same shape, differing only in authorId, review gate, and byline.
export const journeys = pgTable("journeys", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  targetAudience: text("target_audience").notNull(),
  heroImage: text("hero_image").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  kind: journeyKindEnum("kind").notNull().default("editorial"),
  // Null for editorial journeys — set for a user's auto-drafted recap or a
  // creator's published journey (both post-launch phases).
  authorId: uuid("author_id").references(() => travellerProfiles.id, { onDelete: "set null" }),
  // Free-text on purpose (not a fixed enum) — Uganda-only today, ready to
  // cover the wider East Africa region without a schema change later.
  region: text("region"),
  city: text("city"),
  durationDays: integer("duration_days"),
  budgetBand: budgetBandEnum("budget_band"),
  // "What does this actually cost" — a journey can't publish without both
  // of these set (enforced in the admin action, not the DB, so a draft can
  // still be saved incomplete).
  estCostMinMinor: integer("est_cost_min_minor"),
  estCostMaxMinor: integer("est_cost_max_minor"),
  currency: text("currency").notNull().default("UGX"),
  bestSeason: text("best_season"),
  difficulty: text("difficulty"),
  status: journeyStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  viewCount: integer("view_count").notNull().default(0),
  bookingCount: integer("booking_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
});

// One ordered stop in a journey's itinerary. A stop with listingId/eventId
// renders a real booking CTA; a custom stop (customName set, no listing/
// event) is information-only and generates a supplyLeads row — a real
// place someone travelled to that Wano doesn't list yet.
export const journeyStops = pgTable("journey_stops", {
  id: uuid("id").primaryKey().defaultRandom(),
  journeyId: uuid("journey_id")
    .notNull()
    .references(() => journeys.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  eventId: uuid("event_id").references((): AnyPgColumn => events.id, { onDelete: "set null" }),
  customName: text("custom_name"),
  customAddress: text("custom_address"),
  customLat: numeric("custom_lat", { precision: 9, scale: 6 }),
  customLng: numeric("custom_lng", { precision: 9, scale: 6 }),
  note: text("note"),
  durationMinutes: integer("duration_minutes"),
  estCostMinor: integer("est_cost_minor"),
  stopType: journeyStopTypeEnum("stop_type").notNull().default("do"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journeySaves = pgTable(
  "journey_saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journeyId: uuid("journey_id")
      .notNull()
      .references(() => journeys.id, { onDelete: "cascade" }),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.journeyId, table.travellerId)],
);

export const journeyMedia = pgTable("journey_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  journeyId: uuid("journey_id")
    .notNull()
    .references(() => journeys.id, { onDelete: "cascade" }),
  storageRef: text("storage_ref").notNull(),
  caption: text("caption"),
  orderIndex: integer("order_index").notNull().default(0),
  credit: text("credit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A real place a traveller (or an admin curating a journey) referenced that
// Wano doesn't list yet — one of the better provider-acquisition channels:
// ops works this queue to recruit the vendor onto the platform.
export const supplyLeads = pgTable("supply_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  journeyStopId: uuid("journey_stop_id")
    .notNull()
    .references(() => journeyStops.id, { onDelete: "cascade" }),
  customName: text("custom_name").notNull(),
  customAddress: text("custom_address"),
  city: text("city"),
  status: supplyLeadStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A vendor's category now comes from what they list, not the account itself —
// a partner can operate a hotel, restaurant, experience, or transport service,
// and their listing(s) can tag zero or more of the 5 campaign journeys.
export const vendorProfiles = pgTable("vendor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  accreditationStatus: accreditationStatusEnum("accreditation_status")
    .notNull()
    .default("pending"),
  location: text("location").notNull(),
  contactPhone: text("contact_phone"),
  description: text("description").notNull(),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  tiktokUrl: text("tiktok_url"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorProfileId: uuid("vendor_profile_id")
    .notNull()
    .references(() => vendorProfiles.id, { onDelete: "cascade" }),
  type: listingTypeEnum("type").notNull().default("experience"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  // Price is structured, not a free-text string — no currency symbols or
  // floats stored. priceLabel is the lead phrase ("From", "Mains from");
  // priceUnit the trailing one ("/night", "/person", ""). The display
  // formatter (formatListingPrice) is the one place these combine into text.
  priceLabel: text("price_label").notNull().default("From"),
  priceMinor: integer("price_minor"),
  currency: text("currency").notNull().default("UGX"),
  priceUnit: text("price_unit"),
  // Set for a listing whose booking happens on the partner's own platform
  // (e.g. a ride-hailing partner) rather than through Wano — the booking
  // CTA becomes an outbound link to this URL instead of the internal
  // booking form. Null for every normal directly-bookable listing.
  externalBookingUrl: text("external_booking_url"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  active: boolean("active").notNull().default(true),
  // Platform-level publish gate, separate from the vendor's own active
  // toggle — see listingMeetsPublishBar. Defaults true; a listing missing
  // real content (description/price/location) is filtered out regardless
  // of this flag, and a deliberately incomplete one (see supply leads,
  // Milestone J) can be set false explicitly.
  isPublished: boolean("is_published").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A listing's photos — same bytea-in-Postgres approach as postImages, kept
// consistent rather than introducing a separate blob-storage dependency.
// sortOrder's first image (0) is the cover shown on cards/grids.
export const listingImages = pgTable("listing_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  mimeType: text("mime_type").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Many-to-many: a listing can tag any number of the 5 campaign journeys (or
// none at all, if it's a general discovery-only place with no journey tie-in).
export const listingJourneys = pgTable(
  "listing_journeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    journeyId: uuid("journey_id")
      .notNull()
      .references(() => journeys.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.listingId, table.journeyId)],
);

export const hotelDetails = pgTable("hotel_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .unique()
    .references(() => listings.id, { onDelete: "cascade" }),
  roomTypes: text("room_types"),
  amenities: text("amenities"),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
});

export const restaurantDetails = pgTable("restaurant_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .unique()
    .references(() => listings.id, { onDelete: "cascade" }),
  cuisine: text("cuisine"),
  priceRange: text("price_range"),
  hours: text("hours"),
  reservationsRequired: boolean("reservations_required").notNull().default(false),
});

export const experienceDetails = pgTable("experience_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .unique()
    .references(() => listings.id, { onDelete: "cascade" }),
  durationText: text("duration_text"),
  groupSizeText: text("group_size_text"),
  whatsIncluded: text("whats_included"),
});

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .unique()
    .references(() => listings.id, { onDelete: "cascade" }),
  discountText: text("discount_text").notNull(),
  freebieText: text("freebie_text"),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// KYC document submitted by a vendor during onboarding. A vendor can submit
// several (business registration, owner ID, tax certificate, ...); admin
// reviews each independently. Either an uploaded file (fileData + friends) or
// an external documentUrl is set — direct upload is the primary path, the
// link stays supported for anything already hosted elsewhere.
export const vendorDocuments = pgTable("vendor_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorProfileId: uuid("vendor_profile_id")
    .notNull()
    .references(() => vendorProfiles.id, { onDelete: "cascade" }),
  docType: vendorDocTypeEnum("doc_type").notNull(),
  documentUrl: text("document_url"),
  fileName: text("file_name"),
  fileMimeType: text("file_mime_type"),
  fileSize: integer("file_size"),
  fileData: bytea("file_data"),
  status: documentStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

// Append-only audit trail of every accreditation decision — vendorProfiles's
// own accreditationStatus only holds the *current* state.
export const accreditationReviews = pgTable("accreditation_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorProfileId: uuid("vendor_profile_id")
    .notNull()
    .references(() => vendorProfiles.id, { onDelete: "cascade" }),
  reviewerUserId: uuid("reviewer_user_id")
    .notNull()
    .references(() => users.id),
  decision: accreditationStatusEnum("decision").notNull(),
  notes: text("notes"),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
});

// Admin-managed perk independent of any single partner's own offer — either
// platform-wide (journeyId null) or scoped to travellers who hold one
// journey's stamp.
export const promoCodes = pgTable("promo_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  discountText: text("discount_text").notNull(),
  freebieText: text("freebie_text"),
  // Exactly one of journeyId/listingId set scopes the promo to that journey
  // or that specific place; both null means platform-wide (all members).
  journeyId: uuid("journey_id").references(() => journeys.id),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  // 5 days before this, the perk gets a perk_expiring feed item. Null means
  // it doesn't expire, so it never generates one.
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A Wano event: a concert, watch party, festival, workshop, etc. Members can
// mark attendance (Going / Interested / Maybe) via eventAttendance below.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  location: text("location").notNull(),
  organizerVendorProfileId: uuid("organizer_vendor_profile_id").references(
    () => vendorProfiles.id,
    { onDelete: "set null" },
  ),
  priceHint: text("price_hint"),
  capacity: integer("capacity"),
  active: boolean("active").notNull().default(true),
  // Set when this event *is* a club's recurring meetup rather than a
  // standalone event — clubs are not a parallel system, a meetup is just an
  // event with this set.
  clubId: uuid("club_id").references((): AnyPgColumn => clubs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  travellerId: uuid("traveller_id")
    .notNull()
    .references(() => travellerProfiles.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id),
  // Null when the listing wasn't booked in the context of any of the 5
  // journeys (e.g. a general nearby restaurant) — no stamp is awarded then.
  journeyId: uuid("journey_id").references(() => journeys.id),
  // Set when this booking is actually a reservation against an event rather
  // than a place — the same pending/confirmed/completed lifecycle applies.
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
  // Optional context a traveller can attach when requesting a booking — used
  // to check eligibility for a listing's birthday perk (see birthdayPerks).
  visitDate: date("visit_date"),
  partySize: integer("party_size"),
  status: bookingStatusEnum("status").notNull().default("pending"),
  bookingRef: text("booking_ref").notNull().unique(),
  estimatedCommission: numeric("estimated_commission", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A booking's own message thread — the traveller who made it, the vendor
// who owns the listing, and any admin can all post here. No separate
// thread table: a booking IS the thread, one per booking, identified by
// bookingId. senderUserId points at users directly (not travellerProfiles/
// vendorProfiles) since a sender could be any of the three roles.
export const bookingMessages = pgTable("booking_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stamps = pgTable(
  "stamps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    journeyId: uuid("journey_id")
      .notNull()
      .references(() => journeys.id),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.travellerId, table.journeyId)],
);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardText: text("reward_text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const challengeCompletions = pgTable(
  "challenge_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    status: challengeCompletionStatusEnum("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.travellerId, table.challengeId)],
);

// A traveller can review a listing once they've actually completed a
// booking there — one review per booking, not per traveller-listing pair,
// so re-booking the same place lets them leave a fresh review.
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  travellerId: uuid("traveller_id")
    .notNull()
    .references(() => travellerProfiles.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: "cascade" }),
  // Overall rating — kept independent of the category breakdown below so a
  // review always has a single headline score, even from before the
  // breakdown existed (those rows have null category ratings).
  rating: integer("rating").notNull(),
  safetyRating: integer("safety_rating"),
  reliabilityRating: integer("reliability_rating"),
  valueRating: integer("value_rating"),
  communicationRating: integer("communication_rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedListings = pgTable(
  "saved_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.travellerId, table.listingId)],
);

// In-app notification, shown via a bell icon. Stands in for real email
// delivery until an email provider is wired up.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tracks login attempts (by email) so repeated failures can be throttled.
export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Who Going/Interested/Maybe on an event — the "Who's Going?" feature.
export const eventAttendance = pgTable(
  "event_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    status: eventAttendanceStatusEnum("status").notNull(),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.eventId, table.travellerId)],
);

// Interest taxonomy used for onboarding + personalization (Home/Explore).
export const interests = pgTable("interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const travellerInterests = pgTable(
  "traveller_interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    interestId: uuid("interest_id")
      .notNull()
      .references(() => interests.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.travellerId, table.interestId)],
);

// Social graph — one row per follower→following relationship.
export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.followerId, table.followingId)],
);

// A social post — optionally about something (contextType/contextId, a
// polymorphic pointer resolved by type: listing/event/club/journey/perk/
// journal_post) and optionally addressed to a club instead of the public
// feed (audienceClubId). Context is "what it's about"; audience is "where
// it went" — a post can be about a club without being restricted to it, or
// restricted to a club without a topic tag at all.
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // Legacy — posts created before the real-upload composer stored an
    // externally-hosted URL here. New posts use postImages (bytea) instead.
    imageUrl: text("image_url"),
    contextType: postContextTypeEnum("context_type"),
    contextId: uuid("context_id"),
    // Null = public (the global feed). Set = visible only on that club's
    // page and in its members' feeds, never the global feed.
    audienceClubId: uuid("audience_club_id").references(() => clubs.id, { onDelete: "set null" }),
    // visible by default — createPostAction rejects profanity outright
    // rather than queuing it, so nothing sets pending_review anymore (the
    // value stays valid for old rows and the admin review UI, just unused
    // going forward). hidden = auto-hidden by report threshold; removed =
    // an admin took it down.
    status: postStatusEnum("status").notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("posts_context_idx").on(table.contextType, table.contextId)],
);

export const postImages = pgTable("post_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  mimeType: text("mime_type").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.postId, table.travellerId)],
);

export const postComments = pgTable("post_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  travellerId: uuid("traveller_id")
    .notNull()
    .references(() => travellerProfiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A member claiming a Wano Deal (promo code) — powers "My Deals".
export const dealClaims = pgTable(
  "deal_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    promoCodeId: uuid("promo_code_id")
      .notNull()
      .references(() => promoCodes.id, { onDelete: "cascade" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.travellerId, table.promoCodeId)],
);

// A venue-specific birthday perk — e.g. "10% off + a cake for a table of 2+
// on your birthday". Optionally tied to a specific recurring event (like a
// brunch series) rather than any visit. Eligibility is computed at booking
// time from the traveller's stored date of birth + the visitDate/partySize
// they entered on the booking; the venue grants it when they confirm.
export const birthdayPerks = pgTable("birthday_perks", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  minPartySize: integer("min_party_size").notNull().default(1),
  discountText: text("discount_text"),
  freebieText: text("freebie_text"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  travellerProfile: one(travellerProfiles, {
    fields: [users.id],
    references: [travellerProfiles.userId],
  }),
  vendorProfile: one(vendorProfiles, {
    fields: [users.id],
    references: [vendorProfiles.userId],
  }),
}));

export const travellerProfilesRelations = relations(travellerProfiles, ({ one, many }) => ({
  user: one(users, { fields: [travellerProfiles.userId], references: [users.id] }),
  bookings: many(bookings),
  stamps: many(stamps),
  challengeCompletions: many(challengeCompletions),
  reviews: many(reviews),
  savedListings: many(savedListings),
  referredBy: one(travellerProfiles, {
    fields: [travellerProfiles.referredByTravellerId],
    references: [travellerProfiles.id],
  }),
  interests: many(travellerInterests),
  posts: many(posts),
  eventAttendance: many(eventAttendance),
  dealClaims: many(dealClaims),
  clubMemberships: many(clubMemberships),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(vendorProfiles, {
    fields: [events.organizerVendorProfileId],
    references: [vendorProfiles.id],
  }),
  attendance: many(eventAttendance),
  bookings: many(bookings),
  posts: many(posts),
}));

export const eventAttendanceRelations = relations(eventAttendance, ({ one }) => ({
  event: one(events, { fields: [eventAttendance.eventId], references: [events.id] }),
  traveller: one(travellerProfiles, {
    fields: [eventAttendance.travellerId],
    references: [travellerProfiles.id],
  }),
}));

export const interestsRelations = relations(interests, ({ many }) => ({
  travellerInterests: many(travellerInterests),
  clubs: many(clubs),
}));

export const travellerInterestsRelations = relations(travellerInterests, ({ one }) => ({
  traveller: one(travellerProfiles, {
    fields: [travellerInterests.travellerId],
    references: [travellerProfiles.id],
  }),
  interest: one(interests, { fields: [travellerInterests.interestId], references: [interests.id] }),
}));

export const clubStatusEnum = pgEnum("club_status", ["pending", "approved", "rejected"]);

// Wano Clubs — a member-joinable community group, tagged to one interest
// category (so a category like "Food & Dining" can hold many distinct
// clubs, not just one). A vendor can submit a club from their dashboard
// (status starts "pending"); admin reviews it, or can create a club
// directly (status "approved" immediately). vendorProfileId is the
// optional "run by" partner — a club doesn't need to belong to any vendor.
export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  interestId: uuid("interest_id")
    .notNull()
    .references(() => interests.id, { onDelete: "restrict" }),
  vendorProfileId: uuid("vendor_profile_id").references(() => vendorProfiles.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  // The named human running the club — required before a club can be
  // published (status "approved"). Nullable because an application
  // submitted through the "Start a club" form may not name an existing
  // Wano user yet.
  hostUserId: uuid("host_user_id").references(() => users.id, { onDelete: "set null" }),
  coverImage: text("cover_image"),
  city: text("city"),
  cadence: text("cadence"),
  whatsappInviteUrl: text("whatsapp_invite_url"),
  // Free-text contact info collected on the "Start a club" application
  // form, for when the applicant isn't (yet) a Wano host account.
  applicantContact: text("applicant_contact"),
  status: clubStatusEnum("status").notNull().default("pending"),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Separate from travellerInterests (personalization signal set at
// onboarding) since joining a club is an explicit action that shouldn't
// silently change Home feed personalization.
export const clubMemberships = pgTable(
  "club_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.travellerId, table.clubId)],
);

export const clubsRelations = relations(clubs, ({ one, many }) => ({
  interest: one(interests, { fields: [clubs.interestId], references: [interests.id] }),
  vendorProfile: one(vendorProfiles, { fields: [clubs.vendorProfileId], references: [vendorProfiles.id] }),
  createdBy: one(users, { fields: [clubs.createdByUserId], references: [users.id] }),
  reviewedBy: one(users, { fields: [clubs.reviewedByUserId], references: [users.id] }),
  memberships: many(clubMemberships),
  posts: many(posts),
}));

export const clubMembershipsRelations = relations(clubMemberships, ({ one }) => ({
  traveller: one(travellerProfiles, {
    fields: [clubMemberships.travellerId],
    references: [travellerProfiles.id],
  }),
  club: one(clubs, { fields: [clubMemberships.clubId], references: [clubs.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(travellerProfiles, {
    fields: [follows.followerId],
    references: [travellerProfiles.id],
  }),
  following: one(travellerProfiles, {
    fields: [follows.followingId],
    references: [travellerProfiles.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  traveller: one(travellerProfiles, { fields: [posts.travellerId], references: [travellerProfiles.id] }),
  audienceClub: one(clubs, { fields: [posts.audienceClubId], references: [clubs.id] }),
  likes: many(postLikes),
  comments: many(postComments),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, { fields: [postLikes.postId], references: [posts.id] }),
  traveller: one(travellerProfiles, { fields: [postLikes.travellerId], references: [travellerProfiles.id] }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(posts, { fields: [postComments.postId], references: [posts.id] }),
  traveller: one(travellerProfiles, {
    fields: [postComments.travellerId],
    references: [travellerProfiles.id],
  }),
}));

export const dealClaimsRelations = relations(dealClaims, ({ one }) => ({
  traveller: one(travellerProfiles, { fields: [dealClaims.travellerId], references: [travellerProfiles.id] }),
  promoCode: one(promoCodes, { fields: [dealClaims.promoCodeId], references: [promoCodes.id] }),
}));

// Lightweight product-analytics log — deliberately just a table, not a
// third-party SDK, consistent with this app's no-external-services default.
// userId/role are nullable since some events (search, listing_viewed) can
// fire for signed-out visitors.
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventName: text("event_name").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  role: text("role"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const birthdayPerksRelations = relations(birthdayPerks, ({ one }) => ({
  listing: one(listings, { fields: [birthdayPerks.listingId], references: [listings.id] }),
  event: one(events, { fields: [birthdayPerks.eventId], references: [events.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  listing: one(listings, { fields: [reviews.listingId], references: [listings.id] }),
  traveller: one(travellerProfiles, { fields: [reviews.travellerId], references: [travellerProfiles.id] }),
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
}));

export const savedListingsRelations = relations(savedListings, ({ one }) => ({
  traveller: one(travellerProfiles, {
    fields: [savedListings.travellerId],
    references: [travellerProfiles.id],
  }),
  listing: one(listings, { fields: [savedListings.listingId], references: [listings.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const vendorProfilesRelations = relations(vendorProfiles, ({ one, many }) => ({
  user: one(users, { fields: [vendorProfiles.userId], references: [users.id] }),
  listings: many(listings),
  documents: many(vendorDocuments),
  accreditationReviews: many(accreditationReviews),
  clubs: many(clubs),
}));

export const journeysRelations = relations(journeys, ({ many }) => ({
  listingJourneys: many(listingJourneys),
  bookings: many(bookings),
  stamps: many(stamps),
  promoCodes: many(promoCodes),
  stops: many(journeyStops),
  saves: many(journeySaves),
  media: many(journeyMedia),
}));

export const journeyStopsRelations = relations(journeyStops, ({ one, many }) => ({
  journey: one(journeys, { fields: [journeyStops.journeyId], references: [journeys.id] }),
  listing: one(listings, { fields: [journeyStops.listingId], references: [listings.id] }),
  supplyLeads: many(supplyLeads),
}));

export const journeySavesRelations = relations(journeySaves, ({ one }) => ({
  journey: one(journeys, { fields: [journeySaves.journeyId], references: [journeys.id] }),
  traveller: one(travellerProfiles, { fields: [journeySaves.travellerId], references: [travellerProfiles.id] }),
}));

export const supplyLeadsRelations = relations(supplyLeads, ({ one }) => ({
  journeyStop: one(journeyStops, { fields: [supplyLeads.journeyStopId], references: [journeyStops.id] }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [listings.vendorProfileId],
    references: [vendorProfiles.id],
  }),
  journeyTags: many(listingJourneys),
  offer: one(offers, { fields: [listings.id], references: [offers.listingId] }),
  hotelDetails: one(hotelDetails, { fields: [listings.id], references: [hotelDetails.listingId] }),
  restaurantDetails: one(restaurantDetails, {
    fields: [listings.id],
    references: [restaurantDetails.listingId],
  }),
  experienceDetails: one(experienceDetails, {
    fields: [listings.id],
    references: [experienceDetails.listingId],
  }),
  birthdayPerks: many(birthdayPerks),
}));

export const listingJourneysRelations = relations(listingJourneys, ({ one }) => ({
  listing: one(listings, { fields: [listingJourneys.listingId], references: [listings.id] }),
  journey: one(journeys, { fields: [listingJourneys.journeyId], references: [journeys.id] }),
}));

export const hotelDetailsRelations = relations(hotelDetails, ({ one }) => ({
  listing: one(listings, { fields: [hotelDetails.listingId], references: [listings.id] }),
}));

export const restaurantDetailsRelations = relations(restaurantDetails, ({ one }) => ({
  listing: one(listings, { fields: [restaurantDetails.listingId], references: [listings.id] }),
}));

export const experienceDetailsRelations = relations(experienceDetails, ({ one }) => ({
  listing: one(listings, { fields: [experienceDetails.listingId], references: [listings.id] }),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  listing: one(listings, { fields: [offers.listingId], references: [listings.id] }),
}));

// Audit trail for every fetch of a vendor's sensitive KYC document bytes —
// who (or "anonymous" if the request had no session, which the route
// rejects before it gets here, so this is really always a real user) viewed
// which document and when. Written by the /api/vendor-documents/[id] route.
export const documentAccessLogs = pgTable("document_access_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => vendorDocuments.id, { onDelete: "cascade" }),
  accessedByUserId: uuid("accessed_by_user_id")
    .notNull()
    .references(() => users.id),
  accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorDocumentsRelations = relations(vendorDocuments, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [vendorDocuments.vendorProfileId],
    references: [vendorProfiles.id],
  }),
  reviewedBy: one(users, { fields: [vendorDocuments.reviewedByUserId], references: [users.id] }),
}));

export const accreditationReviewsRelations = relations(accreditationReviews, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [accreditationReviews.vendorProfileId],
    references: [vendorProfiles.id],
  }),
  reviewer: one(users, { fields: [accreditationReviews.reviewerUserId], references: [users.id] }),
}));

export const promoCodesRelations = relations(promoCodes, ({ one }) => ({
  journey: one(journeys, { fields: [promoCodes.journeyId], references: [journeys.id] }),
  listing: one(listings, { fields: [promoCodes.listingId], references: [listings.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  traveller: one(travellerProfiles, {
    fields: [bookings.travellerId],
    references: [travellerProfiles.id],
  }),
  listing: one(listings, { fields: [bookings.listingId], references: [listings.id] }),
  journey: one(journeys, { fields: [bookings.journeyId], references: [journeys.id] }),
  event: one(events, { fields: [bookings.eventId], references: [events.id] }),
}));

export const stampsRelations = relations(stamps, ({ one }) => ({
  traveller: one(travellerProfiles, {
    fields: [stamps.travellerId],
    references: [travellerProfiles.id],
  }),
  journey: one(journeys, { fields: [stamps.journeyId], references: [journeys.id] }),
  booking: one(bookings, { fields: [stamps.bookingId], references: [bookings.id] }),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  completions: many(challengeCompletions),
}));

export const challengeCompletionsRelations = relations(challengeCompletions, ({ one }) => ({
  traveller: one(travellerProfiles, {
    fields: [challengeCompletions.travellerId],
    references: [travellerProfiles.id],
  }),
  challenge: one(challenges, {
    fields: [challengeCompletions.challengeId],
    references: [challenges.id],
  }),
}));

export const feedItemTypeEnum = pgEnum("feed_item_type", [
  "place_added",
  "review_posted",
  "event_upcoming",
  "event_momentum",
  "perk_added",
  "perk_expiring",
  "journal_published",
  "club_meetup",
  "user_post",
]);

// The Social feed is generated, not authored — most rows here come from a
// server action at write time (place_added, review_posted, perk_added,
// user_post) or the /api/cron/feed job for time-crossing conditions
// (event_upcoming, event_momentum, perk_expiring). dedupeKey makes both
// paths idempotent: "type:entityId" for one-shot items, "type:entityId:n"
// for the RSVP-threshold flavor of event_momentum.
//
// payload is a denormalized display snapshot (title/subtitle/image/href)
// taken at generation time — the feed renders from it directly rather than
// joining back to the source row on every read. It can go stale if the
// source is edited after the fact; that's an accepted v1 tradeoff.
export const feedItems = pgTable("feed_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: feedItemTypeEnum("type").notNull(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  // The traveller whose action generated this item, if any — used to apply
  // the "show my activity in the public feed" suppression and the
  // "authored by someone I follow" affinity boost. Null for
  // platform-generated items (place_added, event_upcoming, perk_added, ...).
  subjectTravellerId: uuid("subject_traveller_id").references(() => travellerProfiles.id, {
    onDelete: "cascade",
  }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
  clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  // user_post items only — a real FK (not just payload.postId) so a
  // deleted post's feed item is cleaned up automatically instead of
  // lingering as a dead row filtered out on every read forever.
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  // journal_published items only — same reasoning as postId above.
  journalPostId: uuid("journal_post_id").references((): AnyPgColumn => journalPosts.id, {
    onDelete: "cascade",
  }),
  // Denormalized from the vendor/event location at generation time, for the
  // "same city" affinity boost without a join.
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedItemsRelations = relations(feedItems, ({ one }) => ({
  subjectTraveller: one(travellerProfiles, {
    fields: [feedItems.subjectTravellerId],
    references: [travellerProfiles.id],
  }),
  listing: one(listings, { fields: [feedItems.listingId], references: [listings.id] }),
  event: one(events, { fields: [feedItems.eventId], references: [events.id] }),
  club: one(clubs, { fields: [feedItems.clubId], references: [clubs.id] }),
  post: one(posts, { fields: [feedItems.postId], references: [posts.id] }),
}));

// The Journal — Wano's blog. Public and indexed; the primary organic
// acquisition channel. Authored entirely through the admin console
// (markdown body, no MDX files in the repo) so publishing never needs a
// deploy.
export const journalPosts = pgTable("journal_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  coverImage: text("cover_image"),
  authorUserId: uuid("author_user_id")
    .notNull()
    .references(() => users.id),
  category: text("category").notNull(),
  tags: text("tags").array().notNull().default([]),
  status: journalStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogImage: text("og_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Newsletter capture — double opt-in. A signup is unconfirmed until the
// confirm link (sent via sendEmail, currently a console-logging stub — see
// src/lib/email.ts) is clicked.
export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  source: text("source").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
  confirmToken: text("confirm_token").notNull().unique(),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

// target_id is polymorphic (a post/comment/user/review id depending on
// target_type) so it's deliberately not a foreign key — the same pattern
// moderation_actions below uses.
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => travellerProfiles.id, { onDelete: "cascade" }),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: reportReasonEnum("reason").notNull(),
  note: text("note"),
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.blockerId, table.blockedId)],
);

// A private 1:1 thread between two travellers. travellerOneId is always
// whichever of the pair's UUIDs sorts first (enforced by the app, not the
// db) — that canonical ordering lets the unique index dedupe a
// conversation regardless of who messaged first, with no separate
// participants table.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travellerOneId: uuid("traveller_one_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    travellerTwoId: uuid("traveller_two_id")
      .notNull()
      .references(() => travellerProfiles.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.travellerOneId, table.travellerTwoId)],
);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderTravellerId: uuid("sender_traveller_id")
    .notNull()
    .references(() => travellerProfiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only audit log of every moderation decision.
export const moderationActions = pgTable("moderation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  action: moderationActionEnum("action").notNull(),
  reason: text("reason"),
  performedByUserId: uuid("performed_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
