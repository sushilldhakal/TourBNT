ALTER TABLE "business_partners" ADD COLUMN "approval_hold_reason" text;--> statement-breakpoint
ALTER TABLE "tour_itinerary_partners" ADD COLUMN "open_for_all" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TYPE "public"."itinerary_slot_application_status" AS ENUM('applied', 'selected', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TABLE "itinerary_slot_applications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_itinerary_partner_id" text NOT NULL,
	"business_partner_id" text NOT NULL,
	"service_date" date NOT NULL,
	"source_departure_date" timestamp with time zone,
	"message" text,
	"units_offered" integer,
	"status" "itinerary_slot_application_status" DEFAULT 'applied' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "partner_deal_withdrawals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"business_partner_id" text NOT NULL,
	"explanation" text NOT NULL,
	"evidence_sufficient" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "itinerary_slot_applications" ADD CONSTRAINT "itinerary_slot_applications_tour_itinerary_partner_id_tour_itinerary_partners_id_fk" FOREIGN KEY ("tour_itinerary_partner_id") REFERENCES "public"."tour_itinerary_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_slot_applications" ADD CONSTRAINT "itinerary_slot_applications_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_deal_withdrawals" ADD CONSTRAINT "partner_deal_withdrawals_request_id_itinerary_partner_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."itinerary_partner_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_deal_withdrawals" ADD CONSTRAINT "partner_deal_withdrawals_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tour_itinerary_partners_open_idx" ON "tour_itinerary_partners" USING btree ("open_for_all");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_slot_applications_unique_idx" ON "itinerary_slot_applications" USING btree ("tour_itinerary_partner_id","business_partner_id","service_date");--> statement-breakpoint
CREATE INDEX "itinerary_slot_applications_partner_idx" ON "itinerary_slot_applications" USING btree ("business_partner_id","status");--> statement-breakpoint
CREATE INDEX "itinerary_slot_applications_link_date_idx" ON "itinerary_slot_applications" USING btree ("tour_itinerary_partner_id","service_date");--> statement-breakpoint
CREATE INDEX "partner_deal_withdrawals_partner_idx" ON "partner_deal_withdrawals" USING btree ("business_partner_id","created_at");--> statement-breakpoint
CREATE INDEX "partner_deal_withdrawals_request_idx" ON "partner_deal_withdrawals" USING btree ("request_id");