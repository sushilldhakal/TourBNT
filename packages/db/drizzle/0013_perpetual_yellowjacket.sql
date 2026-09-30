CREATE TABLE "business_partner_availability_blocks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_partner_id" text NOT NULL,
	"date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "service_end_time" text;--> statement-breakpoint
ALTER TABLE "business_partner_availability_blocks" ADD CONSTRAINT "business_partner_availability_blocks_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_partner_availability_blocks_partner_date_idx" ON "business_partner_availability_blocks" USING btree ("business_partner_id","date");