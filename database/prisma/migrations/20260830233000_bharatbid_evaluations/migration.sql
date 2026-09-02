-- CreateEnum
CREATE TYPE "TenderEvaluationStatus" AS ENUM ('not_started', 'in_progress', 'ready_for_decision', 'decision_recorded');

-- CreateEnum
CREATE TYPE "EvaluationDecisionType" AS ENUM ('accepted_for_further_evaluation', 'requires_clarification', 'not_recommended_for_further_evaluation');

-- CreateTable
CREATE TABLE "tender_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tender_id" UUID NOT NULL,
    "status" "TenderEvaluationStatus" NOT NULL DEFAULT 'not_started',
    "started_at" TIMESTAMP(3),
    "started_by_id" UUID,
    "ready_at" TIMESTAMP(3),
    "ready_by_id" UUID,
    "recorded_at" TIMESTAMP(3),
    "recorded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tender_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluation_id" UUID NOT NULL,
    "bid_submission_id" UUID,
    "note" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluation_id" UUID NOT NULL,
    "bid_submission_id" UUID NOT NULL,
    "decision" "EvaluationDecisionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "decided_by_id" UUID NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tender_evaluations_tender_id_key" ON "tender_evaluations"("tender_id");

-- CreateIndex
CREATE INDEX "tender_evaluations_status_updated_at_idx" ON "tender_evaluations"("status", "updated_at");

-- CreateIndex
CREATE INDEX "evaluation_notes_evaluation_id_is_latest_idx" ON "evaluation_notes"("evaluation_id", "is_latest");

-- CreateIndex
CREATE INDEX "evaluation_notes_evaluation_id_bid_submission_id_attempt_number_idx" ON "evaluation_notes"("evaluation_id", "bid_submission_id", "attempt_number");

-- CreateIndex
CREATE INDEX "evaluation_notes_created_at_idx" ON "evaluation_notes"("created_at");

-- CreateIndex
CREATE INDEX "evaluation_decisions_evaluation_id_bid_submission_id_is_latest_idx" ON "evaluation_decisions"("evaluation_id", "bid_submission_id", "is_latest");

-- CreateIndex
CREATE INDEX "evaluation_decisions_evaluation_id_bid_submission_id_attempt_number_idx" ON "evaluation_decisions"("evaluation_id", "bid_submission_id", "attempt_number");

-- CreateIndex
CREATE INDEX "evaluation_decisions_decided_at_idx" ON "evaluation_decisions"("decided_at");

-- AddForeignKey
ALTER TABLE "tender_evaluations" ADD CONSTRAINT "tender_evaluations_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_evaluations" ADD CONSTRAINT "tender_evaluations_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_evaluations" ADD CONSTRAINT "tender_evaluations_ready_by_id_fkey" FOREIGN KEY ("ready_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_evaluations" ADD CONSTRAINT "tender_evaluations_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_notes" ADD CONSTRAINT "evaluation_notes_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "tender_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_notes" ADD CONSTRAINT "evaluation_notes_bid_submission_id_fkey" FOREIGN KEY ("bid_submission_id") REFERENCES "bid_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_notes" ADD CONSTRAINT "evaluation_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_decisions" ADD CONSTRAINT "evaluation_decisions_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "tender_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_decisions" ADD CONSTRAINT "evaluation_decisions_bid_submission_id_fkey" FOREIGN KEY ("bid_submission_id") REFERENCES "bid_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_decisions" ADD CONSTRAINT "evaluation_decisions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
