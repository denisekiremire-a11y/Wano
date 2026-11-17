import type { ImageKind } from "./images";

export type GiftStatus = "available" | "reserved" | "purchased";
export type PriceBasis = "shelf_tag" | "online" | "estimate";
export type GiftTier = "budget" | "standard" | "premium";
export type ReservationStatus = "active" | "purchased" | "cancelled" | "released" | "expired";

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  doc_budget_aed: number | null;
  doc_full_aed: number | null;
}

export interface Retailer {
  id: number;
  slug: string;
  name: string;
  website_url: string | null;
  phone: string | null;
  notes: string | null;
}

export interface StoreLocation {
  id: string;
  retailer_id: number;
  name: string;
  area: string | null;
  address: string | null;
  phone: string | null;
  maps_url: string | null;
  verified: boolean;
}

export interface GiftRetailer {
  id: string;
  gift_id: string;
  retailer_id: number;
  product_url: string | null;
  url_verified: boolean;
  source_note: string | null;
  is_primary: boolean;
}

export interface Gift {
  id: string;
  slug: string;
  category_id: number;
  name: string;
  description: string | null;
  notes: string | null;
  price_aed: number | null;
  sale_price_aed: number | null;
  price_min_aed: number | null;
  price_max_aed: number | null;
  price_unit: string | null;
  price_basis: PriceBasis;
  price_label: string | null;
  reference_price_aed: number | null;
  tier: GiftTier;
  in_doc_budget: boolean;
  in_doc_full: boolean;
  is_alternative: boolean;
  is_featured: boolean;
  image_url: string | null;
  image_kind: ImageKind;
  image_caption: string | null;
  photo_refs: string | null;
  status: GiftStatus;
  status_changed_at: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RegistrySettings {
  id: number;
  registry_title: string;
  welcome_heading: string;
  welcome_text: string;
  prices_recorded_on: string | null;
  price_notice: string;
  aed_to_ugx_rate: number | null;
  rate_updated_at: string | null;
  rate_source: string | null;
  doc_budget_total_aed: number | null;
  doc_full_total_aed: number | null;
  doc_totals_note: string | null;
  reservation_expiry_enabled: boolean;
  reservation_expiry_hours: number | null;
  max_reservations_per_client_per_day: number;
  max_attempts_per_client_per_10min: number;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reference: string;
  gift_id: string | null;
  gift_name_snapshot: string;
  price_aed_snapshot: number | null;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  message: string | null;
  status: ReservationStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  purchased_at: string | null;
  closed_at: string | null;
}

export interface ReservationEvent {
  id: number;
  reservation_id: string | null;
  gift_id: string | null;
  event: string;
  actor: string;
  details: string | null;
  created_at: string;
}

export interface PublicReservation {
  reference: string;
  status: ReservationStatus;
  created_at: string;
  guest_first_name: string;
  gift_id: string | null;
  gift_slug: string | null;
  gift_name: string;
  price_aed: number | null;
}

export interface GuestPledge {
  reference: string;
  status: ReservationStatus;
  created_at: string;
  gift_id: string | null;
  gift_slug: string | null;
  gift_name: string;
  price_aed: number | null;
}

/** Everything the public registry needs, fetched in one go. */
export interface RegistryData {
  gifts: Gift[];
  categories: Category[];
  retailers: Retailer[];
  giftRetailers: GiftRetailer[];
  locations: StoreLocation[];
  settings: RegistrySettings;
}
