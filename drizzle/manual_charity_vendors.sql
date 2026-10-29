-- Charity vendor type (Phase 1 of 4: schema + registration + admin
-- verification). Postgres requires ADD VALUE to run outside any other
-- statement in the same transaction, so each goes on its own line here —
-- same reasoning as every other enum addition in this directory.
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'charity';
ALTER TYPE vendor_doc_type ADD VALUE IF NOT EXISTS 'charity_registration_certificate';
ALTER TYPE vendor_doc_type ADD VALUE IF NOT EXISTS 'charity_annual_report';

CREATE TABLE IF NOT EXISTS "charity_details" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL UNIQUE REFERENCES "listings"("id") ON DELETE CASCADE,
  "legal_name" text NOT NULL,
  "org_type" text NOT NULL,
  "registration_number" text NOT NULL,
  "contact_person_name" text NOT NULL,
  "contact_person_role" text NOT NULL,
  "contact_person_phone" text NOT NULL,
  "mission_statement" text NOT NULL,
  "focus_area" text NOT NULL,
  "payout_method" text DEFAULT 'mobile_money' NOT NULL,
  "payout_account_detail" text NOT NULL,
  "agreement_accepted_at" timestamp with time zone NOT NULL,
  "agreement_version" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
