CREATE TYPE "public"."itinerary_request_status" AS ENUM('pending', 'confirmed', 'declined');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'itinerary_request_created';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'itinerary_request_confirmed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'itinerary_request_declined';--> statement-breakpoint
CREATE TABLE "business_partner_capacity" (
	"business_partner_id" text PRIMARY KEY NOT NULL,
	"unit_label" text DEFAULT 'unit' NOT NULL,
	"default_daily_capacity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_partner_capacity_overrides" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_partner_id" text NOT NULL,
	"date" date NOT NULL,
	"capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_partner_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" text NOT NULL,
	"tour_itinerary_partner_id" text NOT NULL,
	"business_partner_id" text NOT NULL,
	"role" "itinerary_partner_role" NOT NULL,
	"service_date" date NOT NULL,
	"service_time" text,
	"headcount" integer DEFAULT 0 NOT NULL,
	"status" "itinerary_request_status" DEFAULT 'pending' NOT NULL,
	"capacity_confirmed" integer,
	"response_notes" text,
	"responded_at" timestamp with time zone,
	"responded_by" text,
	"source_departure_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_request_booking_contributions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"headcount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_partner_capacity" ADD CONSTRAINT "business_partner_capacity_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_partner_capacity_overrides" ADD CONSTRAINT "business_partner_capacity_overrides_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD CONSTRAINT "itinerary_partner_requests_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD CONSTRAINT "itinerary_partner_requests_tour_itinerary_partner_id_tour_itinerary_partners_id_fk" FOREIGN KEY ("tour_itinerary_partner_id") REFERENCES "public"."tour_itinerary_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD CONSTRAINT "itinerary_partner_requests_business_partner_id_business_partners_id_fk" FOREIGN KEY ("business_partner_id") REFERENCES "public"."business_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD CONSTRAINT "itinerary_partner_requests_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_request_booking_contributions" ADD CONSTRAINT "itinerary_request_booking_contributions_request_id_itinerary_partner_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."itinerary_partner_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_request_booking_contributions" ADD CONSTRAINT "itinerary_request_booking_contributions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_partner_capacity_overrides_partner_date_idx" ON "business_partner_capacity_overrides" USING btree ("business_partner_id","date");--> statement-breakpoint
CREATE INDEX "itinerary_partner_requests_partner_date_idx" ON "itinerary_partner_requests" USING btree ("business_partner_id","service_date");--> statement-breakpoint
CREATE INDEX "itinerary_partner_requests_tour_idx" ON "itinerary_partner_requests" USING btree ("tour_id");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_partner_requests_dedupe_idx" ON "itinerary_partner_requests" USING btree ("tour_itinerary_partner_id","service_date","service_time");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_request_contributions_request_booking_idx" ON "itinerary_request_booking_contributions" USING btree ("request_id","booking_id");