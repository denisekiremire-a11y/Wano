-- Charity vendor type (Phase 1 of 4: schema + registration + admin
-- verification). Postgres requires ADD VALUE to run outside any other
-- statement in the same transaction, so each goes on its own line here —
-- same reasoning as every other enum addition in this directory.
-- charity_details itself is a brand new table, declared in schema.ts and
-- picked up by `drizzle-kit push --force` same as any other new table —
-- nothing to do for it here.
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'charity';
ALTER TYPE vendor_doc_type ADD VALUE IF NOT EXISTS 'charity_registration_certificate';
ALTER TYPE vendor_doc_type ADD VALUE IF NOT EXISTS 'charity_annual_report';
