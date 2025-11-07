ALTER TYPE "public"."user_role" ADD VALUE 'regional-admin';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'super-admin';--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "region_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_region_id" varchar;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_region_id_region_configs_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."region_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_region_id_region_configs_id_fk" FOREIGN KEY ("admin_region_id") REFERENCES "public"."region_configs"("id") ON DELETE no action ON UPDATE no action;