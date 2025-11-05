ALTER TABLE "users" ADD COLUMN "login_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_token_expiry" timestamp;