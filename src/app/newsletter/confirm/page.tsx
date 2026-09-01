import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let confirmed = false;

  if (token) {
    const [row] = await db.select().from(subscribers).where(eq(subscribers.confirmToken, token)).limit(1);
    if (row && !row.confirmed) {
      await db
        .update(subscribers)
        .set({ confirmed: true, confirmedAt: new Date() })
        .where(eq(subscribers.id, row.id));
      confirmed = true;
    } else if (row?.confirmed) {
      confirmed = true;
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">
        {confirmed ? "You're subscribed!" : "That link isn't valid"}
      </h1>
      <p className="mt-2 text-sm text-forest-800/70">
        {confirmed
          ? "You'll get an email when there's a new Wano Journal post worth reading."
          : "This confirmation link has already been used or doesn't exist."}
      </p>
      <Link href="/journal" className="mt-6 inline-flex rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white">
        Read the Journal
      </Link>
    </main>
  );
}
