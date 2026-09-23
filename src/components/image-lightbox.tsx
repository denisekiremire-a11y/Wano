"use client";

import { useRef, useState } from "react";

type LightboxImage = { id: string; alt: string };

/** A grid of thumbnails that expands into a full-screen swipeable viewer on
 * tap — reused for a listing's own photo gallery and for one item's photos.
 * `srcBase` picks which API route to read from (listing vs item images). */
export function ImageLightbox({
  images,
  srcBase,
  thumbClassName = "h-28 w-full object-cover",
  gridClassName = "grid grid-cols-3 gap-2",
}: {
  images: LightboxImage[];
  srcBase: "/api/listing-images" | "/api/listing-item-images";
  thumbClassName?: string;
  gridClassName?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const touchStartX = useRef(0);

  if (images.length === 0) return null;

  function go(delta: number) {
    setOpenIndex((current) => {
      if (current === null) return current;
      const next = (current + delta + images.length) % images.length;
      return next;
    });
  }

  return (
    <>
      <div className={gridClassName}>
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="overflow-hidden rounded-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${srcBase}/${image.id}`} alt={image.alt} className={thumbClassName} />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-forest-950/95"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            if (delta > 40) go(-1);
            else if (delta < -40) go(1);
          }}
        >
          <div className="flex items-center justify-between p-4">
            <p className="text-sm font-medium text-white/70">
              {openIndex + 1} / {images.length}
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpenIndex(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-white"
            >
              ×
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4">
            {images.length > 1 && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
              >
                ‹
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${srcBase}/${images[openIndex].id}`}
              alt={images[openIndex].alt}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
            {images.length > 1 && (
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
