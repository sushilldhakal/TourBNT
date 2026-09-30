CREATE TYPE "public"."itinerary_request_actor_role" AS ENUM('agency', 'partner', 'system');--> statement-breakpoint
ALTER TYPE "public"."itinerary_request_status" ADD VALUE 'held' BEFORE 'confirmed';--> statement-breakpoint
ALTER TYPE "public"."itinerary_request_status" ADD VALUE 'countered' BEFORE 'declined';--> statement-breakpoint
ALTER TYPE "public"."itinerary_request_status" ADD VALUE 'expired';--> statement-breakpoint
CREATE TABLE "itinerary_request_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"from_status" "itinerary_request_status",
	"to_status" "itinerary_request_status" NOT NULL,
	"actor_id" text,
	"actor_role" "itinerary_request_actor_role" NOT NULL,
	"units_at_event" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "units_requested" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "hold_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "respond_by_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "counter_units" integer;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "counter_date" date;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "counter_time" text;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "counter_notes" text;--> statement-breakpoint
ALTER TABLE "itinerary_partner_requests" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tour_itinerary_partners" ADD COLUMN "units_requested" integer;--> statement-breakpoint
ALTER TABLE "tour_itinerary_partners" ADD COLUMN "unit_type" text;--> statement-breakpoint
ALTER TABLE "itinerary_request_events" ADD CONSTRAINT "itinerary_request_events_request_id_itinerary_partner_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."itinerary_partner_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_request_events" ADD CONSTRAINT "itinerary_request_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itinerary_request_events_request_idx" ON "itinerary_request_events" USING btree ("request_id","created_at");