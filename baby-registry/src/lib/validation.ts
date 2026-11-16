import { z } from "zod";

/** Strip control characters and angle brackets, collapse whitespace. Mirrors public.clean_text(). */
export function cleanText(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, maxLen);
}

const optionalText = (max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) => cleanText(v, max))
    .transform((v) => (v === "" ? null : v));

export const reservationSchema = z.object({
  giftId: z.uuid({ message: "Unknown gift." }),
  name: z
    .unknown()
    .transform((v) => cleanText(v, 100))
    .pipe(z.string().min(2, "Please enter your name.").max(100)),
  email: optionalText(254).pipe(z.union([z.null(), z.email({ message: "Please enter a valid email address or leave it blank." })])),
  phone: optionalText(32).pipe(
    z.union([z.null(), z.string().regex(/^[0-9+()\-\s.]{5,32}$/, "Please enter a valid phone number or leave it blank.")]),
  ),
  message: optionalText(1000),
  confirm: z.literal("yes", { message: "Please confirm you will purchase this gift." }),
});

export type ReservationInput = z.infer<typeof reservationSchema>;

const money = z
  .unknown()
  .optional()
  .transform((v) => (typeof v === "string" ? v.replace(/[, ]/g, "").trim() : v))
  .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
  .pipe(z.union([z.null(), z.number().finite().min(0, "Prices cannot be negative.").max(10_000_000)]));

const httpsUrl = optionalText(1000).pipe(
  z.union([z.null(), z.url({ protocol: /^https$/, message: "Links must start with https://" })]),
);

export const giftSchema = z
  .object({
    name: z.unknown().transform((v) => cleanText(v, 160)).pipe(z.string().min(1, "Name is required.")),
    slug: z
      .unknown()
      .transform((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .pipe(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lower-case letters, numbers and hyphens.").max(120)),
    categoryId: z.coerce.number().int().positive("Choose a category."),
    description: optionalText(2000),
    notes: optionalText(2000),
    priceAed: money,
    salePriceAed: money,
    priceMinAed: money,
    priceMaxAed: money,
    priceUnit: optionalText(60),
    priceBasis: z.enum(["shelf_tag", "online", "estimate"]),
    priceLabel: optionalText(200),
    tier: z.enum(["budget", "standard", "premium"]),
    inDocBudget: z.boolean(),
    inDocFull: z.boolean(),
    isAlternative: z.boolean(),
    isFeatured: z.boolean(),
    imageUrl: optionalText(1000),
    imageKind: z.enum(["store_photo", "inspiration", "uploaded", "placeholder"]),
    imageCaption: optionalText(300),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .refine((g) => g.priceMinAed === null || g.priceMaxAed === null || g.priceMinAed <= g.priceMaxAed, {
    message: "The minimum of the range must not exceed the maximum.",
    path: ["priceMaxAed"],
  })
  .refine((g) => !g.imageUrl || g.imageUrl.startsWith("/") || /^https:\/\//.test(g.imageUrl) || /^http:\/\/(127\.0\.0\.1|localhost)/.test(g.imageUrl), {
    message: "Image must be an https:// link or an uploaded image.",
    path: ["imageUrl"],
  });

export type GiftInput = z.infer<typeof giftSchema>;

export const giftRetailerSchema = z.object({
  retailerId: z.coerce.number().int().positive(),
  productUrl: httpsUrl,
  urlVerified: z.boolean(),
  sourceNote: optionalText(300),
  isPrimary: z.boolean(),
});

export const retailerSchema = z.object({
  name: z.unknown().transform((v) => cleanText(v, 120)).pipe(z.string().min(1, "Name is required.")),
  websiteUrl: httpsUrl,
  phone: optionalText(40),
  notes: optionalText(1000),
});

export const locationSchema = z.object({
  retailerId: z.coerce.number().int().positive(),
  name: z.unknown().transform((v) => cleanText(v, 160)).pipe(z.string().min(1, "Store name is required.")),
  area: optionalText(160),
  address: optionalText(400),
  phone: optionalText(40),
  mapsUrl: httpsUrl,
  verified: z.boolean(),
});

export const settingsSchema = z.object({
  registryTitle: z.unknown().transform((v) => cleanText(v, 120)).pipe(z.string().min(1)),
  welcomeHeading: z.unknown().transform((v) => cleanText(v, 200)).pipe(z.string().min(1)),
  welcomeText: z.unknown().transform((v) => cleanText(v, 2000)),
  priceNotice: z.unknown().transform((v) => cleanText(v, 600)),
  reservationExpiryEnabled: z.boolean(),
  reservationExpiryHours: z
    .unknown()
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .pipe(z.union([z.null(), z.number().int().min(1).max(8760)])),
  maxReservationsPerDay: z.coerce.number().int().min(1).max(100),
  maxAttemptsPer10Min: z.coerce.number().int().min(1).max(500),
});

export const rateSchema = z.object({
  rate: z
    .unknown()
    .transform((v) => (typeof v === "string" ? v.replace(/[, ]/g, "").trim() : v))
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .pipe(z.union([z.null(), z.number().finite().positive("The rate must be greater than zero.").max(1_000_000)])),
  source: optionalText(200),
});

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Please check the form.";
}
