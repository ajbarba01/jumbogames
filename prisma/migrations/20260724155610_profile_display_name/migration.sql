-- Add displayName nullable, backfill from the email local-part, then enforce NOT NULL.
ALTER TABLE "profiles" ADD COLUMN "display_name" TEXT;
UPDATE "profiles" SET "display_name" = split_part("email", '@', 1) WHERE "display_name" IS NULL;
ALTER TABLE "profiles" ALTER COLUMN "display_name" SET NOT NULL;
