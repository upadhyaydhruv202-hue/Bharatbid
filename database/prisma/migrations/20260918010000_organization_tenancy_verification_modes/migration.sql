-- Organization tenancy + verification provenance modes.
-- Does not drop existing data.

CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

CREATE TABLE "organization_members" (
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id","user_id")
);

CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "organizations" ("id", "slug", "name")
VALUES ('11111111-1111-4111-8111-aaaaaaaaaaa1', 'cpcl-demo', 'Chennai Petroleum Corporation Limited')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "organization_members" ("organization_id", "user_id", "is_default")
SELECT '11111111-1111-4111-8111-aaaaaaaaaaa1', u."id", true
FROM "users" u
ON CONFLICT ("organization_id", "user_id") DO NOTHING;

ALTER TABLE "tenders" ADD COLUMN "organization_id" UUID;
UPDATE "tenders" SET "organization_id" = '11111111-1111-4111-8111-aaaaaaaaaaa1' WHERE "organization_id" IS NULL;
ALTER TABLE "tenders" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "tenders_organization_id_status_closing_date_idx" ON "tenders"("organization_id", "status", "closing_date");
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bidders" ADD COLUMN "organization_id" UUID;
UPDATE "bidders" SET "organization_id" = '11111111-1111-4111-8111-aaaaaaaaaaa1' WHERE "organization_id" IS NULL;
ALTER TABLE "bidders" ALTER COLUMN "organization_id" SET NOT NULL;
CREATE INDEX "bidders_organization_id_legal_name_idx" ON "bidders"("organization_id", "legal_name");
ALTER TABLE "bidders" ADD CONSTRAINT "bidders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "VerificationSourceMode" ADD VALUE IF NOT EXISTS 'sandbox';
ALTER TYPE "VerificationSourceMode" ADD VALUE IF NOT EXISTS 'live';
ALTER TYPE "VerificationSourceMode" ADD VALUE IF NOT EXISTS 'manual';

ALTER TABLE "bid_verifications" ADD COLUMN "provider_reference" TEXT;
ALTER TABLE "bid_verifications" ADD COLUMN "request_id" TEXT;
