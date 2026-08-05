ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'seeker';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "location" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cv" text;--> statement-breakpoint
DROP TYPE "public"."user_role";