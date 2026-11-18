import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryGrid } from "@/components/registry/CategoryGrid";
import { FeaturedGifts } from "@/components/registry/FeaturedGifts";
import { ProgressStats } from "@/components/registry/ProgressStats";
import { RegistryBrowser } from "@/components/registry/RegistryBrowser";
import { PeachMark } from "@/components/site/PeachMark";
import { CurrencyNote, PriceNotice } from "@/components/site/Notices";
import { getRegistry } from "@/lib/registry-cache";

export default async function HomePage() {
  const { settings } = await getRegistry();
  return (
    <main>
      <section className="relative overflow-hidden border-b border-linen bg-gradient-to-b from-cream via-ivory to-ivory">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-sage-100/70 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-32 top-40 size-80 rounded-full bg-linen blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="eyebrow inline-flex items-center gap-2">
            <PeachMark className="size-4 text-clay" /> {settings.registry_title}
          </p>
          <h1 className="mt-4 text-[2.6rem] font-medium leading-[1.05] text-ink sm:text-6xl md:text-7xl">{settings.welcome_heading}</h1>
          {settings.welcome_text && <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">{settings.welcome_text}</p>}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="#collection" className="btn-primary px-7 py-3 text-[15px]">
              Choose a gift <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="#how-it-works" className="btn-secondary px-7 py-3 text-[15px]">
              How it works
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-10 sm:px-6">
        <ProgressStats />

        <section id="how-it-works" aria-labelledby="how-heading" className="grid gap-4 md:grid-cols-3">
          <h2 id="how-heading" className="sr-only">
            How it works
          </h2>
          {[
            ["1", "Choose a gift", "Browse the list and pick something you love. No account needed."],
            ["2", "Reserve it", "Add your name so nobody else picks the same gift. It disappears from the list for everyone instantly."],
            ["3", "Buy it your way", "Tap “Buy” to go straight to the product at Peekaboo Uganda — or buy it anywhere you like."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border border-linen bg-white/60 p-5">
              <span className="font-display text-3xl text-sage-600">{n}</span>
              <h3 className="mt-1 text-xl">{t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="cat-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Browse by category</p>
              <h2 id="cat-heading" className="mt-1 text-3xl sm:text-4xl">
                Seven little corners of the list
              </h2>
            </div>
          </div>
          <CategoryGrid />
        </section>

        <section aria-labelledby="featured-heading">
          <p className="eyebrow">Featured</p>
          <h2 id="featured-heading" className="mb-5 mt-1 text-3xl sm:text-4xl">
            A few things we especially love
          </h2>
          <FeaturedGifts />
        </section>

        <section id="collection" aria-labelledby="collection-heading" className="scroll-mt-20">
          <p className="eyebrow">The full collection</p>
          <h2 id="collection-heading" className="mb-4 mt-1 text-3xl sm:text-4xl">
            Every gift on the list
          </h2>
          <div className="mb-5 space-y-2">
            <PriceNotice settings={settings} />
            <CurrencyNote />
          </div>
          <RegistryBrowser />
        </section>
      </div>
    </main>
  );
}
