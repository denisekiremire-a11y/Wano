import { relations } from "drizzle-orm";
import {
  boolean,
  type AnyPgColumn,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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
  grandPrizeEntered: boolean("grand_prize_entered").notNull().default(false),
  referralCode: text("referral_code").notNull().unique(),
  referredByTravellerId: uuid("referred_by_traveller_id").references(
    (): AnyPgColumn => travellerProfiles.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  priceHint: text("price_hint").notNull(),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  active: boolean("active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
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
// reviews each independently.
export const vendorDocuments = pgTable("vendor_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorProfileId: uuid("vendor_profile_id")
    .notNull()
    .references(() => vendorProfiles.id, { onDelete: "cascade" }),
  docType: vendorDocTypeEnum("doc_type").notNull(),
  documentUrl: text("document_url").notNull(),
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
  rating: integer("rating").notNull(),
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

// A social post — optionally tagged to a place or an event, which is how
// user-generated content links back into Wano's discovery surfaces.
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  travellerId: uuid("traveller_id")
    .notNull()
    .references(() => travellerProfiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
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
}));

export const travellerInterestsRelations = relations(travellerInterests, ({ one }) => ({
  traveller: one(travellerProfiles, {
    fields: [travellerInterests.travellerId],
    references: [travellerProfiles.id],
  }),
  interest: one(interests, { fields: [travellerInterests.interestId], references: [interests.id] }),
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
  listing: one(listings, { fields: [posts.listingId], references: [listings.id] }),
  event: one(events, { fields: [posts.eventId], references: [events.id] }),
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
}));

export const journeysRelations = relations(journeys, ({ many }) => ({
  listingJourneys: many(listingJourneys),
  bookings: many(bookings),
  stamps: many(stamps),
  promoCodes: many(promoCodes),
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
