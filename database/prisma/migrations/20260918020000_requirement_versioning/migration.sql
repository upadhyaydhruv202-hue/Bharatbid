ALTER TABLE "tender_requirements"
  ADD COLUMN "group_id" uuid,
  ADD COLUMN "version" integer NOT NULL DEFAULT 1,
  ADD COLUMN "previous_version_id" uuid,
  ADD COLUMN "change_reason" text,
  ADD COLUMN "created_by_id" uuid,
  ADD COLUMN "effective_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "tender_requirements"
SET "group_id" = "id"
WHERE "group_id" IS NULL;

ALTER TABLE "tender_requirements"
  ALTER COLUMN "group_id" SET NOT NULL;

ALTER TABLE "tender_requirements"
  ADD CONSTRAINT "tender_requirements_previous_version_id_fkey"
  FOREIGN KEY ("previous_version_id") REFERENCES "tender_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tender_requirements"
  ADD CONSTRAINT "tender_requirements_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tender_requirements_tender_id_group_id_version_idx"
  ON "tender_requirements"("tender_id", "group_id", "version");
