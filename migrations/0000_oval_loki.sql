CREATE TYPE "public"."deal_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('new_customer', 'renewal');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('software', 'hardware', 'equipment');--> statement-breakpoint
CREATE TYPE "public"."region_category" AS ENUM('ENTERPRISE', 'SMB', 'MSSP');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('NOLA', 'SOLA', 'BRASIL', 'MEXICO');--> statement-breakpoint
CREATE TYPE "public"."reward_status" AS ENUM('pending', 'approved', 'rejected', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'shipped', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"multiplier" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"product_type" "product_type" NOT NULL,
	"product_name" text NOT NULL,
	"deal_value" numeric(12, 2) NOT NULL,
	"deal_type" "deal_type" DEFAULT 'new_customer' NOT NULL,
	"quantity" integer NOT NULL,
	"close_date" timestamp NOT NULL,
	"client_info" text,
	"license_agreement_number" text,
	"status" "deal_status" DEFAULT 'pending' NOT NULL,
	"points_earned" integer DEFAULT 0,
	"goals_earned" numeric(10, 2) DEFAULT '0',
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"deal_id" varchar,
	"goals" numeric(10, 2) NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"region_config_id" varchar,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_region_prizes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_config_id" varchar NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"prize_name" text NOT NULL,
	"prize_description" text,
	"goal_target" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"software_rate" integer DEFAULT 1000 NOT NULL,
	"hardware_rate" integer DEFAULT 5000 NOT NULL,
	"equipment_rate" integer DEFAULT 10000 NOT NULL,
	"grand_prize_threshold" integer DEFAULT 50000 NOT NULL,
	"redemption_start_date" timestamp,
	"redemption_end_date" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "points_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"deal_id" varchar,
	"reward_id" varchar,
	"points" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" "region" NOT NULL,
	"category" "region_category" NOT NULL,
	"subcategory" text,
	"name" text NOT NULL,
	"new_customer_goal_rate" integer DEFAULT 1000 NOT NULL,
	"renewal_goal_rate" integer DEFAULT 2000 NOT NULL,
	"monthly_goal_target" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_region_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reward_id" varchar NOT NULL,
	"region" "region",
	"country" text,
	"region_config_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"points_cost" integer NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"stock_quantity" integer,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_to" varchar,
	"admin_response" text,
	"responded_at" timestamp,
	"responded_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"reward_id" varchar NOT NULL,
	"status" "reward_status" DEFAULT 'pending' NOT NULL,
	"shipment_status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"redeemed_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"delivery_address" text,
	"shipped_at" timestamp,
	"shipped_by" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"country" text NOT NULL,
	"region" "region",
	"region_category" "region_category",
	"region_subcategory" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"invite_token" text,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals_history" ADD CONSTRAINT "goals_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals_history" ADD CONSTRAINT "goals_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals_history" ADD CONSTRAINT "goals_history_region_config_id_region_configs_id_fk" FOREIGN KEY ("region_config_id") REFERENCES "public"."region_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_region_prizes" ADD CONSTRAINT "monthly_region_prizes_region_config_id_region_configs_id_fk" FOREIGN KEY ("region_config_id") REFERENCES "public"."region_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_config" ADD CONSTRAINT "points_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_history" ADD CONSTRAINT "points_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_history" ADD CONSTRAINT "points_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_history" ADD CONSTRAINT "points_history_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_region_assignments" ADD CONSTRAINT "reward_region_assignments_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_region_assignments" ADD CONSTRAINT "reward_region_assignments_region_config_id_region_configs_id_fk" FOREIGN KEY ("region_config_id") REFERENCES "public"."region_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_shipped_by_users_id_fk" FOREIGN KEY ("shipped_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;