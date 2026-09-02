import type { Request, Response } from 'express';

import { AuthenticationError, DatabaseError, ValidationError } from '../errors';
import { parseBody, parseParams, parseQuery } from '../schemas/parse';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';
import type { BidderService } from '../problem/bidder.service';
import type { BidDocumentService } from '../problem/bid-document.service';
import type { BidSubmissionService } from '../problem/bid.service';
import type { BidVerificationService } from '../problem/verification.service';
import type { BidIntelligenceService } from '../problem/intelligence.service';
import type { BidReviewService } from '../problem/review.service';
import type { BidAttentionService } from '../problem/attention.service';
import type { BidEvaluationService } from '../problem/evaluation.service';
import type { BidOperationsService } from '../problem/operations.service';
import type { TenderService } from '../problem/tender.service';
import {
  attentionListQuerySchema,
  bidIdParamsSchema,
  bidDocumentDownloadQuerySchema,
  bidDocumentIdParamsSchema,
  bidDocumentListQuerySchema,
  bidListQuerySchema,
  bidderIdParamsSchema,
  bidderListQuerySchema,
  createBidBodySchema,
  createBidDocumentBodySchema,
  createBidderBodySchema,
  createTenderBodySchema,
  createTenderRequirementBodySchema,
  createVerificationBodySchema,
  createCrossVerificationBodySchema,
  createEvaluationBodySchema,
  createEvaluationDecisionBodySchema,
  createEvaluationNoteBodySchema,
  activityQuerySchema,
  dashboardQuerySchema,
  evaluationReportQuerySchema,
  searchQuerySchema,
  createReviewAssessmentBodySchema,
  createReviewClarificationBodySchema,
  crossVerificationIdParamsSchema,
  crossVerificationListQuerySchema,
  bidReviewParamsSchema,
  respondReviewClarificationBodySchema,
  reviewClarificationParamsSchema,
  reviewIdParamsSchema,
  reviewListQuerySchema,
  evaluationComparisonQuerySchema,
  evaluationIdParamsSchema,
  evaluationListQuerySchema,
  reorderRequirementBodySchema,
  tenderIdParamsSchema,
  tenderListQuerySchema,
  tenderRequirementParamsSchema,
  updateBidBodySchema,
  updateBidderBodySchema,
  updateTenderBodySchema,
  updateTenderRequirementBodySchema,
  updateTenderStatusBodySchema,
  linkBidDocumentRequirementBodySchema,
  verificationIdParamsSchema,
  verificationListQuerySchema,
} from '../problem/schemas';

export class BharatBidController {
  constructor(
    private readonly tenders: TenderService | null,
    private readonly bidders: BidderService | null,
    private readonly bids: BidSubmissionService | null,
    private readonly bidDocuments: BidDocumentService | null,
    private readonly verifications: BidVerificationService | null,
    private readonly intelligence: BidIntelligenceService | null,
    private readonly reviews: BidReviewService | null,
    private readonly attention: BidAttentionService | null,
    private readonly evaluations: BidEvaluationService | null,
    private readonly operations: BidOperationsService | null = null,
  ) {}

  overview = asyncHandler(async (_req: Request, res: Response) => {
    const [tenderStats, bidderCount, bidCount] = await Promise.all([
      this.tenderService().overview(),
      this.bidderService().countAll(),
      this.bidService().countAll(),
    ]);
    return sendSuccess(res, {
      ...tenderStats,
      bidderCount,
      bidCount,
    });
  });

