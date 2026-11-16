export type ImageKind = "store_photo" | "inspiration" | "uploaded" | "placeholder";

/** Honest provenance caption for every product image. */
export function imageCaptionFor(kind: ImageKind, photoRefs: string | null): string {
  switch (kind) {
    case "store_photo":
      return photoRefs
        ? `In-store photo from the original wishlist (photo ${photoRefs})`
        : "In-store photo from the original wishlist";
    case "inspiration":
      return "Inspiration picture from the original wishlist — not necessarily the exact product";
    case "uploaded":
      return "Product photo";
    default:
      return "No photo yet";
  }
}

export const IMAGE_KIND_LABEL: Record<ImageKind, string> = {
  store_photo: "In-store photo",
  inspiration: "Inspiration picture",
  uploaded: "Product photo",
  placeholder: "No photo",
};
