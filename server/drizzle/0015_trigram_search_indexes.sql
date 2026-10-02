-- `ILIKE '%term%'` cannot use a btree index; trigram GIN indexes can.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_categories_name_trgm_idx" ON "global_categories" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_destinations_name_trgm_idx" ON "global_destinations" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tours_title_trgm_idx" ON "tours" USING gin ("title" gin_trgm_ops);
