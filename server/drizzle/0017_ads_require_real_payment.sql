-- Undo 0016's "count already-approved ads as paid" rule. It marked every approved ad paid,
-- including demo/seed ads, which then went live at Rs 0. Every campaign that was never
-- actually priced (price_amount = 0) now needs a real admin "Mark paid" to run again.
UPDATE "advertisements"
SET "is_paid" = false,
    "paid_at" = NULL,
    "campaign_status" = CASE WHEN "campaign_status" = 'active' THEN 'paused'::"ad_campaign_status" ELSE "campaign_status" END,
    "updated_at" = now()
WHERE "price_amount" = 0 AND "is_paid" = true;
