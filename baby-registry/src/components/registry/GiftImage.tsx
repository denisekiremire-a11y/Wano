import Image from "next/image";
import { Gift as GiftIcon, Sparkles } from "lucide-react";
import type { Gift } from "@/lib/types";

interface Props {
  gift: Pick<Gift, "name" | "image_url" | "image_kind" | "image_caption">;
  sizes: string;
  priority?: boolean;
  showKindTag?: boolean;
  className?: string;
}

/**
 * Product image with honest provenance. Imported photos are the family's own in-store photos
 * or pictures from their inspiration board; the latter are tagged so nobody mistakes them for
 * the exact product. Missing images get a neutral placeholder that says so.
 */
export function GiftImage({ gift, sizes, priority, showKindTag = true, className = "" }: Props) {
  if (!gift.image_url || gift.image_kind === "placeholder") {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-cream to-linen text-taupe ${className}`}>
        <GiftIcon className="size-8 opacity-60" strokeWidth={1.25} aria-hidden />
        <span className="text-xs">No photo yet</span>
      </div>
    );
  }
  return (
    <div className={`relative h-full w-full bg-cream ${className}`}>
      <Image
        src={gift.image_url}
        alt={`${gift.name}${gift.image_kind === "inspiration" ? " (inspiration picture)" : ""}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
      {showKindTag && gift.image_kind === "inspiration" && (
        <span
          className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink-soft backdrop-blur"
          title={gift.image_caption ?? "Inspiration picture — not necessarily the exact product"}
        >
          <Sparkles className="size-3" aria-hidden /> Inspiration
        </span>
      )}
    </div>
  );
}
