"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookingMessages, bookings, listings, travellerProfiles, users, vendorProfiles } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { notifyUser } from "@/lib/notify";
import { getSession } from "@/lib/session";
import { countInLastHour, RATE_LIMITS } from "@/lib/rate-limit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type BookingMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderUserId: string;
  senderName: string;
  role: "traveller" | "vendor" | "admin";
};

/** A booking's thread has exactly three kinds of people allowed in it: the
 * traveller who made it, the vendor who owns the listing, and any admin.
 * Returns null for everyone else (including a traveller/vendor who isn't
 * party to *this* booking), so callers can 404/error uniformly. */
async function resolveBookingAccess(bookingId: string) {
  const session = await getSession();
  if (!session) return null;

  // Resolved as this exact session's own role/profile id — never a wider
  // context — so RLS enforces the very same three-way access this
  // function itself is about to check: a traveller/vendor session can
  // only ever have this query return a row that's really theirs.
  let travellerProfileId: string | null = null;
  let vendorProfileId: string | null = null;
  if (session.role === "traveller") {
    travellerProfileId = (await getTravellerProfileByUserId(session.userId))?.id ?? null;
  } else if (session.role === "vendor") {
    vendorProfileId = (await getVendorProfileByUserId(session.userId))?.id ?? null;
  }

  const row = await withRlsContext(
    { userId: session.userId, role: session.role, vendorProfileId, travellerProfileId },
    (tx) =>
      tx
        .select({
          booking: bookings,
          travellerUserId: travellerProfiles.userId,
          vendorUserId: vendorProfiles.userId,
        })
        .from(bookings)
        .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
        .innerJoin(listings, eq(listings.id, bookings.listingId))
        .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
        .where(eq(bookings.id, bookingId))
        .limit(1)
        .then((rows) => rows[0]),
  );
  if (!row) return null;

  const isTraveller = session.role === "traveller" && session.userId === row.travellerUserId;
  const isVendor = session.role === "vendor" && session.userId === row.vendorUserId;
  const isAdmin = session.role === "admin";
  if (!isTraveller && !isVendor && !isAdmin) return null;

  return { session, row, isTraveller, isVendor, isAdmin, travellerProfileId, vendorProfileId };
}

export async function getBookingMessagesAction(
  bookingId: string,
): Promise<{ messages: BookingMessage[]; viewerUserId: string } | { error: string }> {
  const access = await resolveBookingAccess(bookingId);
  if (!access) return { error: "You don't have access to this booking." };

  const rows = await withRlsContext(
    {
      userId: access.session.userId,
      role: access.session.role,
      vendorProfileId: access.vendorProfileId,
      travellerProfileId: access.travellerProfileId,
    },
    (tx) =>
      tx
        .select({ message: bookingMessages, senderName: users.name, senderUserId: users.id })
        .from(bookingMessages)
        .innerJoin(users, eq(users.id, bookingMessages.senderUserId))
        .where(eq(bookingMessages.bookingId, bookingId))
        .orderBy(bookingMessages.createdAt),
  );

  const messages: BookingMessage[] = rows.map((r) => ({
    id: r.message.id,
    content: r.message.content,
    createdAt: r.message.createdAt.toISOString(),
    senderUserId: r.senderUserId,
    senderName: r.senderName,
    role:
      r.senderUserId === access.row.travellerUserId
        ? "traveller"
        : r.senderUserId === access.row.vendorUserId
          ? "vendor"
          : "admin",
  }));

  return { messages, viewerUserId: access.session.userId };
}

export async function postBookingMessageAction(
  bookingId: string,
  content: string,
): Promise<{ error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Write something before sending." };
  if (trimmed.length > 1000) return { error: "Keep it under 1000 characters." };

  const access = await resolveBookingAccess(bookingId);
  if (!access) return { error: "You don't have access to this booking." };

  const recentCount = await countInLastHour(
    bookingMessages,
    bookingMessages.senderUserId,
    bookingMessages.createdAt,
    access.session.userId,
  );
  if (recentCount >= RATE_LIMITS.bookingMessagesPerHour) {
    return { error: "You're sending a lot of messages — try again in a bit." };
  }

  await withRlsContext(
    {
      userId: access.session.userId,
      role: access.session.role,
      vendorProfileId: access.vendorProfileId,
      travellerProfileId: access.travellerProfileId,
    },
    (tx) => tx.insert(bookingMessages).values({ bookingId, senderUserId: access.session.userId, content: trimmed }),
  );

  // Email whichever side(s) didn't send this one — an admin stepping into
  // the thread pings both the traveller and the vendor.
  const recipientUserIds = [
    !access.isTraveller ? access.row.travellerUserId : null,
    !access.isVendor ? access.row.vendorUserId : null,
  ].filter((id): id is string => Boolean(id));

  if (recipientUserIds.length > 0) {
    const recipients = await db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.id, recipientUserIds));
    await Promise.all(
      recipients.map((r) =>
        notifyUser(r.email, `New message about booking ${access.row.booking.bookingRef}`, [
          `You have a new message about booking <strong>${access.row.booking.bookingRef}</strong>.`,
          `"${trimmed.slice(0, 200)}"`,
          `<a href="${APP_URL}/bookings/${access.row.booking.bookingRef}">View the conversation</a>.`,
        ]),
      ),
    );
  }

  revalidatePath(`/bookings/${access.row.booking.bookingRef}`);
  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/admin/bookings");

  return {};
}
