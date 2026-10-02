-- pax_presets, discount_presets and pricing_option_presets are in the schema (and in the
-- drizzle snapshots) but no earlier migration created them: databases set up with
-- `drizzle-kit push` have them, ones built from migrations alone did not. Every statement is
-- idempotent, so this is a no-op where the tables already exist and creates them elsewhere.
CREATE TABLE IF NOT EXISTS "discount_presets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'percentage' NOT NULL,
	"value" double precision DEFAULT 0 NOT NULL,
	"date_range" jsonb,
	"timezone" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pax_presets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"min_size" integer DEFAULT 1 NOT NULL,
	"max_size" integer DEFAULT 10 NOT NULL,
	"price_per_person" boolean DEFAULT true NOT NULL,
	"group_size" integer,
	"default_pricing_option_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_option_presets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discount_presets_user_id_users_id_fk') THEN
    ALTER TABLE "discount_presets" ADD CONSTRAINT "discount_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pax_presets_user_id_users_id_fk') THEN
    ALTER TABLE "pax_presets" ADD CONSTRAINT "pax_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_option_presets_user_id_users_id_fk') THEN
    ALTER TABLE "pricing_option_presets" ADD CONSTRAINT "pricing_option_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discount_presets_user_idx" ON "discount_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pax_presets_user_idx" ON "pax_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_option_presets_user_idx" ON "pricing_option_presets" USING btree ("user_id");
