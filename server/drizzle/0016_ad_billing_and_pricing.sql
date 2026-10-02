CREATE TYPE "public"."ad_billing_model" AS ENUM('monthly', 'per_view');--> statement-breakpoint
CREATE TABLE "ad_pricing_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"monthly_price" integer DEFAULT 5000 NOT NULL,
	"price_per_100_views" integer DEFAULT 50 NOT NULL,
	"currency" text DEFAULT 'NPR' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advertisements" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "advertisements" ADD COLUMN "billing_model" "ad_billing_model" DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisements" ADD COLUMN "duration_months" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisements" ADD COLUMN "view_quota" integer;--> statement-breakpoint
ALTER TABLE "advertisements" ADD COLUMN "price_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisements" ADD COLUMN "currency" text DEFAULT 'NPR' NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_pricing_settings" ADD CONSTRAINT "ad_pricing_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_category_targets_category_idx" ON "ad_category_targets" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ad_destination_targets_destination_idx" ON "ad_destination_targets" USING btree ("destination_id");--> statement-breakpoint
INSERT INTO "ad_pricing_settings" ("id", "monthly_price", "price_per_100_views", "currency") VALUES ('default', 5000, 50, 'NPR') ON CONFLICT ("id") DO NOTHING;
