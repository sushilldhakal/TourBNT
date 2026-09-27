-- gen_random_uuid() needs pgcrypto on Postgres < 16 (Neon/Supabase/RDS on
-- Postgres 13-15); it's built into core on 16+, where this is a harmless no-op.
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('destination_rejected', 'destination_approved', 'destination_deleted', 'general');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partial', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('Draft', 'Published', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tour_status" AS ENUM('Draft', 'Published', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'seller', 'subscriber');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" text NOT NULL,
	"tour_title" text NOT NULL,
	"tour_code" text NOT NULL,
	"user_id" text,
	"is_guest_booking" boolean DEFAULT false NOT NULL,
	"guest_info" jsonb,
	"departure_date" timestamp with time zone NOT NULL,
	"participants" jsonb NOT NULL,
	"travelers" jsonb DEFAULT '[]'::jsonb,
	"pricing_option_id" text,
	"pricing" jsonb NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"special_requests" text,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_method" text,
	"transaction_id" text,
	"paid_amount" double precision DEFAULT 0 NOT NULL,
	"payment_details" jsonb,
	"booking_date" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"booking_reference" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"text" text NOT NULL,
	"approve" boolean DEFAULT false NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"field_type" text NOT NULL,
	"value" jsonb DEFAULT '[]'::jsonb,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"slug" text NOT NULL,
	"reason" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"created_by" text NOT NULL,
	"approved_by" text,
	"rejected_by" text,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_destinations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"cover_image" text,
	"country" text NOT NULL,
	"region" text,
	"city" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"created_by" text NOT NULL,
	"approved_by" text,
	"rejected_by" text,
	"rejection_reason" text,
	"reason" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"popularity" integer DEFAULT 0 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"seller_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"url" text NOT NULL,
	"secure_url" text,
	"original_filename" text,
	"display_name" text,
	"public_id" text,
	"description" text,
	"title" text,
	"asset_id" text,
	"width" integer,
	"height" integer,
	"format" text,
	"resource_type" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"pages" integer,
	"bytes" integer,
	"etag" text,
	"asset_folder" text DEFAULT '',
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" text NOT NULL,
	"sender_id" text,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_id" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"image" text DEFAULT '',
	"status" "post_status" DEFAULT 'Draft' NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"enable_comments" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_replies" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" text NOT NULL,
	"user_id" text NOT NULL,
	"comment" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" text NOT NULL,
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
CREATE TABLE "seller_category_preferences" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" text NOT NULL,
	"category_id" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"custom_name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"last_used" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_destination_preferences" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" text NOT NULL,
	"destination_id" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"custom_name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"last_used" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_authors" (
	"tour_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "tour_authors_tour_id_user_id_pk" PRIMARY KEY("tour_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tour_categories" (
	"tour_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "tour_categories_tour_id_category_id_pk" PRIMARY KEY("tour_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"excerpt" text,
	"tour_status" "tour_status" DEFAULT 'Draft' NOT NULL,
	"cover_image" text,
	"file" text,
	"outline" text,
	"destination_id" text,
	"itinerary" jsonb DEFAULT '[]'::jsonb,
	"include" jsonb DEFAULT '[]'::jsonb,
	"exclude" jsonb DEFAULT '[]'::jsonb,
	"facts" jsonb DEFAULT '[]'::jsonb,
	"faqs" jsonb DEFAULT '[]'::jsonb,
	"gallery" jsonb DEFAULT '[]'::jsonb,
	"location" jsonb,
	"fixed_departures" jsonb DEFAULT '[]'::jsonb,
	"discount" jsonb,
	"pricing_options" jsonb DEFAULT '[]'::jsonb,
	"pricing_groups" jsonb DEFAULT '[]'::jsonb,
	"tour_dates" jsonb,
	"enquiry" boolean DEFAULT true NOT NULL,
	"average_rating" double precision DEFAULT 0 NOT NULL,
	"approved_review_count" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"is_special_offer" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"price" double precision,
	"price_per_person" boolean DEFAULT true NOT NULL,
	"min_size" integer DEFAULT 1 NOT NULL,
	"max_size" integer DEFAULT 10 NOT NULL,
	"group_size" integer,
	"sale_enabled" boolean DEFAULT false NOT NULL,
	"sale_price" double precision,
	"price_lock_date" timestamp with time zone,
	"pricing_options_enabled" boolean DEFAULT false NOT NULL,
	"fixed_departure" boolean DEFAULT false NOT NULL,
	"multiple_dates" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"cloudinary_cloud" text DEFAULT '',
	"cloudinary_api_key" text DEFAULT '',
	"cloudinary_api_secret" text DEFAULT '',
	"openai_api_key" text DEFAULT '',
	"google_api_key" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wishlists" (
	"user_id" text NOT NULL,
	"tour_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_wishlists_user_id_tour_id_pk" PRIMARY KEY("user_id","tour_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"avatar" text,
	"phone" text,
	"verified" boolean DEFAULT false NOT NULL,
	"payment_methods" jsonb DEFAULT '[]'::jsonb,
	"seller_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_categories" ADD CONSTRAINT "global_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_categories" ADD CONSTRAINT "global_categories_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_categories" ADD CONSTRAINT "global_categories_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_destinations" ADD CONSTRAINT "global_destinations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_destinations" ADD CONSTRAINT "global_destinations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_destinations" ADD CONSTRAINT "global_destinations_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_destinations" ADD CONSTRAINT "global_destinations_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_category_preferences" ADD CONSTRAINT "seller_category_preferences_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_category_preferences" ADD CONSTRAINT "seller_category_preferences_category_id_global_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."global_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_destination_preferences" ADD CONSTRAINT "seller_destination_preferences_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_destination_preferences" ADD CONSTRAINT "seller_destination_preferences_destination_id_global_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."global_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_authors" ADD CONSTRAINT "tour_authors_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_authors" ADD CONSTRAINT "tour_authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_categories" ADD CONSTRAINT "tour_categories_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_categories" ADD CONSTRAINT "tour_categories_category_id_global_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."global_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_destination_id_global_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."global_destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wishlists" ADD CONSTRAINT "user_wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wishlists" ADD CONSTRAINT "user_wishlists_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_reference_idx" ON "bookings" USING btree ("booking_reference");--> statement-breakpoint
CREATE INDEX "bookings_tour_date_idx" ON "bookings" USING btree ("tour_id","departure_date");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_likes_unique_idx" ON "comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "facts_user_idx" ON "facts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "faqs_user_idx" ON "faqs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "global_categories_slug_idx" ON "global_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "global_categories_approval_idx" ON "global_categories" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "global_destinations_approval_idx" ON "global_destinations" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "global_destinations_country_idx" ON "global_destinations" USING btree ("country","region","city");--> statement-breakpoint
CREATE INDEX "media_assets_user_idx" ON "media_assets" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_idx" ON "notifications" USING btree ("recipient_id","is_read");--> statement-breakpoint
CREATE INDEX "review_replies_review_idx" ON "review_replies" USING btree ("review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_tour_user_idx" ON "reviews" USING btree ("tour_id","user_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_category_prefs_idx" ON "seller_category_preferences" USING btree ("seller_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_destination_prefs_idx" ON "seller_destination_preferences" USING btree ("seller_id","destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "tours_code_idx" ON "tours" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tours_status_idx" ON "tours" USING btree ("tour_status");--> statement-breakpoint
CREATE INDEX "tours_destination_idx" ON "tours" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");