-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('draft', 'open', 'under_evaluation', 'closed', 'awarded', 'cancelled');

-- CreateEnum
CREATE TYPE "TenderRequirementType" AS ENUM ('statutory', 'eligibility', 'document', 'financial', 'technical', 'organizational', 'declaration', 'tender_specific', 'other');

-- CreateEnum
CREATE TYPE "BidSubmissionStatus" AS ENUM ('draft', 'submitted', 'under_review', 'withdrawn', 'finalized');

-- CreateTable
CREATE TABLE "tenders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organization_name" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "TenderStatus" NOT NULL DEFAULT 'draft',
    "issue_date" TIMESTAMP(3) NOT NULL,
    "closing_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tender_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tender_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requirement_type" "TenderRequirementType" NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tender_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bidders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "pan" TEXT,
    "gstin" TEXT,
    "cin" TEXT,
    "udyam_registration_number" TEXT,
    "registered_address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bidders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tender_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "submission_reference" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "status" "BidSubmissionStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenders_reference_number_key" ON "tenders"("reference_number");

-- CreateIndex
CREATE INDEX "tenders_status_closing_date_idx" ON "tenders"("status", "closing_date");

-- CreateIndex
CREATE INDEX "tenders_closing_date_idx" ON "tenders"("closing_date");

-- CreateIndex
CREATE INDEX "tenders_created_at_idx" ON "tenders"("created_at");

-- CreateIndex
CREATE INDEX "tender_requirements_tender_id_sort_order_idx" ON "tender_requirements"("tender_id", "sort_order");

-- CreateIndex
CREATE INDEX "tender_requirements_tender_id_active_idx" ON "tender_requirements"("tender_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "bidders_pan_key" ON "bidders"("pan");

-- CreateIndex
CREATE UNIQUE INDEX "bidders_gstin_key" ON "bidders"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "bidders_cin_key" ON "bidders"("cin");

-- CreateIndex
CREATE UNIQUE INDEX "bidders_udyam_registration_number_key" ON "bidders"("udyam_registration_number");

-- CreateIndex
CREATE INDEX "bidders_legal_name_idx" ON "bidders"("legal_name");

-- CreateIndex
CREATE INDEX "bidders_city_state_idx" ON "bidders"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "bid_submissions_submission_reference_key" ON "bid_submissions"("submission_reference");

-- CreateIndex
CREATE UNIQUE INDEX "bid_submissions_tender_id_bidder_id_key" ON "bid_submissions"("tender_id", "bidder_id");

-- CreateIndex
CREATE INDEX "bid_submissions_tender_id_status_idx" ON "bid_submissions"("tender_id", "status");

-- CreateIndex
CREATE INDEX "bid_submissions_bidder_id_created_at_idx" ON "bid_submissions"("bidder_id", "created_at");

-- CreateIndex
CREATE INDEX "bid_submissions_status_submitted_at_idx" ON "bid_submissions"("status", "submitted_at");

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_requirements" ADD CONSTRAINT "tender_requirements_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "bidders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Check constraints
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_reference_number_len_check" CHECK (
    char_length(reference_number) BETWEEN 3 AND 64
);

ALTER TABLE "tenders" ADD CONSTRAINT "tenders_title_len_check" CHECK (
    char_length(title) BETWEEN 3 AND 300
);

ALTER TABLE "tenders" ADD CONSTRAINT "tenders_dates_check" CHECK (
    closing_date >= issue_date
);

ALTER TABLE "tender_requirements" ADD CONSTRAINT "tender_requirements_name_len_check" CHECK (
    char_length(name) BETWEEN 1 AND 200
);

ALTER TABLE "bidders" ADD CONSTRAINT "bidders_legal_name_len_check" CHECK (
    char_length(legal_name) BETWEEN 2 AND 300
);

ALTER TABLE "bidders" ADD CONSTRAINT "bidders_pincode_check" CHECK (
    pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$'
);

ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_reference_len_check" CHECK (
    char_length(submission_reference) BETWEEN 3 AND 64
);
