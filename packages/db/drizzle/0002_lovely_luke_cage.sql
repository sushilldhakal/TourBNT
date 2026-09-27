CREATE TYPE "public"."payment_type" AS ENUM('full_payment', 'deposit_percentage', 'pay_on_arrival');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_type" "payment_type" DEFAULT 'full_payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "payment_options" jsonb;