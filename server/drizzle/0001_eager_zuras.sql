CREATE TYPE "public"."ad_campaign_status" AS ENUM('draft', 'active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."ad_placement_slot" AS ENUM('tour_detail', 'tour_sidebar', 'hotel_page', 'search_results', 'homepage');--> statement-breakpoint
CREATE TYPE "public"."business_partner_type" AS ENUM('guide', 'hotel', 'guesthouse', 'restaurant', 'transport', 'advertiser');--> statement-breakpoint
CREATE TYPE "public"."itinerary_partner_role" AS ENUM('transport', 'accommodation', 'guide', 'meals', 'other');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'business_partner_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'business_partner_rejected';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'business_review_received';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'ad_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'ad_rejected';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'guide';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'hotel';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'guesthouse';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'restaurant';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'transport';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'advertiser';--> statement-breakpoint
CREATE TABLE "ad_category_targets" (
	"ad_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "ad_category_targets_ad_id_category_id_pk" PRIMARY KEY("ad_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "ad_daily_stats" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_id" text NOT NULL,
	"date" date NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_destination_targets" (
	"ad_id" text NOT NULL,
	"destination_id" text NOT NULL,
	CONSTRAINT "ad_destination_targets_ad_id_destination_id_pk" PRIMARY KEY("ad_id","destination_id")
);
--> statement-breakpoint
CREATE TABLE "advertisements" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_partner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"cta_label" text,
	"cta_url" text NOT NULL,
	"placement_slot" "ad_placement_slot" NOT NULL,
	"campaign_status" "ad_campaign_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"rejected_by" text,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"impression_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_partner_id" text NOT NULL,
	"doc_type" text NOT NULL,
	"url" text NOT NULL,
	"public_id" text,
	"original_filename" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_partner_categories" (
	"business_partner_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "business_partner_categories_business_partner_id_category_id_pk" PRIMARY KEY("business_partner_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "business_partner_destinations" (
	"business_partner_id" text NOT NULL,
	"destination_id" text NOT NULL,
	CONSTRAINT "business_partner_destinations_business_partner_id_destination_id_pk" PRIMARY KEY("business_partner_id","destination_id")
);
--> statement-breakpoint
CREATE TABLE "business_partners" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"type" "business_partner_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo" text,
	"cover_image" text,
	"email" text,
	"phone" text,
	"website" text,
	"address" jsonb,
	"destination_id" text,
	"details" jsonb,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"rejected_by" text,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"average_rating" double precision DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"approved_review_count" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_review_likes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_review_replies" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" text NOT NULL,
	"user_id" text NOT NULL,
	"comment" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_partner_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" double precision NOT NULL,
	"comment" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_settings" (
	"seller_id" text PRIMARY KEY NOT NULL,
	"category_settings" jsonb,
	"destination_settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_itinerary_partners" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" text NOT NULL,
	"day_id" text NOT NULL,
	"role" "itinerary_partner_role" NOT NULL,
	"business_partner_id" text,
	"name" text NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "booking_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_category_targets" ADD CONSTRAINT "ad_category_targets_ad_id_advertisements_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."advertisements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_category_targets" ADD CONSTRAINT "ad_category_targets_category_id_global_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."global_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_daily_stats" ADD CONSTRAINT "ad_daily_stats_ad_id_advertisements_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."advertisements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_destination_targets" ADD CONSTRAINT "ad_destination_targets_ad_id_advertisements_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."advertisements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_destination_targets" ADD CONSTRAINT "ad_destination_targets_destination_id_global_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."global_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partner_categories" ADD CONSTRAINT "business_partner_categories_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partner_categories" ADD CONSTRAINT "business_partner_categories_category_id_global_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."global_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partner_destinations" ADD CONSTRAINT "business_partner_destinations_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partner_destinations" ADD CONSTRAINT "business_partner_destinations_destination_id_global_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."global_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partners" ADD CONSTRAINT "business_partners_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partners" ADD CONSTRAINT "business_partners_destination_id_global_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."global_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partners" ADD CONSTRAINT "business_partners_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partners" ADD CONSTRAINT "business_partners_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_likes" ADD CONSTRAINT "business_review_likes_review_id_business_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."business_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_likes" ADD CONSTRAINT "business_review_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_replies" ADD CONSTRAINT "business_review_replies_review_id_business_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."business_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_replies" ADD CONSTRAINT "business_review_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_settings" ADD CONSTRAINT "seller_settings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_itinerary_partners" ADD CONSTRAINT "tour_itinerary_partners_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_itinerary_partners" ADD CONSTRAINT "tour_itinerary_partners_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ad_daily_stats_ad_date_idx" ON "ad_daily_stats" USING btree ("ad_id","date");--> statement-breakpoint
CREATE INDEX "advertisements_partner_idx" ON "advertisements" USING btree ("business_partner_id");--> statement-breakpoint
CREATE INDEX "advertisements_slot_idx" ON "advertisements" USING btree ("placement_slot","campaign_status","approval_status");--> statement-breakpoint
CREATE INDEX "business_documents_partner_idx" ON "business_documents" USING btree ("business_partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_partners_slug_idx" ON "business_partners" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "business_partners_owner_idx" ON "business_partners" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "business_partners_type_idx" ON "business_partners" USING btree ("type");--> statement-breakpoint
CREATE INDEX "business_partners_status_idx" ON "business_partners" USING btree ("approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_review_likes_unique_idx" ON "business_review_likes" USING btree ("review_id","user_id");--> statement-breakpoint
CREATE INDEX "business_review_replies_review_idx" ON "business_review_replies" USING btree ("review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_reviews_partner_user_idx" ON "business_reviews" USING btree ("business_partner_id","user_id");--> statement-breakpoint
CREATE INDEX "business_reviews_status_idx" ON "business_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tour_itinerary_partners_tour_day_idx" ON "tour_itinerary_partners" USING btree ("tour_id","day_id");--> statement-breakpoint
CREATE INDEX "tour_itinerary_partners_partner_idx" ON "tour_itinerary_partners" USING btree ("business_partner_id");