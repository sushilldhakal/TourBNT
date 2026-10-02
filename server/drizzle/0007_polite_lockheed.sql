CREATE INDEX "tour_authors_user_idx" ON "tour_authors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tour_categories_category_idx" ON "tour_categories" USING btree ("category_id");