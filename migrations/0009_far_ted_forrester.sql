ALTER TABLE "monthly_region_prizes" ADD COLUMN "rank" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_region_prizes" ADD COLUMN "prize_value" numeric(10, 2);