  dashboard = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const query = parseQuery(dashboardQuerySchema, req.query);
    const dashboard = await this.operationsService().dashboard(query);
    return sendSuccess(res, {
      ...dashboard,
      capabilities: {
        createTender: user.permissions.includes('tenders.write'),
        createBid: user.permissions.includes('bids.write'),
        generateReport: user.permissions.includes('bids.write'),
      },
    });
  });

  listProcurementActivity = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(activityQuerySchema, req.query);
    const result = await this.operationsService().listActivity(query);
    return sendSuccess(res, { items: result.items }, 200, { ...result.meta });
  });

  searchProcurement = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(searchQuerySchema, req.query);
    const result = await this.operationsService().search(query);
    return sendSuccess(res, result);
  });

  downloadEvaluationReport = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderIdParamsSchema, req.params);
    const query = parseQuery(evaluationReportQuerySchema, req.query);
    const report = await this.operationsService().generateEvaluationReport(params.id, user.id, query.kind);
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(report.body);
  });

  listTenders = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(tenderListQuerySchema, req.query);
    const result = await this.tenderService().list(query);
    return sendSuccess(res, { items: result.items }, 200, { ...result.meta });
  });

  getTender = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(tenderIdParamsSchema, req.params);
    const tender = await this.tenderService().get(params.id);
    return sendSuccess(res, { tender });
  });

  createTender = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const body = parseBody(createTenderBodySchema, req.body);
    const tender = await this.tenderService().create(body, user.id);
    return sendSuccess(res, { tender }, 201);
  });

  updateTender = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderIdParamsSchema, req.params);
    const body = parseBody(updateTenderBodySchema, req.body);
    const tender = await this.tenderService().update(params.id, body, user.id);
    return sendSuccess(res, { tender });
  });

  updateTenderStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderIdParamsSchema, req.params);
    const body = parseBody(updateTenderStatusBodySchema, req.body);
    const tender = await this.tenderService().updateStatus(params.id, body.status, user.id);
    return sendSuccess(res, { tender });
  });

  listRequirements = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(tenderIdParamsSchema, req.params);
    const items = await this.tenderService().listRequirements(params.id);
    return sendSuccess(res, { items });
  });

  createRequirement = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderIdParamsSchema, req.params);
    const body = parseBody(createTenderRequirementBodySchema, req.body);
    const requirement = await this.tenderService().createRequirement(params.id, body, user.id);
    return sendSuccess(res, { requirement }, 201);
  });

  updateRequirement = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderRequirementParamsSchema, req.params);
    const body = parseBody(updateTenderRequirementBodySchema, req.body);
    const requirement = await this.tenderService().updateRequirement(params.tenderId, params.id, body, user.id);
    return sendSuccess(res, { requirement });
  });

  activateRequirement = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderRequirementParamsSchema, req.params);
    const requirement = await this.tenderService().setRequirementActive(params.tenderId, params.id, true, user.id);
    return sendSuccess(res, { requirement });
  });

  deactivateRequirement = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderRequirementParamsSchema, req.params);
    const requirement = await this.tenderService().setRequirementActive(params.tenderId, params.id, false, user.id);
    return sendSuccess(res, { requirement });
  });

  reorderRequirement = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderRequirementParamsSchema, req.params);
    const body = parseBody(reorderRequirementBodySchema, req.body);
    const items = await this.tenderService().reorderRequirement(params.tenderId, params.id, body.direction, user.id);
    return sendSuccess(res, { items });
  });

  listTenderActivity = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(tenderIdParamsSchema, req.params);
    const items = await this.tenderService().listActivity(params.id);
    return sendSuccess(res, { items });
  });

  listBidders = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(bidderListQuerySchema, req.query);
    const result = await this.bidderService().list(query);
    return sendSuccess(res, { items: result.items }, 200, { ...result.meta });
  });

  getBidder = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidderIdParamsSchema, req.params);
    const bidder = await this.bidderService().get(params.id);
    return sendSuccess(res, { bidder });
  });

  createBidder = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const body = parseBody(createBidderBodySchema, req.body);
    const bidder = await this.bidderService().create(body, user.id);
    return sendSuccess(res, { bidder }, 201);
  });

  updateBidder = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidderIdParamsSchema, req.params);
    const body = parseBody(updateBidderBodySchema, req.body);
    const bidder = await this.bidderService().update(params.id, body, user.id);
    return sendSuccess(res, { bidder });
  });

  listBidderActivity = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidderIdParamsSchema, req.params);
    const items = await this.bidderService().listActivity(params.id);
    return sendSuccess(res, { items });
  });

  listBids = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(bidListQuerySchema, req.query);
    const result = await this.bidService().list(query);
    return sendSuccess(res, { items: result.items }, 200, { ...result.meta });
  });

  listTenderBids = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(tenderIdParamsSchema, req.params);
    const query = parseQuery(bidListQuerySchema, { ...req.query, tenderId: params.id });
    const result = await this.bidService().list(query);
    return sendSuccess(res, { items: result.items }, 200, { ...result.meta });
  });

  getBid = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const bid = await this.bidService().get(params.id);
    const documentSummary = await this.bidDocumentService().summarize(params.id);
    const verificationSummary = await this.verificationService().summarize(params.id);
    const intelligenceSummary = await this.intelligenceService().summarize(params.id);
    const reviewResult = await this.reviewService().listForBid(params.id);
    const attentionSummary = await this.attentionService().summarizeForBid(params.id);
    return sendSuccess(res, {
      bid: {
        ...bid,
        documentSummary,
        verificationSummary,
        intelligenceSummary,
        reviewSummary: reviewResult.summary,
        attentionSummary,
      },
    });
  });

  createBid = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(tenderIdParamsSchema, req.params);
    const body = parseBody(createBidBodySchema, req.body);
    const bid = await this.bidService().create({ tenderId: params.id, bidderId: body.bidderId }, user.id);
    return sendSuccess(res, { bid }, 201);
  });

  createBidStandalone = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const body = parseBody(createBidBodySchema, req.body);
    if (!body.tenderId) {
      throw new ValidationError('Tender is required', [
        { path: 'tenderId', message: 'tenderId is required', code: 'invalid_type' },
      ]);
    }
    const bid = await this.bidService().create({ tenderId: body.tenderId, bidderId: body.bidderId }, user.id);
    return sendSuccess(res, { bid }, 201);
  });

  updateBid = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidIdParamsSchema, req.params);
    const body = parseBody(updateBidBodySchema, req.body);
    const bid = await this.bidService().updateDraft(params.id, body, user.id);
    return sendSuccess(res, { bid });
  });

  submitBid = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidIdParamsSchema, req.params);
    const bid = await this.bidService().submit(params.id, user.id);
    return sendSuccess(res, { bid });
  });

  listBidActivity = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const items = await this.bidService().listActivity(params.id);
    return sendSuccess(res, { items });
  });

  listBidDocuments = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const query = parseQuery(bidDocumentListQuerySchema, req.query);
    const result = await this.bidDocumentService().list(params.id, query);
    return sendSuccess(
      res,
      { items: result.items, summary: result.summary, requirements: result.requirements },
      200,
      { ...result.meta },
    );
  });

  getBidDocument = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidDocumentIdParamsSchema, req.params);
    const document = await this.bidDocumentService().get(params.bidId, params.id);
    return sendSuccess(res, { document });
  });

  uploadBidDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidIdParamsSchema, req.params);
    const file = req.file;
    if (!file) {
      throw new ValidationError('Invalid uploaded file', [
        { path: 'file', message: 'A file is required', code: 'invalid_type' },
      ]);
    }
    const body = parseBody(createBidDocumentBodySchema, req.body);
    const document = await this.bidDocumentService().upload(
      params.id,
      {
        documentType: body.documentType,
        tenderRequirementId: body.tenderRequirementId,
        file: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer,
          fieldname: file.fieldname,
        },
      },
      user.id,
    );
    return sendSuccess(res, { document }, 201);
  });

  replaceBidDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidDocumentIdParamsSchema, req.params);
    const file = req.file;
    if (!file) {
      throw new ValidationError('Invalid uploaded file', [
        { path: 'file', message: 'A file is required', code: 'invalid_type' },
      ]);
    }
    const body = parseBody(createBidDocumentBodySchema.partial(), req.body);
    const document = await this.bidDocumentService().replaceVersion(
      params.bidId,
      params.id,
      {
        documentType: body.documentType,
        file: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer,
          fieldname: file.fieldname,
        },
      },
      user.id,
    );
    return sendSuccess(res, { document }, 201);
  });

  linkBidDocumentRequirement = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidDocumentIdParamsSchema, req.params);
    const body = parseBody(linkBidDocumentRequirementBodySchema, req.body);
    const document = await this.bidDocumentService().linkRequirement(
      params.bidId,
      params.id,
      body.tenderRequirementId,
      user.id,
    );
    return sendSuccess(res, { document });
  });

  archiveBidDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidDocumentIdParamsSchema, req.params);
    const document = await this.bidDocumentService().archive(params.bidId, params.id, user.id);
    return sendSuccess(res, { document });
  });

  downloadBidDocument = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidDocumentIdParamsSchema, req.params);
    const query = parseQuery(bidDocumentDownloadQuerySchema, req.query);
    const file = await this.bidDocumentService().download(
      params.bidId,
      params.id,
      query.disposition ?? 'attachment',
      user.id,
    );
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', file.disposition);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    return res.status(200).send(file.body);
  });

  listBidDocumentActivity = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidDocumentIdParamsSchema, req.params);
    const items = await this.bidDocumentService().listActivity(params.bidId, params.id);
    return sendSuccess(res, { items });
  });

  listVerificationSources = asyncHandler(async (_req: Request, res: Response) => {
    return sendSuccess(res, { items: this.verificationService().listSources() });
  });

  listBidVerifications = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const query = parseQuery(verificationListQuerySchema, req.query);
    const result = await this.verificationService().list(params.id, query);
    return sendSuccess(
      res,
      { items: result.items, summary: result.summary, sources: result.sources },
      200,
      { ...result.meta },
    );
  });

  getBidVerification = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(verificationIdParamsSchema, req.params);
    const verification = await this.verificationService().get(params.bidId, params.id);
    return sendSuccess(res, { verification });
  });

  createBidVerification = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidIdParamsSchema, req.params);
    const body = parseBody(createVerificationBodySchema, req.body);
    const verification = await this.verificationService().request(params.id, body, user.id);
    return sendSuccess(res, { verification }, 201);
  });

  retryBidVerification = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(verificationIdParamsSchema, req.params);
    const verification = await this.verificationService().retry(params.bidId, params.id, user.id);
    return sendSuccess(res, { verification }, 201);
  });

  listBidVerificationActivity = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(verificationIdParamsSchema, req.params);
    const items = await this.verificationService().listActivity(params.bidId, params.id);
    return sendSuccess(res, { items });
  });

  listBidCrossVerifications = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const query = parseQuery(crossVerificationListQuerySchema, req.query);
    const items = await this.intelligenceService().listCrossChecks(params.id, query.latestOnly !== false);
    return sendSuccess(res, { items });
  });

  getBidCrossVerification = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(crossVerificationIdParamsSchema, req.params);
    const crossVerification = await this.intelligenceService().getCrossCheck(params.bidId, params.id);
    return sendSuccess(res, { crossVerification });
  });

  createBidCrossVerification = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidIdParamsSchema, req.params);
    const body = parseBody(createCrossVerificationBodySchema, req.body ?? {});
    const items = await this.intelligenceService().request(params.id, body, user.id);
    await this.reviewService().syncBid(params.id, user.id);
    return sendSuccess(res, { items }, 201);
  });

  listBidCrossVerificationActivity = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(crossVerificationIdParamsSchema, req.params);
    const items = await this.intelligenceService().listActivity(params.bidId, params.id);
    return sendSuccess(res, { items });
  });

  getBidRequirementIntelligence = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const result = await this.intelligenceService().requirementIntelligence(params.id);
    return sendSuccess(res, result);
  });

  listBidReviewItems = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const result = await this.intelligenceService().requirementIntelligence(params.id);
    return sendSuccess(res, { items: result.reviewItems, summary: result.summary });
  });

  listReviews = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(reviewListQuerySchema, req.query);
    const result = await this.reviewService().list(query);
    return sendSuccess(res, { items: result.items }, 200, { ...result.meta });
  });

  reviewSummary = asyncHandler(async (_req: Request, res: Response) => {
    const summary = await this.reviewService().summary();
    return sendSuccess(res, { summary });
  });

  getReview = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(reviewIdParamsSchema, req.params);
    const review = await this.reviewService().get(params.id, user.id);
    return sendSuccess(res, { review });
  });

  getBidReview = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(bidReviewParamsSchema, req.params);
    const review = await this.reviewService().getForBid(params.bidId, params.id, user.id);
    return sendSuccess(res, { review });
  });

  listBidOfficerReviews = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const params = parseParams(bidIdParamsSchema, req.params);
    const result = await this.reviewService().listForBid(params.id, user?.id);
    return sendSuccess(res, result);
  });

  attentionSummary = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(attentionListQuerySchema, req.query);
    const summary = await this.attentionService().summary(query);
    return sendSuccess(res, { summary });
  });

  listAttentionBids = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(attentionListQuerySchema, req.query);
    const result = await this.attentionService().list(query);
    return sendSuccess(res, { items: result.items }, 200, { ...result.meta });
  });

  getBidIntelligence = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const intelligence = await this.attentionService().get(params.id);
    return sendSuccess(res, { intelligence });
  });

  getBidIntelligenceFactors = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const result = await this.attentionService().factors(params.id);
    return sendSuccess(res, result);
  });

  getBidIntelligenceHistory = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const history = await this.attentionService().history(params.id);
    return sendSuccess(res, { history });
  });

  listEvaluations = asyncHandler(async (req: Request, res: Response) => {
    const query = parseQuery(evaluationListQuerySchema, req.query);
    const result = await this.evaluationService().list(query);
    return sendSuccess(res, { items: result.items, advisory: result.advisory }, 200, { ...result.meta });
  });

  createEvaluation = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const body = parseBody(createEvaluationBodySchema, req.body);
    const evaluation = await this.evaluationService().create(body.tenderId, user.id);
    return sendSuccess(res, { evaluation }, 201);
  });

  getEvaluation = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const evaluation = await this.evaluationService().get(params.id);
    return sendSuccess(res, { evaluation });
  });

  startEvaluation = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const evaluation = await this.evaluationService().start(params.id, user.id);
    return sendSuccess(res, { evaluation });
  });

  markEvaluationReady = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const evaluation = await this.evaluationService().markReady(params.id, user.id);
    return sendSuccess(res, { evaluation });
  });

  recordEvaluationComplete = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const evaluation = await this.evaluationService().recordComplete(params.id, user.id);
    return sendSuccess(res, { evaluation });
  });

  createEvaluationNote = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const body = parseBody(createEvaluationNoteBodySchema, req.body);
    const note = await this.evaluationService().addNote(params.id, body, user.id);
    return sendSuccess(res, { note }, 201);
  });

  listEvaluationNotes = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const result = await this.evaluationService().listNotes(params.id);
    return sendSuccess(res, result);
  });

  createEvaluationDecision = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const body = parseBody(createEvaluationDecisionBodySchema, req.body);
    const decision = await this.evaluationService().recordDecision(params.id, body, user.id);
    return sendSuccess(res, { decision }, 201);
  });

  listEvaluationDecisions = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const result = await this.evaluationService().listDecisions(params.id);
    return sendSuccess(res, result);
  });

  getEvaluationHistory = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(evaluationIdParamsSchema, req.params);
    const history = await this.evaluationService().history(params.id);
    return sendSuccess(res, history);
  });

  getTenderEvaluation = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(tenderIdParamsSchema, req.params);
    const result = await this.evaluationService().getByTender(params.id);
    return sendSuccess(res, result);
  });

  getTenderEvaluationComparison = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(tenderIdParamsSchema, req.params);
    const query = parseQuery(evaluationComparisonQuerySchema, req.query);
    const comparison = await this.evaluationService().comparison(params.id, query.bidIds);
    return sendSuccess(res, { comparison });
  });

  getBidEvaluation = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(bidIdParamsSchema, req.params);
    const evaluation = await this.evaluationService().getForBid(params.id);
    return sendSuccess(res, { evaluation });
  });

  startReview = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(reviewIdParamsSchema, req.params);
    const review = await this.reviewService().start(params.id, user.id);
    return sendSuccess(res, { review });
  });

  closeReview = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(reviewIdParamsSchema, req.params);
    const review = await this.reviewService().close(params.id, user.id);
    return sendSuccess(res, { review });
  });

  createReviewAssessment = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(reviewIdParamsSchema, req.params);
    const body = parseBody(createReviewAssessmentBodySchema, req.body);
    const review = await this.reviewService().assess(params.id, body, user.id);
    return sendSuccess(res, { review }, 201);
  });

  listReviewAssessments = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(reviewIdParamsSchema, req.params);
    const items = await this.reviewService().listAssessments(params.id);
    return sendSuccess(res, { items });
  });

  createReviewClarification = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(reviewIdParamsSchema, req.params);
    const body = parseBody(createReviewClarificationBodySchema, req.body);
    const review = await this.reviewService().requestClarification(params.id, body, user.id);
    return sendSuccess(res, { review }, 201);
  });

  listReviewClarifications = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(reviewIdParamsSchema, req.params);
    const items = await this.reviewService().listClarifications(params.id);
    return sendSuccess(res, { items });
  });

  respondReviewClarification = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(reviewClarificationParamsSchema, req.params);
    const body = parseBody(respondReviewClarificationBodySchema, req.body);
    const review = await this.reviewService().respondClarification(
      params.id,
      params.clarificationId,
      body.response,
      user.id,
    );
    return sendSuccess(res, { review });
  });

  cancelReviewClarification = asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const params = parseParams(reviewClarificationParamsSchema, req.params);
    const review = await this.reviewService().cancelClarification(params.id, params.clarificationId, user.id);
    return sendSuccess(res, { review });
  });

  listReviewActivity = asyncHandler(async (req: Request, res: Response) => {
    const params = parseParams(reviewIdParamsSchema, req.params);
    const items = await this.reviewService().listActivity(params.id);
    return sendSuccess(res, { items });
  });

  private tenderService(): TenderService {
    if (!this.tenders) {
      throw new DatabaseError('Database is not configured');
    }
    return this.tenders;
  }

  private bidderService(): BidderService {
    if (!this.bidders) {
      throw new DatabaseError('Database is not configured');
    }
    return this.bidders;
  }

  private bidService(): BidSubmissionService {
    if (!this.bids) {
      throw new DatabaseError('Database is not configured');
    }
    return this.bids;
  }

  private bidDocumentService(): BidDocumentService {
    if (!this.bidDocuments) {
      throw new DatabaseError('Database is not configured');
    }
    return this.bidDocuments;
  }

  private verificationService(): BidVerificationService {
    if (!this.verifications) {
      throw new DatabaseError('Database is not configured');
    }
    return this.verifications;
  }

  private intelligenceService(): BidIntelligenceService {
    if (!this.intelligence) {
      throw new DatabaseError('Database is not configured');
    }
    return this.intelligence;
  }

  private reviewService(): BidReviewService {
    if (!this.reviews) {
      throw new DatabaseError('Database is not configured');
    }
    return this.reviews;
  }

  private attentionService(): BidAttentionService {
    if (!this.attention) {
      throw new DatabaseError('Database is not configured');
    }
    return this.attention;
  }

  private evaluationService(): BidEvaluationService {
    if (!this.evaluations) {
      throw new DatabaseError('Database is not configured');
    }
    return this.evaluations;
  }

  private operationsService(): BidOperationsService {
    if (!this.operations) {
      throw new DatabaseError('Database is not configured');
    }
    return this.operations;
  }
}

function requireUser(req: Request) {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user;
}
