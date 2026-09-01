// Client-side image pipeline for the post composer: resize to a max 1600px
// long edge, encode to WebP, and step quality down until under a target
// size. Re-encoding through <canvas> strips all EXIF (including GPS) as a
// side effect — canvas never reads or re-emits metadata — so there's no
// separate "strip EXIF" step to get wrong.
const MAX_DIMENSION = 1600;
const TARGET_BYTES = 250 * 1024;
const QUALITY_STEPS = [0.82, 0.7, 0.55, 0.4, 0.28];

export async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= TARGET_BYTES) break;
  }
  if (!blob) throw new Error("Could not encode image.");

  return { blob, width, height };
}
