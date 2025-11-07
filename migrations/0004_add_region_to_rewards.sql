-- Add region column to rewards table
ALTER TABLE "rewards" ADD COLUMN "region" "region_enum" NOT NULL DEFAULT 'NOLA';

-- Remove the default after adding the column (so future inserts must specify region)
ALTER TABLE "rewards" ALTER COLUMN "region" DROP DEFAULT;
