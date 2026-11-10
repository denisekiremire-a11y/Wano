"use client";

import { useEffect, useRef, useState } from "react";

const VIEWPORT_SIZE = 240;
const PREVIEW_DPR = 2;
const OUTPUT_SIZE = 512;

type Offset = { x: number; y: number };
type NaturalSize = { width: number; height: number };

function clampOffset(offset: Offset, scale: number, size: NaturalSize): Offset {
  const dw = size.width * scale;
  const dh = size.height * scale;
  return {
    x: Math.min(0, Math.max(VIEWPORT_SIZE - dw, offset.x)),
    y: Math.min(0, Math.max(VIEWPORT_SIZE - dh, offset.y)),
  };
}

/** Lets the traveller pick exactly what shows inside the avatar circle
 * instead of leaving it to CSS `object-cover`'s center-crop — drag to
 * reposition, slide to zoom, previewed live on a canvas in the same
 * circle shape the photo renders in everywhere else. Confirming
 * rasterizes that same view to a square JPEG, so every avatar render
 * (post cards, stories, discover, …) shows the same framing without
 * re-cropping it differently at each size.
 *
 * The preview is a <canvas> painted from a decoded ImageBitmap, not an
 * `<img src={blobUrl}>` — a blob: URL created at render time and revoked
 * from an effect cleanup gets revoked out from under the image in dev:
 * React Strict Mode mounts, cleans up, and remounts effects once to
 * surface exactly this kind of bug, and the cleanup's revoke fires before
 * the image the "real" mount relies on ever decodes. Decoding the file
 * directly into a bitmap avoids a blob URL (and that race) entirely. */
export function ProfilePhotoCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startOffset: Offset } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    createImageBitmap(file).then((bitmap) => {
      if (cancelled) {
        bitmap.close();
        return;
      }
      bitmapRef.current = bitmap;
      const size = { width: bitmap.width, height: bitmap.height };
      const ms = Math.max(VIEWPORT_SIZE / size.width, VIEWPORT_SIZE / size.height);
      setNaturalSize(size);
      setMinScale(ms);
      setScale(ms);
      setZoom(1);
      setOffset({
        x: (VIEWPORT_SIZE - size.width * ms) / 2,
        y: (VIEWPORT_SIZE - size.height * ms) / 2,
      });
    });
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [file]);

  // Redraw the live preview whenever the framing changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap || !naturalSize) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      bitmap,
      0,
      0,
      naturalSize.width,
      naturalSize.height,
      offset.x * PREVIEW_DPR,
      offset.y * PREVIEW_DPR,
      naturalSize.width * scale * PREVIEW_DPR,
      naturalSize.height * scale * PREVIEW_DPR,
    );
  }, [naturalSize, scale, offset]);

  function handlePointerDown(e: React.PointerEvent) {
    if (!naturalSize) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startOffset: offset };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !naturalSize) return;
    setOffset(
      clampOffset(
        { x: drag.startOffset.x + (e.clientX - drag.startX), y: drag.startOffset.y + (e.clientY - drag.startY) },
        scale,
        naturalSize,
      ),
    );
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoomChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!naturalSize) return;
    const newZoom = Number(e.target.value);
    const newScale = minScale * newZoom;
    // Keep whatever's centered in the circle centered after the zoom change.
    const centerImgX = (VIEWPORT_SIZE / 2 - offset.x) / scale;
    const centerImgY = (VIEWPORT_SIZE / 2 - offset.y) / scale;
    setZoom(newZoom);
    setScale(newScale);
    setOffset(
      clampOffset(
        { x: VIEWPORT_SIZE / 2 - centerImgX * newScale, y: VIEWPORT_SIZE / 2 - centerImgY * newScale },
        newScale,
        naturalSize,
      ),
    );
  }

  function handleConfirm() {
    const bitmap = bitmapRef.current;
    if (!naturalSize || !bitmap) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const k = OUTPUT_SIZE / VIEWPORT_SIZE;
    ctx.drawImage(
      bitmap,
      0,
      0,
      naturalSize.width,
      naturalSize.height,
      offset.x * k,
      offset.y * k,
      naturalSize.width * scale * k,
      naturalSize.height * scale * k,
    );
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-forest-950/50 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-modal-title"
        className="w-full max-w-xs rounded-2xl bg-paper p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="crop-modal-title" className="font-display text-lg font-semibold text-ink">
          Reposition photo
        </h2>
        <div className="mt-4 flex justify-center">
          <div
            className="relative h-60 w-60 touch-none select-none overflow-hidden rounded-full bg-ink/5"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              width={VIEWPORT_SIZE * PREVIEW_DPR}
              height={VIEWPORT_SIZE * PREVIEW_DPR}
              className="h-60 w-60 cursor-grab active:cursor-grabbing"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-ink/50">−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            disabled={!naturalSize}
            onChange={handleZoomChange}
            className="flex-1 accent-ember"
            aria-label="Zoom"
          />
          <span className="text-xs text-ink/50">+</span>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!naturalSize}
            onClick={handleConfirm}
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember-hover disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
