import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export default async function UnsubscribeNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let unsubscribed = false;

  if (token) {
    const [row] = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token)).limit(1);
    if (row) {
      await db
        .update(subscribers)
        .set({ unsubscribedAt: new Date() })
        .where(eq(subscribers.id, row.id));
      unsubscribed = true;
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">
        {unsubscribed ? "You're unsubscribed" : "That link isn't valid"}
      </h1>
      <p className="mt-2 text-sm text-forest-800/70">
        {unsubscribed
          ? "You won't get any more Wano Journal emails. Sorry to see you go."
          : "This unsubscribe link has already been used or doesn't exist."}
      </p>
      <Link href="/" className="mt-6 inline-flex rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white">
        Back to Wano
      </Link>
    </main>
  );
}
