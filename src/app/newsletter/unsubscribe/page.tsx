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
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-lg px-4 py-16 text-center md:px-6">
        <h1 className="font-serif-editorial text-3xl text-ink">
          {unsubscribed ? "You're unsubscribed" : "That link isn't valid"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {unsubscribed
            ? "You won't get any more Wano Journal emails. Sorry to see you go."
            : "This unsubscribe link has already been used or doesn't exist."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
        >
          Back to Wano
        </Link>
      </section>
    </main>
  );
}
