-- CreateEnum
CREATE TYPE "ReviewIssueType" AS ENUM ('evidence_missing', 'verification_mismatch', 'cross_source_inconsistency', 'evidence_conflict', 'review_required', 'source_unavailable', 'requirement_unevaluated');

-- CreateEnum
CREATE TYPE "ReviewItemStatus" AS ENUM ('open', 'in_review', 'clarification_requested', 'assessed', 'closed');

-- CreateEnum
CREATE TYPE "ReviewAssessmentType" AS ENUM ('confirmed', 'explanation_accepted', 'evidence_sufficient', 'evidence_insufficient', 'requires_clarification', 'not_applicable');

-- CreateEnum
CREATE TYPE "ReviewClarificationStatus" AS ENUM ('requested', 'responded', 'cancelled');

-- CreateTable
CREATE TABLE "bid_review_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fingerprint" TEXT NOT NULL,
    "bid_submission_id" UUID NOT NULL,
    "tender_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "issue_type" "ReviewIssueType" NOT NULL,
    "status" "ReviewItemStatus" NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "why_created" TEXT NOT NULL,
    "why_it_matters" TEXT NOT NULL,
    "inspect_hint" TEXT NOT NULL,
    "action_hint" TEXT NOT NULL,
    "machine_finding" TEXT NOT NULL,
    "machine_explanation" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "requirement_id" UUID,
    "document_id" UUID,
    "verification_id" UUID,
    "cross_verification_id" UUID,
    "opened_at" TIMESTAMP(3),
    "opened_by_id" UUID,
    "closed_at" TIMESTAMP(3),
    "closed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "review_item_id" UUID NOT NULL,
    "assessment" "ReviewAssessmentType" NOT NULL,
    "note" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "assessed_by_id" UUID NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_clarifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "review_item_id" UUID NOT NULL,
    "bid_submission_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ReviewClarificationStatus" NOT NULL DEFAULT 'requested',
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response" TEXT,
    "responded_by_id" UUID,
    "responded_at" TIMESTAMP(3),
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMP(3),
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bid_review_items_bid_submission_id_fingerprint_key" ON "bid_review_items"("bid_submission_id", "fingerprint");

-- CreateIndex
CREATE INDEX "bid_review_items_bid_submission_id_status_idx" ON "bid_review_items"("bid_submission_id", "status");

-- CreateIndex
CREATE INDEX "bid_review_items_tender_id_status_idx" ON "bid_review_items"("tender_id", "status");

-- CreateIndex
CREATE INDEX "bid_review_items_bidder_id_idx" ON "bid_review_items"("bidder_id");

-- CreateIndex
CREATE INDEX "bid_review_items_issue_type_status_idx" ON "bid_review_items"("issue_type", "status");

-- CreateIndex
CREATE INDEX "bid_review_items_status_created_at_idx" ON "bid_review_items"("status", "created_at");

-- CreateIndex
CREATE INDEX "bid_review_items_mandatory_idx" ON "bid_review_items"("mandatory");

-- CreateIndex
CREATE INDEX "review_assessments_review_item_id_attempt_number_idx" ON "review_assessments"("review_item_id", "attempt_number");

-- CreateIndex
CREATE INDEX "review_assessments_review_item_id_is_latest_idx" ON "review_assessments"("review_item_id", "is_latest");

-- CreateIndex
CREATE INDEX "review_clarifications_review_item_id_status_idx" ON "review_clarifications"("review_item_id", "status");

-- CreateIndex
CREATE INDEX "review_clarifications_bid_submission_id_status_idx" ON "review_clarifications"("bid_submission_id", "status");

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_bid_submission_id_fkey" FOREIGN KEY ("bid_submission_id") REFERENCES "bid_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "bidders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "tender_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "bid_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "bid_verifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_cross_verification_id_fkey" FOREIGN KEY ("cross_verification_id") REFERENCES "bid_cross_verifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_review_items" ADD CONSTRAINT "bid_review_items_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assessments" ADD CONSTRAINT "review_assessments_review_item_id_fkey" FOREIGN KEY ("review_item_id") REFERENCES "bid_review_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assessments" ADD CONSTRAINT "review_assessments_assessed_by_id_fkey" FOREIGN KEY ("assessed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_clarifications" ADD CONSTRAINT "review_clarifications_review_item_id_fkey" FOREIGN KEY ("review_item_id") REFERENCES "bid_review_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_clarifications" ADD CONSTRAINT "review_clarifications_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_clarifications" ADD CONSTRAINT "review_clarifications_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_clarifications" ADD CONSTRAINT "review_clarifications_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
