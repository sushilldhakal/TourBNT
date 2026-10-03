-- Row-level security, a second layer behind the API's own checks.
--
-- Requests mounted with withRowLevelSecurity (middlewares/rowLevelSecurity.ts) run as tourbnt_app, with
-- app.user_id / app.is_admin set for the transaction. Everything else — other routes, jobs, migrations —
-- keeps running as the table owner, which RLS doesn't apply to (the tables are ENABLEd, not FORCEd), so
-- this migration changes nothing until DB_RLS=on.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tourbnt_app') THEN
    CREATE ROLE tourbnt_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT tourbnt_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO tourbnt_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tourbnt_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tourbnt_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tourbnt_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tourbnt_app;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_is_admin() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('app.is_admin', true), '') = 'on' $$;
--> statement-breakpoint

-- Bookings: admins, the traveller, the seller paid for it, and the tour's authors (as bookingAccess.ts).
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "bookings_party" ON "bookings" FOR ALL TO tourbnt_app
  USING (
    app_is_admin()
    OR "user_id" = app_user_id()
    OR "seller_id" = app_user_id()
    OR EXISTS (SELECT 1 FROM "tour_authors" ta WHERE ta."tour_id" = "bookings"."tour_id" AND ta."user_id" = app_user_id())
  );
--> statement-breakpoint

-- Payouts: admins and the seller being paid.
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "payouts_seller" ON "payouts" FOR ALL TO tourbnt_app
  USING (app_is_admin() OR "seller_id" = app_user_id());
--> statement-breakpoint

-- Ads and their daily stats: admins and the owner of the advertising business.
ALTER TABLE "advertisements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "advertisements_owner" ON "advertisements" FOR ALL TO tourbnt_app
  USING (
    app_is_admin()
    OR EXISTS (SELECT 1 FROM "business_partners" bp WHERE bp."id" = "advertisements"."business_partner_id" AND bp."owner_id" = app_user_id())
  );
--> statement-breakpoint
ALTER TABLE "ad_daily_stats" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "ad_daily_stats_owner" ON "ad_daily_stats" FOR ALL TO tourbnt_app
  USING (
    app_is_admin()
    OR EXISTS (
      SELECT 1 FROM "advertisements" a JOIN "business_partners" bp ON bp."id" = a."business_partner_id"
      WHERE a."id" = "ad_daily_stats"."ad_id" AND bp."owner_id" = app_user_id()
    )
  );
