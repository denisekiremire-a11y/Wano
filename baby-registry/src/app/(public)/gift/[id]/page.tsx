import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftDetail } from "@/components/registry/GiftDetail";
import { CurrencyNote, PriceNotice } from "@/components/site/Notices";
import { getRegistry } from "@/lib/registry-cache";

type Params = { params: Promise<{ id: string }> };

/** Accepts either the readable slug (/gift/doona-plus-grey-hound) or the gift's UUID. */
async function findGift(id: string) {
  const data = await getRegistry();
  const key = decodeURIComponent(id).toLowerCase();
  return { data, gift: data.gifts.find((g) => g.slug === key || g.id === key) };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  try {
    const { gift } = await findGift((await params).id);
    return { title: gift?.name ?? "Gift" };
  } catch {
    return { title: "Gift" };
  }
}

export default async function GiftPage({ params }: Params) {
  const { data, gift } = await findGift((await params).id);
  if (!gift) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <GiftDetail giftId={gift.id} />
      <div className="mt-10 space-y-2">
        <PriceNotice settings={data.settings} compact />
        <CurrencyNote settings={data.settings} />
      </div>
    </main>
  );
}
