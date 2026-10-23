import "server-only";
import { desc, eq } from "drizzle-orm";
import { bookings, priceMatchReports, travellerProfiles, users } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";

/** Admin-only (super) list of price-match reports awaiting review —
 * powers /admin/rewards/price-match. */
export async function getPendingPriceMatchReports() {
  return withRlsContext({ role: "admin" }, (tx) =>
    tx
      .select({
        report: priceMatchReports,
        bookingRef: bookings.bookingRef,
        travellerName: users.name,
        travellerEmail: users.email,
      })
      .from(priceMatchReports)
      .innerJoin(bookings, eq(bookings.id, priceMatchReports.bookingId))
      .innerJoin(travellerProfiles, eq(travellerProfiles.id, priceMatchReports.travellerId))
      .innerJoin(users, eq(users.id, travellerProfiles.userId))
      .where(eq(priceMatchReports.status, "pending"))
      .orderBy(desc(priceMatchReports.createdAt)),
  );
}
