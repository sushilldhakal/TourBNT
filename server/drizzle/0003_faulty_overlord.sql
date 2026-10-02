ALTER TABLE "users" ADD COLUMN "media_folder" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_media_folder_idx" ON "users" USING btree ("media_folder");--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "cloudinary_cloud";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "cloudinary_api_key";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "cloudinary_api_secret";