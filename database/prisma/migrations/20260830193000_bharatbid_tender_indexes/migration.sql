-- CreateIndex
CREATE INDEX "tenders_category_idx" ON "tenders"("category");

-- CreateIndex
CREATE INDEX "tender_requirements_tender_id_mandatory_idx" ON "tender_requirements"("tender_id", "mandatory");
