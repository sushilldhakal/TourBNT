CREATE TABLE "content_presets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content_type" text DEFAULT 'description' NOT NULL,
	"content" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_presets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'flexible' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recurrence" jsonb,
	"default_selected_pricing_options" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_presets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"days" integer DEFAULT 1 NOT NULL,
	"nights" integer DEFAULT 0 NOT NULL,
	"itinerary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outline" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_template_presets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"default_category_id" text,
	"default_destination_id" text,
	"pricing_preset_id" text,
	"discount_preset_id" text,
	"pax_preset_id" text,
	"date_preset_id" text,
	"itinerary_preset_id" text,
	"description_preset_id" text,
	"include_preset_id" text,
	"exclude_preset_id" text,
	"default_fact_ids" jsonb DEFAULT '[]'::jsonb,
	"default_faq_ids" jsonb DEFAULT '[]'::jsonb,
	"default_gallery_ids" jsonb DEFAULT '[]'::jsonb,
	"tour_defaults" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_presets" ADD CONSTRAINT "content_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_presets" ADD CONSTRAINT "date_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_presets" ADD CONSTRAINT "itinerary_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_template_presets" ADD CONSTRAINT "tour_template_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_presets_user_idx" ON "content_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "date_presets_user_idx" ON "date_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "itinerary_presets_user_idx" ON "itinerary_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tour_template_presets_user_idx" ON "tour_template_presets" USING btree ("user_id");