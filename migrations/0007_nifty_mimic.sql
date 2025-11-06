CREATE TYPE "public"."criteria_type" AS ENUM('points', 'deals', 'combined');--> statement-breakpoint
CREATE TABLE "grand_prize_criteria" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"criteria_type" "criteria_type" DEFAULT 'combined' NOT NULL,
	"min_points" integer DEFAULT 0,
	"min_deals" integer DEFAULT 0,
	"region" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"points_weight" integer DEFAULT 60,
	"deals_weight" integer DEFAULT 40,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grand_prize_winners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"criteria_id" varchar NOT NULL,
	"points" integer NOT NULL,
	"deals" integer NOT NULL,
	"score" numeric(10, 2) NOT NULL,
	"rank" integer NOT NULL,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "grand_prize_winners" ADD CONSTRAINT "grand_prize_winners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grand_prize_winners" ADD CONSTRAINT "grand_prize_winners_criteria_id_grand_prize_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."grand_prize_criteria"("id") ON DELETE no action ON UPDATE no action;