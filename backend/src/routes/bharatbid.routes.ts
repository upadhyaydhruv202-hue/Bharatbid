import { Router, type RequestHandler } from 'express';

import type { BharatBidController } from '../controllers/bharatbid.controller';
import { createDocumentUploadMiddleware } from '../middleware/document-upload';
import { PERMISSIONS } from '../rbac/catalog';
import { requirePermission } from '../rbac/middleware';

export function createBharatBidRouter(options: {
  controller: BharatBidController;
  authenticate: RequestHandler;
  documentMaxBytes?: number;
}): Router {
  const router = Router();
  const tendersRead = [options.authenticate, requirePermission(PERMISSIONS.TENDERS_READ)];
  const tendersWrite = [options.authenticate, requirePermission(PERMISSIONS.TENDERS_WRITE)];
  const biddersRead = [options.authenticate, requirePermission(PERMISSIONS.BIDDERS_READ)];
  const biddersWrite = [options.authenticate, requirePermission(PERMISSIONS.BIDDERS_WRITE)];
  const bidsRead = [options.authenticate, requirePermission(PERMISSIONS.BIDS_READ)];
  const bidsWrite = [options.authenticate, requirePermission(PERMISSIONS.BIDS_WRITE)];
  const upload = createDocumentUploadMiddleware(options.documentMaxBytes);

  router.get('/bharatbid/overview', ...tendersRead, options.controller.overview);
  router.get('/bharatbid/dashboard', ...tendersRead, options.controller.dashboard);
  router.get('/bharatbid/activity', ...bidsRead, options.controller.listProcurementActivity);
  router.get('/bharatbid/search', ...tendersRead, options.controller.searchProcurement);

  router.get('/tenders', ...tendersRead, options.controller.listTenders);
  router.post('/tenders', ...tendersWrite, options.controller.createTender);
  router.get('/tenders/:id', ...tendersRead, options.controller.getTender);
  router.get('/tenders/:id/activity', ...tendersRead, options.controller.listTenderActivity);
  router.patch('/tenders/:id', ...tendersWrite, options.controller.updateTender);
  router.post('/tenders/:id/status', ...tendersWrite, options.controller.updateTenderStatus);
  router.get('/tenders/:id/requirements', ...tendersRead, options.controller.listRequirements);
  router.post('/tenders/:id/requirements', ...tendersWrite, options.controller.createRequirement);
  router.patch('/tenders/:tenderId/requirements/:id', ...tendersWrite, options.controller.updateRequirement);
  router.post('/tenders/:tenderId/requirements/:id/activate', ...tendersWrite, options.controller.activateRequirement);
  router.post(
    '/tenders/:tenderId/requirements/:id/deactivate',
    ...tendersWrite,
    options.controller.deactivateRequirement,
  );
  router.post(
    '/tenders/:tenderId/requirements/:id/move',
    ...tendersWrite,
    options.controller.reorderRequirement,
  );
  router.get('/tenders/:id/bids', ...bidsRead, options.controller.listTenderBids);
  router.post('/tenders/:id/bids', ...bidsWrite, options.controller.createBid);

  router.get('/bidders', ...biddersRead, options.controller.listBidders);
  router.post('/bidders', ...biddersWrite, options.controller.createBidder);
  router.get('/bidders/:id', ...biddersRead, options.controller.getBidder);
  router.get('/bidders/:id/activity', ...biddersRead, options.controller.listBidderActivity);
  router.patch('/bidders/:id', ...biddersWrite, options.controller.updateBidder);

  router.get('/bids', ...bidsRead, options.controller.listBids);
  router.post('/bids', ...bidsWrite, options.controller.createBidStandalone);
  router.get('/bids/:id/documents', ...bidsRead, options.controller.listBidDocuments);
  router.post('/bids/:id/documents', ...bidsWrite, upload, options.controller.uploadBidDocument);
  router.get('/bids/:bidId/documents/:id', ...bidsRead, options.controller.getBidDocument);
  router.get('/bids/:bidId/documents/:id/download', ...bidsRead, options.controller.downloadBidDocument);
  router.get('/bids/:bidId/documents/:id/activity', ...bidsRead, options.controller.listBidDocumentActivity);
  router.post(
    '/bids/:bidId/documents/:id/version',
    ...bidsWrite,
    upload,
    options.controller.replaceBidDocument,
  );
  router.post(
    '/bids/:bidId/documents/:id/link-requirement',
    ...bidsWrite,
    options.controller.linkBidDocumentRequirement,
  );
  router.post('/bids/:bidId/documents/:id/archive', ...bidsWrite, options.controller.archiveBidDocument);
  router.get('/verification-sources', ...bidsRead, options.controller.listVerificationSources);
  router.get('/bids/:id/verifications', ...bidsRead, options.controller.listBidVerifications);
  router.post('/bids/:id/verifications', ...bidsWrite, options.controller.createBidVerification);
  router.get('/bids/:bidId/verifications/:id', ...bidsRead, options.controller.getBidVerification);
  router.get('/bids/:bidId/verifications/:id/activity', ...bidsRead, options.controller.listBidVerificationActivity);
  router.post('/bids/:bidId/verifications/:id/retry', ...bidsWrite, options.controller.retryBidVerification);
  router.get('/bids/:id/cross-verifications', ...bidsRead, options.controller.listBidCrossVerifications);
  router.post('/bids/:id/cross-verifications', ...bidsWrite, options.controller.createBidCrossVerification);
  router.get('/bids/:bidId/cross-verifications/:id', ...bidsRead, options.controller.getBidCrossVerification);
  router.get('/bids/:bidId/cross-verifications/:id/activity', ...bidsRead, options.controller.listBidCrossVerificationActivity);
  router.get('/bids/:id/requirement-intelligence', ...bidsRead, options.controller.getBidRequirementIntelligence);
  router.get('/bids/:id/review-items', ...bidsRead, options.controller.listBidReviewItems);
  router.get('/reviews/summary', ...bidsRead, options.controller.reviewSummary);
  router.get('/reviews', ...bidsRead, options.controller.listReviews);
  router.get('/reviews/:id/assessments', ...bidsRead, options.controller.listReviewAssessments);
  router.get('/reviews/:id/clarifications', ...bidsRead, options.controller.listReviewClarifications);
  router.get('/reviews/:id/activity', ...bidsRead, options.controller.listReviewActivity);
  router.get('/reviews/:id', ...bidsRead, options.controller.getReview);
  router.post('/reviews/:id/start', ...bidsWrite, options.controller.startReview);
  router.post('/reviews/:id/close', ...bidsWrite, options.controller.closeReview);
  router.post('/reviews/:id/assessments', ...bidsWrite, options.controller.createReviewAssessment);
  router.post('/reviews/:id/clarifications', ...bidsWrite, options.controller.createReviewClarification);
  router.post(
    '/reviews/:id/clarifications/:clarificationId/respond',
    ...bidsWrite,
    options.controller.respondReviewClarification,
  );
  router.post(
    '/reviews/:id/clarifications/:clarificationId/cancel',
    ...bidsWrite,
    options.controller.cancelReviewClarification,
  );
  router.get('/bids/:id/reviews', ...bidsRead, options.controller.listBidOfficerReviews);
  router.get('/bids/:bidId/reviews/:id', ...bidsRead, options.controller.getBidReview);
  router.get('/intelligence/summary', ...bidsRead, options.controller.attentionSummary);
  router.get('/intelligence/bids', ...bidsRead, options.controller.listAttentionBids);
  router.get('/bids/:id/intelligence/factors', ...bidsRead, options.controller.getBidIntelligenceFactors);
  router.get('/bids/:id/intelligence/history', ...bidsRead, options.controller.getBidIntelligenceHistory);
  router.get('/bids/:id/intelligence', ...bidsRead, options.controller.getBidIntelligence);
  router.get('/evaluations', ...bidsRead, options.controller.listEvaluations);
  router.post('/evaluations', ...bidsWrite, options.controller.createEvaluation);
  router.get('/evaluations/:id/notes', ...bidsRead, options.controller.listEvaluationNotes);
  router.post('/evaluations/:id/notes', ...bidsWrite, options.controller.createEvaluationNote);
  router.get('/evaluations/:id/decisions', ...bidsRead, options.controller.listEvaluationDecisions);
  router.post('/evaluations/:id/decisions', ...bidsWrite, options.controller.createEvaluationDecision);
  router.get('/evaluations/:id/history', ...bidsRead, options.controller.getEvaluationHistory);
  router.post('/evaluations/:id/start', ...bidsWrite, options.controller.startEvaluation);
  router.post('/evaluations/:id/ready', ...bidsWrite, options.controller.markEvaluationReady);
  router.post('/evaluations/:id/record', ...bidsWrite, options.controller.recordEvaluationComplete);
  router.get('/evaluations/:id', ...bidsRead, options.controller.getEvaluation);
  router.get('/tenders/:id/evaluation/comparison', ...bidsRead, options.controller.getTenderEvaluationComparison);
  router.get('/tenders/:id/evaluation', ...bidsRead, options.controller.getTenderEvaluation);
  router.get('/tenders/:id/reports/evaluation', ...bidsWrite, options.controller.downloadEvaluationReport);
  router.get('/bids/:id/evaluation', ...bidsRead, options.controller.getBidEvaluation);
  router.get('/bids/:id', ...bidsRead, options.controller.getBid);
  router.get('/bids/:id/activity', ...bidsRead, options.controller.listBidActivity);
  router.patch('/bids/:id', ...bidsWrite, options.controller.updateBid);
  router.post('/bids/:id/submit', ...bidsWrite, options.controller.submitBid);

  return router;
}
