CREATE TYPE "public"."unit_block_channel" AS ENUM('direct', 'private', 'other', 'maintenance');--> statement-breakpoint
CREATE TABLE "business_partner_unit_type_blocks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_type_id" text NOT NULL,
	"date" date NOT NULL,
	"channel" "unit_block_channel" NOT NULL,
	"blocked_count" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_partner_unit_types" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_partner_id" text NOT NULL,
	"name" text NOT NULL,
	"total_units" integer DEFAULT 0 NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "unit_type_id" text;--> statement-breakpoint
ALTER TABLE "tour_itinerary_partners" ADD COLUMN "unit_type_id" text;--> statement-breakpoint
ALTER TABLE "business_partner_unit_type_blocks" ADD CONSTRAINT "business_partner_unit_type_blocks_unit_type_id_business_partner_unit_types_id_fk" FOREIGN KEY ("unit_type_id") REFERENCES "public"."business_partner_unit_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partner_unit_types" ADD CONSTRAINT "business_partner_unit_types_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_partner_unit_type_blocks_unique_idx" ON "business_partner_unit_type_blocks" USING btree ("unit_type_id","date","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "business_partner_unit_types_partner_name_idx" ON "business_partner_unit_types" USING btree ("business_partner_id","name");--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD CONSTRAINT "itinerary_partner_requests_unit_type_id_business_partner_unit_types_id_fk" FOREIGN KEY ("unit_type_id") REFERENCES "public"."business_partner_unit_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_itinerary_partners" ADD CONSTRAINT "tour_itinerary_partners_unit_type_id_business_partner_unit_types_id_fk" FOREIGN KEY ("unit_type_id") REFERENCES "public"."business_partner_unit_types"("id") ON DELETE set null ON UPDATE no action;