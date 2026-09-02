-- CreateEnum
CREATE TYPE "CrossVerificationComparisonType" AS ENUM ('gst_mca', 'gst_udyam', 'mca_udyam');

-- CreateEnum
CREATE TYPE "CrossVerificationStatus" AS ENUM ('consistent', 'inconsistent', 'insufficient_evidence', 'not_comparable', 'error');

-- CreateEnum
CREATE TYPE "CrossVerificationSourceBasis" AS ENUM ('demo', 'external', 'mixed');

-- CreateTable
CREATE TABLE "bid_cross_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bid_submission_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "left_verification_id" UUID NOT NULL,
    "right_verification_id" UUID NOT NULL,
    "comparison_type" "CrossVerificationComparisonType" NOT NULL,
    "status" "CrossVerificationStatus" NOT NULL,
    "source_basis" "CrossVerificationSourceBasis" NOT NULL,
    "left_source" "VerificationSource" NOT NULL,
    "right_source" "VerificationSource" NOT NULL,
    "left_source_mode" "VerificationSourceMode" NOT NULL,
    "right_source_mode" "VerificationSourceMode" NOT NULL,
    "left_source_display_name" TEXT NOT NULL,
    "right_source_display_name" TEXT NOT NULL,
    "field_comparisons" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "group_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "requested_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_cross_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bid_cross_verifications_bid_submission_id_created_at_idx" ON "bid_cross_verifications"("bid_submission_id", "created_at");

-- CreateIndex
CREATE INDEX "bid_cross_verifications_bid_submission_id_is_latest_idx" ON "bid_cross_verifications"("bid_submission_id", "is_latest");

-- CreateIndex
CREATE INDEX "bid_cross_verifications_comparison_type_idx" ON "bid_cross_verifications"("comparison_type");

-- CreateIndex
CREATE INDEX "bid_cross_verifications_status_idx" ON "bid_cross_verifications"("status");

-- CreateIndex
CREATE INDEX "bid_cross_verifications_group_id_attempt_number_idx" ON "bid_cross_verifications"("group_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "bid_cross_verifications" ADD CONSTRAINT "bid_cross_verifications_bid_submission_id_fkey" FOREIGN KEY ("bid_submission_id") REFERENCES "bid_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_cross_verifications" ADD CONSTRAINT "bid_cross_verifications_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "bidders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_cross_verifications" ADD CONSTRAINT "bid_cross_verifications_left_verification_id_fkey" FOREIGN KEY ("left_verification_id") REFERENCES "bid_verifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_cross_verifications" ADD CONSTRAINT "bid_cross_verifications_right_verification_id_fkey" FOREIGN KEY ("right_verification_id") REFERENCES "bid_verifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_cross_verifications" ADD CONSTRAINT "bid_cross_verifications_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
