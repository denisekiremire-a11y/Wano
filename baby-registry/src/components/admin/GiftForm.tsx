"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { createGiftAction, updateGiftAction, type ActionResult } from "@/app/actions/admin";
import { GiftImage } from "@/components/registry/GiftImage";
import { imageCaptionFor, type ImageKind } from "@/lib/images";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { Category, Gift } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

interface Props {
  gift?: Gift;
  categories: Category[];
  supabaseUrl: string;
  supabaseKey: string;
}

const v = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export function GiftForm({ gift, categories, supabaseUrl, supabaseKey }: Props) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(gift ? updateGiftAction : createGiftAction, null);
  const [imageUrl, setImageUrl] = useState(gift?.image_url ?? "");
  const [imageKind, setImageKind] = useState<ImageKind>(gift?.image_kind ?? "placeholder");
  const [caption, setCaption] = useState(gift?.image_caption ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploadError(null);
    if (!TYPES.includes(file.type)) return setUploadError("Please choose a JPEG, PNG, WebP or AVIF image.");
    if (file.size > MAX_BYTES) return setUploadError("Images must be 5 MB or smaller.");
    setUploading(true);
    try {
      const sb = getBrowserSupabase(supabaseUrl, supabaseKey);
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `gifts/${crypto.randomUUID()}.${ext}`;
      // Storage RLS only allows administrators to upload to this bucket.
      const { error } = await sb.storage.from("gift-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = sb.storage.from("gift-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      setImageKind("uploaded");
      setCaption(imageCaptionFor("uploaded", null));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <form action={action} className="space-y-6" data-testid="gift-form">
      {gift && <input type="hidden" name="id" value={gift.id} />}
      {gift && <input type="hidden" name="currentStatus" value={gift.status} />}

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-2xl md:col-span-2">Details</h2>
        <div>
          <label className="field-label" htmlFor="g-name">
            Name *
          </label>
          <input id="g-name" name="name" required maxLength={160} defaultValue={gift?.name} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="g-slug">
            URL slug
          </label>
          <input id="g-slug" name="slug" maxLength={120} defaultValue={gift?.slug} className="field-input" placeholder="generated from the name" />
          <p className="field-hint">Used in the gift’s link: /gift/your-slug</p>
        </div>
        <div>
          <label className="field-label" htmlFor="g-cat">
            Category *
          </label>
          <select id="g-cat" name="categoryId" defaultValue={gift?.category_id ?? categories[0]?.id} className="field-input">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {gift && (
          <div>
            <label className="field-label" htmlFor="g-status">
              Availability
            </label>
            <select id="g-status" name="status" defaultValue={gift.status} className="field-input">
              <option value="available">Available</option>
              <option value="reserved" disabled={gift.status === "available"}>
                Reserved (only via a guest reservation)
              </option>
              <option value="purchased">Purchased</option>
            </select>
            <p className="field-hint">Making a reserved gift available releases its reservation.</p>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="g-desc">
            Description
          </label>
          <textarea id="g-desc" name="description" maxLength={2000} defaultValue={gift?.description ?? ""} className="field-input min-h-20" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="g-notes">
            Notes (shown to guests)
          </label>
          <textarea id="g-notes" name="notes" maxLength={2000} defaultValue={gift?.notes ?? ""} className="field-input min-h-20" />
        </div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-4">
        <div className="md:col-span-4">
          <h2 className="text-2xl">Price (AED)</h2>
          <p className="text-sm text-muted">
            Use a single price, a sale price, or an estimated range. Leave unknown values blank — never guess an exact price for a range.
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="g-price">
            Price
          </label>
          <input id="g-price" name="priceAed" inputMode="decimal" defaultValue={v(gift?.price_aed)} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="g-sale">
            Sale price
          </label>
          <input id="g-sale" name="salePriceAed" inputMode="decimal" defaultValue={v(gift?.sale_price_aed)} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="g-min">
            Range from
          </label>
          <input id="g-min" name="priceMinAed" inputMode="decimal" defaultValue={v(gift?.price_min_aed)} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="g-max">
            Range to
          </label>
          <input id="g-max" name="priceMaxAed" inputMode="decimal" defaultValue={v(gift?.price_max_aed)} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="g-basis">
            Price type
          </label>
          <select id="g-basis" name="priceBasis" defaultValue={gift?.price_basis ?? "estimate"} className="field-input">
            <option value="shelf_tag">Confirmed in-store (shelf tag)</option>
            <option value="online">Online retailer price</option>
            <option value="estimate">Estimate</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="g-unit">
            Unit
          </label>
          <input id="g-unit" name="priceUnit" maxLength={60} defaultValue={gift?.price_unit ?? ""} className="field-input" placeholder="e.g. each, 4-pack" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="g-label">
            Original price text
          </label>
          <input id="g-label" name="priceLabel" maxLength={200} defaultValue={gift?.price_label ?? ""} className="field-input" />
          <p className="field-hint">As written in the source (shown to guests on the gift page).</p>
        </div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-2xl md:col-span-2">Image</h2>
        <div className="flex gap-4 md:col-span-2">
          <div className="relative size-32 shrink-0 overflow-hidden rounded-2xl border border-linen">
            <GiftImage gift={{ name: "Preview", image_url: imageUrl || null, image_kind: imageUrl ? imageKind : "placeholder", image_caption: caption }} sizes="128px" />
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            {imageUrl && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  setImageUrl("");
                  setImageKind("placeholder");
                  setCaption("");
                }}
              >
                Remove image
              </button>
            )}
            {uploadError && (
              <p className="text-sm text-rose-700" role="alert">
                {uploadError}
              </p>
            )}
            <p className="field-hint">JPEG, PNG, WebP or AVIF, up to 5 MB.</p>
          </div>
        </div>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <div>
          <label className="field-label" htmlFor="g-kind">
            Image type
          </label>
          <select id="g-kind" name="imageKind" value={imageKind} onChange={(e) => setImageKind(e.target.value as ImageKind)} className="field-input">
            <option value="uploaded">Product photo</option>
            <option value="store_photo">In-store photo</option>
            <option value="inspiration">Inspiration picture (not the exact product)</option>
            <option value="placeholder">No photo</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="g-caption">
            Image caption
          </label>
          <input id="g-caption" name="imageCaption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} className="field-input" />
        </div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-2xl md:col-span-2">Listing & budget</h2>
        <div>
          <label className="field-label" htmlFor="g-tier">
            Option type
          </label>
          <select id="g-tier" name="tier" defaultValue={gift?.tier ?? "standard"} className="field-input">
            <option value="budget">Budget-friendly</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium pick</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="g-sort">
            Sort order
          </label>
          <input id="g-sort" name="sortOrder" type="number" min={0} defaultValue={gift?.sort_order ?? 1000} className="field-input" />
        </div>
        <fieldset className="grid gap-2 md:col-span-2 md:grid-cols-2">
          <legend className="field-label">Flags</legend>
          {[
            ["isFeatured", "Featured on the homepage", gift?.is_featured],
            ["isAlternative", "Alternative to another gift (excluded from totals)", gift?.is_alternative],
            ["inDocBudget", "Counted in the budget selection", gift?.in_doc_budget],
            ["inDocFull", "Counted in the full-wishlist selection", gift?.in_doc_full ?? true],
          ].map(([name, label, checked]) => (
            <label key={name as string} className="flex items-center gap-2.5 rounded-xl border border-linen bg-white px-3 py-2.5 text-sm">
              <input type="checkbox" name={name as string} defaultChecked={Boolean(checked)} className="size-4 accent-[var(--color-sage-700)]" />
              {label as string}
            </label>
          ))}
        </fieldset>
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-linen bg-[#f8f5ef]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        {state && (
          <p className={`mr-auto text-sm ${state.ok ? "text-sage-700" : "text-rose-700"}`} role="status" data-testid="form-status">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={pending || uploading} data-testid="save-gift">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          {gift ? "Save changes" : "Create gift"}
        </button>
      </div>
    </form>
  );
}
