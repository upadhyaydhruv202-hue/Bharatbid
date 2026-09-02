-- CreateEnum
CREATE TYPE "BidDocumentType" AS ENUM ('pan', 'gst_certificate', 'cin', 'udyam_certificate', 'financial_statement', 'turnover_certificate', 'bank_certificate', 'technical_qualification', 'experience_certificate', 'oem_authorization', 'product_datasheet', 'incorporation_certificate', 'authorization_letter', 'affidavit', 'declaration', 'bid_form', 'tender_response', 'price_schedule', 'other');

-- CreateEnum
CREATE TYPE "BidDocumentStatus" AS ENUM ('uploaded', 'processing', 'ready', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "BidDocumentExtractionStatus" AS ENUM ('not_started', 'queued', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "bid_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bid_submission_id" UUID NOT NULL,
    "tender_requirement_id" UUID,
    "group_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "document_type" "BidDocumentType" NOT NULL,
    "original_filename" TEXT NOT NULL,
    "stored_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "status" "BidDocumentStatus" NOT NULL DEFAULT 'uploaded',
    "extraction_status" "BidDocumentExtractionStatus" NOT NULL DEFAULT 'not_started',
    "extracted_text" TEXT,
    "extracted_at" TIMESTAMP(3),
    "extraction_engine" TEXT,
    "extraction_error" TEXT,
    "uploaded_by_id" UUID,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bid_documents_storage_key_key" ON "bid_documents"("storage_key");

-- CreateIndex
CREATE INDEX "bid_documents_bid_submission_id_created_at_idx" ON "bid_documents"("bid_submission_id", "created_at");

-- CreateIndex
CREATE INDEX "bid_documents_bid_submission_id_is_current_idx" ON "bid_documents"("bid_submission_id", "is_current");

-- CreateIndex
CREATE INDEX "bid_documents_bid_submission_id_checksum_sha256_idx" ON "bid_documents"("bid_submission_id", "checksum_sha256");

-- CreateIndex
CREATE INDEX "bid_documents_tender_requirement_id_idx" ON "bid_documents"("tender_requirement_id");

-- CreateIndex
CREATE INDEX "bid_documents_document_type_idx" ON "bid_documents"("document_type");

-- CreateIndex
CREATE INDEX "bid_documents_status_idx" ON "bid_documents"("status");

-- CreateIndex
CREATE INDEX "bid_documents_group_id_version_number_idx" ON "bid_documents"("group_id", "version_number");

-- AddForeignKey
ALTER TABLE "bid_documents" ADD CONSTRAINT "bid_documents_bid_submission_id_fkey" FOREIGN KEY ("bid_submission_id") REFERENCES "bid_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_documents" ADD CONSTRAINT "bid_documents_tender_requirement_id_fkey" FOREIGN KEY ("tender_requirement_id") REFERENCES "tender_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_documents" ADD CONSTRAINT "bid_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
