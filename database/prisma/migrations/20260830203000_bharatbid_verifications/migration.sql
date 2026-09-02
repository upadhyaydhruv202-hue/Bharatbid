-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('gst', 'mca', 'udyam', 'gem');

-- CreateEnum
CREATE TYPE "VerificationIdentifierType" AS ENUM ('gstin', 'cin', 'udyam', 'pan');

-- CreateEnum
CREATE TYPE "VerificationSourceMode" AS ENUM ('demo', 'external');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('not_started', 'queued', 'processing', 'matched', 'mismatched', 'not_found', 'error');

-- CreateEnum
CREATE TYPE "VerificationIdentifierOrigin" AS ENUM ('extracted', 'manual', 'bidder_profile');

-- CreateTable
CREATE TABLE "bid_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bid_submission_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "document_id" UUID,
    "group_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "identifier_type" "VerificationIdentifierType" NOT NULL,
    "identifier_value" TEXT NOT NULL,
    "identifier_origin" "VerificationIdentifierOrigin" NOT NULL,
    "source" "VerificationSource" NOT NULL,
    "source_mode" "VerificationSourceMode" NOT NULL,
    "source_display_name" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "explanation" TEXT NOT NULL,
    "field_comparisons" JSONB NOT NULL,
    "source_snapshot" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "requested_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bid_verifications_bid_submission_id_created_at_idx" ON "bid_verifications"("bid_submission_id", "created_at");

-- CreateIndex
CREATE INDEX "bid_verifications_bid_submission_id_is_latest_idx" ON "bid_verifications"("bid_submission_id", "is_latest");

-- CreateIndex
CREATE INDEX "bid_verifications_bidder_id_idx" ON "bid_verifications"("bidder_id");

-- CreateIndex
CREATE INDEX "bid_verifications_document_id_idx" ON "bid_verifications"("document_id");

-- CreateIndex
CREATE INDEX "bid_verifications_identifier_type_idx" ON "bid_verifications"("identifier_type");

-- CreateIndex
CREATE INDEX "bid_verifications_source_idx" ON "bid_verifications"("source");

-- CreateIndex
CREATE INDEX "bid_verifications_status_idx" ON "bid_verifications"("status");

-- CreateIndex
CREATE INDEX "bid_verifications_group_id_attempt_number_idx" ON "bid_verifications"("group_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "bid_verifications" ADD CONSTRAINT "bid_verifications_bid_submission_id_fkey" FOREIGN KEY ("bid_submission_id") REFERENCES "bid_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_verifications" ADD CONSTRAINT "bid_verifications_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "bidders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_verifications" ADD CONSTRAINT "bid_verifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "bid_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_verifications" ADD CONSTRAINT "bid_verifications_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
