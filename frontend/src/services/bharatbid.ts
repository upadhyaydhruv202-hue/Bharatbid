import { apiDownloadBlob, apiGet, apiGetWithMeta, apiRequest, apiUpload, type QueryValue } from './api';

export type TenderStatus =
  | 'draft'
  | 'open'
  | 'under_evaluation'
  | 'closed'
  | 'awarded'
  | 'cancelled';

export type BidStatus = 'draft' | 'submitted' | 'under_review' | 'withdrawn' | 'finalized';

export type RequirementType =
  | 'statutory'
  | 'eligibility'
  | 'document'
  | 'financial'
  | 'technical'
  | 'organizational'
  | 'declaration'
  | 'tender_specific'
  | 'other';

export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TenderListItem {
  id: string;
  referenceNumber: string;
  title: string;
  organizationName: string;
  departmentName: string;
  category: string;
  status: TenderStatus;
  issueDate: string;
  closingDate: string;
  bidCount: number;
  requirementCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenderRequirement {
  id: string;
  tenderId: string;
  name: string;
  description: string | null;
  requirementType: RequirementType;
  mandatory: boolean;
  active: boolean;
  sortOrder: number;
}

export interface TenderStatusAction {
  to: TenderStatus;
  label: string;
  destructive: boolean;
}

export interface TenderDetail extends TenderListItem {
  description: string | null;
  createdById: string | null;
  createdBy: { id: string; displayName: string } | null;
  requirements: TenderRequirement[];
  readiness: { readyToOpen: boolean; items: Array<{ id: string; label: string; passed: boolean }> };
  requirementCounts: { total: number; mandatory: number; optional: number; active: number };
  bidSummary: {
    total: number;
    draft: number;
    submitted: number;
    underReview: number;
    withdrawn: number;
    finalized: number;
  };
  allowedStatusActions: TenderStatusAction[];
  fieldLocks: { all: boolean; closingDate: boolean; requirementCore: boolean };
}

export interface TenderActivityItem {
  id: string;
  action: string;
  title: string;
  actorName: string | null;
  timestamp: string;
}

export interface BidderListItem {
  id: string;
  legalName: string;
  tradeName: string | null;
  panMasked: string | null;
  panStatus: 'provided' | 'not_provided';
  gstinStatus: 'provided' | 'not_provided';
  udyamStatus: 'provided' | 'not_provided';
  profileComplete: boolean;
  city: string | null;
  state: string | null;
  tenderCount: number;
  activeBidCount: number;
  lastParticipationAt: string | null;
  createdAt: string;
}

export interface BidListItem {
  id: string;
  submissionReference: string;
  tenderId: string;
  tenderReference: string;
  tenderTitle: string;
  bidderId: string;
  bidderLegalName: string;
  status: BidStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BidDetail extends BidListItem {
  tenderCategory: string | null;
  tenderClosingDate: string | null;
  tenderStatus: string | null;
  bidderTradeName: string | null;
  bidderCity: string | null;
  bidderState: string | null;
  bidderContactName: string | null;
  bidderContactEmail: string | null;
  bidderPan: string | null;
  bidderGstin: string | null;
  readiness: { readyToOpen: boolean; items: Array<{ id: string; label: string; passed: boolean }> };
  fieldLocks: { all: boolean };
  allowedActions: Array<{ action: 'submit'; label: string }>;
  documentSummary?: BidDocumentSummary;
  verificationSummary?: BidVerificationSummary;
  intelligenceSummary?: BidIntelligenceSummary;
  reviewSummary?: BidReviewSummary;
  attentionSummary?: BidAttentionSummary;
}

export interface BidderDetail {
  id: string;
  legalName: string;
  tradeName: string | null;
  pan: string | null;
  gstin: string | null;
  cin: string | null;
  udyamRegistrationNumber: string | null;
  panStatus: 'provided' | 'not_provided';
  gstinStatus: 'provided' | 'not_provided';
  udyamStatus: 'provided' | 'not_provided';
  registeredAddress: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  participation: {
    total: number;
    draft: number;
    submitted: number;
    underReview: number;
    withdrawn: number;
    finalized: number;
    tenderCount: number;
  };
  bids: BidListItem[];
}

export interface BharatBidOverview {
  tenderCount: number;
  openTenderCount: number;
  underEvaluationCount: number;
  bidderCount: number;
  bidCount: number;
}

export interface CommandCenterKpis {
  activeTenders: number;
  submittedBids: number;
  openReviews: number;
  pendingClarifications: number;
  evidenceGaps: number;
  verificationIssues: number;
  evaluationsInProgress: number;
}

export interface AttentionQueueItem {
  id: string;
  submissionReference: string;
  tenderId: string;
  tenderReference: string;
  tenderTitle: string;
  bidderLegalName: string;
  bandLabel: string;
  primaryReason: string;
  currentState: string;
  href: string;
}

export interface CommandCenterDashboard {
  generatedAt: string;
  environment: string;
  demoMode: boolean;
  demoLabel: string;
  advisory: string;
  kpis: CommandCenterKpis;
  attention: {
    high: number;
    moderate: number;
    low: number;
    requiringAttention: number;
    queue: AttentionQueueItem[];
    advisory: string;
  };
  evidence: {
    available: number;
    missing: number;
    processing: number;
    conflicts: number;
    reviewRequired: number;
  };
  verification: {
    matched: number;
    mismatched: number;
    notFound: number;
    error: number;
    notRun: number;
    bySource: Record<string, { matched: number; mismatched: number; notFound: number; error: number; sourceMode: string }>;
  };
  intelligence?: {
    coverageAverage: number | null;
    reviewRisk: { low: number; moderate: number; high: number; critical: number };
    pendingRequirements: number;
    officerAdvisory: { text: string; bullets: string[]; disclaimer: string };
  };
  reviews: {
    open: number;
    inReview: number;
    clarificationRequested: number;
    assessed: number;
    closed: number;
    openClarifications: number;
  };
  evaluations: {
    notStarted: number;
    inProgress: number;
    readyForDecision: number;
    decisionRecorded: number;
  };
  recentActivity: ProcurementActivityItem[];
  capabilities: {
    createTender: boolean;
    createBid: boolean;
    generateReport: boolean;
  };
}

export interface ProcurementActivityItem {
  id: string;
  timestamp: string;
  action: string;
  title: string;
  actorKind: 'officer' | 'system';
  actorLabel: string;
  actorName: string | null;
  href: string | null;
  demoLabel: string;
}

export interface ProcurementSearchHit {
  type: 'tender' | 'bidder' | 'bid';
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

export type EvaluationReportKind = 'evaluation' | 'evidence' | 'verification' | 'review' | 'decision';


export type BidDocumentType =
  | 'pan'
  | 'gst_certificate'
  | 'cin'
  | 'udyam_certificate'
  | 'financial_statement'
  | 'turnover_certificate'
  | 'bank_certificate'
  | 'technical_qualification'
  | 'experience_certificate'
  | 'oem_authorization'
  | 'product_datasheet'
  | 'incorporation_certificate'
  | 'authorization_letter'
  | 'affidavit'
  | 'declaration'
  | 'bid_form'
  | 'tender_response'
  | 'price_schedule'
  | 'epfo_certificate'
  | 'esic_certificate'
  | 'nsic_certificate'
  | 'dpiit_certificate'
  | 'bis_licence'
  | 'other';

export type BidDocumentCategory = 'identity' | 'financial' | 'technical' | 'legal' | 'procurement' | 'other';

export type BidDocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed' | 'archived';

export type BidDocumentExtractionStatus = 'not_started' | 'queued' | 'processing' | 'completed' | 'failed';

export interface BidDocumentSummary {
  total: number;
  ready: number;
  processing: number;
  failed: number;
  archived: number;
  unmapped: number;
}

export interface BidDocumentListItem {
  id: string;
  bidSubmissionId: string;
  groupId: string;
  versionNumber: number;
  isCurrent: boolean;
  documentType: BidDocumentType | string;
  documentTypeLabel: string;
  category: BidDocumentCategory | string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumShort: string;
  status: BidDocumentStatus | string;
  extractionStatus: BidDocumentExtractionStatus | string;
  tenderRequirementId: string | null;
  requirementName: string | null;
  linked: boolean;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface BidDocumentDetail extends BidDocumentListItem {
  extractedText: string | null;
  extractedAt: string | null;
  extractionEngine: string | null;
  extractionError: string | null;
  extractionAdvisory: string;
  versions: Array<{ id: string; versionNumber: number; status: string; createdAt: string; isCurrent: boolean }>;
}

export interface BidDocumentListResult {
  items: BidDocumentListItem[];
  summary: BidDocumentSummary;
  requirements: Array<{ id: string; name: string }>;
  meta: PageMeta;
}

export const EXTRACTION_ADVISORY = 'Machine-extracted information. Not independently verified.';

export const DEMO_SOURCE_ADVISORY =
  'Demo source — simulated verification data. Not an official government response.';

export type VerificationSource = 'gst' | 'mca' | 'udyam' | 'gem';
export type VerificationIdentifierType = 'gstin' | 'cin' | 'udyam' | 'pan';
export type VerificationStatus =
  | 'not_started'
  | 'queued'
  | 'processing'
  | 'matched'
  | 'mismatched'
  | 'not_found'
  | 'error';
export type VerificationSourceMode = 'demo' | 'external';
export type VerificationIdentifierOrigin = 'extracted' | 'manual' | 'bidder_profile';
export type VerificationFieldOutcome =
  | 'match'
  | 'mismatch'
  | 'potential_match'
  | 'review_required'
  | 'not_compared';

export interface BidVerificationSummary {
  total: number;
  matched: number;
  mismatched: number;
  notFound: number;
  errors: number;
  processing: number;
}

export interface VerificationSourceView {
  source: VerificationSource | string;
  displayName: string;
  mode: VerificationSourceMode | string;
  availability: string;
  supportedIdentifierTypes: string[];
  advisory: string;
}

export interface VerificationFieldComparison {
  field: string;
  label: string;
  outcome: VerificationFieldOutcome | string;
  claimedValue: string | null;
  claimedOrigin: string | null;
  sourceValue: string | null;
  note: string;
}

export interface VerificationSourceSnapshot {
  source?: string;
  sourceMode?: string;
  sourceDisplayName?: string;
  recordFound?: boolean;
  retrievedAt?: string;
  identifierType?: string;
  identifier?: string;
  legalName?: string | null;
  tradeName?: string | null;
  status?: string | null;
  registrationDate?: string | null;
  state?: string | null;
  attributes?: Record<string, string | null>;
}

export interface VerificationListItem {
  id: string;
  bidSubmissionId: string;
  bidderId: string;
  documentId: string | null;
  documentFilename: string | null;
  documentTypeLabel: string | null;
  groupId: string;
  attemptNumber: number;
  isLatest: boolean;
  identifierType: string;
  identifierTypeLabel: string;
  identifierValue: string;
  identifierOrigin: string;
  source: string;
  sourceDisplayName: string;
  sourceMode: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
}

export interface VerificationDetail extends VerificationListItem {
  explanation: string;
  fieldComparisons: VerificationFieldComparison[] | unknown;
  sourceSnapshot: VerificationSourceSnapshot | unknown;
  errorCode: string | null;
  errorMessage: string | null;
  advisory: string;
  requestedByName: string | null;
  history: Array<{ id: string; attemptNumber: number; status: string; requestedAt: string; isLatest: boolean }>;
}

export interface VerificationListResult {
  items: VerificationListItem[];
  summary: BidVerificationSummary;
  sources: VerificationSourceView[];
  meta: PageMeta;
}

export interface TenderInput {
  referenceNumber: string;
  title: string;
  description?: string;
  organizationName?: string;
  departmentName?: string;
  category: string;
  status?: TenderStatus;
  issueDate: string;
  closingDate: string;
}

function asMeta(meta: Record<string, unknown>): PageMeta {
  return {
    page: Number(meta.page ?? 1),
    pageSize: Number(meta.pageSize ?? 20),
    totalItems: Number(meta.totalItems ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPreviousPage: Boolean(meta.hasPreviousPage),
  };
}

export function getOverview(token: string) {
  return apiGet<BharatBidOverview>('/api/v1/bharatbid/overview', token);
}

export function getCommandCenter(token: string, query: Record<string, QueryValue> = {}) {
  return apiRequest<CommandCenterDashboard>('/api/v1/bharatbid/dashboard', { token, query });
}

export async function listProcurementActivity(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ items: ProcurementActivityItem[] }>('/api/v1/bharatbid/activity', token, query);
  return { items: result.data.items, meta: asMeta(result.meta) };
}

export function searchProcurement(token: string, q: string) {
  return apiRequest<{ q: string; items: ProcurementSearchHit[]; demoLabel: string }>('/api/v1/bharatbid/search', {
    token,
    query: { q },
  });
}

export async function downloadTenderEvaluationReport(
  tenderId: string,
  token: string,
  kind: EvaluationReportKind = 'evaluation',
) {
  const file = await apiDownloadBlob(`/api/v1/tenders/${tenderId}/reports/evaluation?kind=${kind}`, token);
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
  return file.filename;
}

export async function listTenders(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ items: TenderListItem[] }>('/api/v1/tenders', token, query);
  return { items: result.data.items, meta: asMeta(result.meta) };
}

export async function getTender(id: string, token: string) {
  const result = await apiGet<{ tender: TenderDetail }>(`/api/v1/tenders/${id}`, token);
  return result.tender;
}

export async function createTender(input: TenderInput, token: string) {
  const result = await apiRequest<{ tender: TenderDetail }>('/api/v1/tenders', { method: 'POST', token, body: input });
  return result.tender;
}

export async function updateTender(id: string, input: Partial<TenderInput>, token: string) {
  const result = await apiRequest<{ tender: TenderDetail }>(`/api/v1/tenders/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
  return result.tender;
}

export async function updateTenderStatus(id: string, status: TenderStatus, token: string) {
  const result = await apiRequest<{ tender: TenderDetail }>(`/api/v1/tenders/${id}/status`, {
    method: 'POST',
    token,
    body: { status },
  });
  return result.tender;
}

export async function listTenderActivity(id: string, token: string) {
  const result = await apiGet<{ items: TenderActivityItem[] }>(`/api/v1/tenders/${id}/activity`, token);
  return result.items;
}

export async function createTenderRequirement(
  tenderId: string,
  input: {
    name: string;
    description?: string;
    requirementType: RequirementType;
    mandatory?: boolean;
    active?: boolean;
    sortOrder?: number;
  },
  token: string,
) {
  const result = await apiRequest<{ requirement: TenderRequirement }>(`/api/v1/tenders/${tenderId}/requirements`, {
    method: 'POST',
    token,
    body: input,
  });
  return result.requirement;
}

export async function updateTenderRequirement(
  tenderId: string,
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    requirementType: RequirementType;
    mandatory: boolean;
    active: boolean;
    sortOrder: number;
  }>,
  token: string,
) {
  const result = await apiRequest<{ requirement: TenderRequirement }>(
    `/api/v1/tenders/${tenderId}/requirements/${id}`,
    { method: 'PATCH', token, body: input },
  );
  return result.requirement;
}

export async function setRequirementActive(tenderId: string, id: string, active: boolean, token: string) {
  const path = active ? 'activate' : 'deactivate';
  const result = await apiRequest<{ requirement: TenderRequirement }>(
    `/api/v1/tenders/${tenderId}/requirements/${id}/${path}`,
    { method: 'POST', token },
  );
  return result.requirement;
}

export async function moveRequirement(tenderId: string, id: string, direction: 'up' | 'down', token: string) {
  const result = await apiRequest<{ items: TenderRequirement[] }>(
    `/api/v1/tenders/${tenderId}/requirements/${id}/move`,
    { method: 'POST', token, body: { direction } },
  );
  return result.items;
}

export async function listBidders(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ items: BidderListItem[] }>('/api/v1/bidders', token, query);
  return { items: result.data.items, meta: asMeta(result.meta) };
}

export async function getBidder(id: string, token: string) {
  const result = await apiGet<{ bidder: BidderDetail }>(`/api/v1/bidders/${id}`, token);
  return result.bidder;
}

export async function listBidderActivity(id: string, token: string) {
  const result = await apiGet<{ items: TenderActivityItem[] }>(`/api/v1/bidders/${id}/activity`, token);
  return result.items;
}

export async function createBidder(input: Record<string, unknown>, token: string) {
  const result = await apiRequest<{ bidder: BidderDetail }>('/api/v1/bidders', { method: 'POST', token, body: input });
  return result.bidder;
}

export async function updateBidder(id: string, input: Record<string, unknown>, token: string) {
  const result = await apiRequest<{ bidder: BidderDetail }>(`/api/v1/bidders/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
  return result.bidder;
}

export async function listBids(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ items: BidListItem[] }>('/api/v1/bids', token, query);
  return { items: result.data.items, meta: asMeta(result.meta) };
}

export async function getBid(id: string, token: string) {
  const result = await apiGet<{ bid: BidDetail }>(`/api/v1/bids/${id}`, token);
  return result.bid;
}

export async function listBidActivity(id: string, token: string) {
  const result = await apiGet<{ items: TenderActivityItem[] }>(`/api/v1/bids/${id}/activity`, token);
  return result.items;
}

export async function createBid(input: { tenderId: string; bidderId: string }, token: string) {
  const result = await apiRequest<{ bid: BidDetail }>(`/api/v1/tenders/${input.tenderId}/bids`, {
    method: 'POST',
    token,
    body: { bidderId: input.bidderId },
  });
  return result.bid;
}

export async function submitBid(id: string, token: string) {
  const result = await apiRequest<{ bid: BidDetail }>(`/api/v1/bids/${id}/submit`, { method: 'POST', token });
  return result.bid;
}

export async function listBidDocuments(bidId: string, token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{
    items: BidDocumentListItem[];
    summary: BidDocumentSummary;
    requirements: Array<{ id: string; name: string }>;
  }>(`/api/v1/bids/${bidId}/documents`, token, query);
  return {
    items: result.data.items,
    summary: result.data.summary,
    requirements: result.data.requirements,
    meta: asMeta(result.meta),
  };
}

export async function getBidDocument(bidId: string, id: string, token: string) {
  const result = await apiGet<{ document: BidDocumentDetail }>(`/api/v1/bids/${bidId}/documents/${id}`, token);
  return result.document;
}

export async function uploadBidDocument(
  bidId: string,
  input: { file: File; documentType: string; tenderRequirementId?: string | null },
  token: string,
) {
  const form = new FormData();
  form.append('file', input.file);
  form.append('documentType', input.documentType);
  form.append('tenderRequirementId', input.tenderRequirementId ?? 'unmapped');
  const result = await apiUpload<{ document: BidDocumentDetail }>(`/api/v1/bids/${bidId}/documents`, form, token);
  return result.document;
}

export async function replaceBidDocument(bidId: string, id: string, file: File, token: string, documentType?: string) {
  const form = new FormData();
  form.append('file', file);
  if (documentType) {
    form.append('documentType', documentType);
  }
  const result = await apiUpload<{ document: BidDocumentDetail }>(
    `/api/v1/bids/${bidId}/documents/${id}/version`,
    form,
    token,
  );
  return result.document;
}

export async function linkBidDocumentRequirement(
  bidId: string,
  id: string,
  tenderRequirementId: string | null,
  token: string,
) {
  const result = await apiRequest<{ document: BidDocumentDetail }>(
    `/api/v1/bids/${bidId}/documents/${id}/link-requirement`,
    { method: 'POST', token, body: { tenderRequirementId } },
  );
  return result.document;
}

export async function archiveBidDocument(bidId: string, id: string, token: string) {
  const result = await apiRequest<{ document: BidDocumentDetail }>(`/api/v1/bids/${bidId}/documents/${id}/archive`, {
    method: 'POST',
    token,
  });
  return result.document;
}

export async function downloadBidDocument(
  bidId: string,
  id: string,
  token: string,
  disposition: 'inline' | 'attachment' = 'attachment',
) {
  return apiDownloadBlob(`/api/v1/bids/${bidId}/documents/${id}/download?disposition=${disposition}`, token);
}

export async function listVerificationSources(token: string) {
  const result = await apiGet<{ items: VerificationSourceView[] }>('/api/v1/verification-sources', token);
  return result.items;
}

export async function listBidVerifications(bidId: string, token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{
    items: VerificationListItem[];
    summary: BidVerificationSummary;
    sources: VerificationSourceView[];
  }>(`/api/v1/bids/${bidId}/verifications`, token, query);
  return {
    items: result.data.items,
    summary: result.data.summary,
    sources: result.data.sources,
    meta: asMeta(result.meta),
  };
}

export async function getBidVerification(bidId: string, id: string, token: string) {
  const result = await apiGet<{ verification: VerificationDetail }>(
    `/api/v1/bids/${bidId}/verifications/${id}`,
    token,
  );
  return result.verification;
}

export async function createBidVerification(
  bidId: string,
  input: {
    source: string;
    identifierType: string;
    identifier?: string;
    documentId?: string;
  },
  token: string,
) {
  const result = await apiRequest<{ verification: VerificationDetail }>(`/api/v1/bids/${bidId}/verifications`, {
    method: 'POST',
    token,
    body: input,
  });
  return result.verification;
}

export async function retryBidVerification(bidId: string, id: string, token: string) {
  const result = await apiRequest<{ verification: VerificationDetail }>(
    `/api/v1/bids/${bidId}/verifications/${id}/retry`,
    { method: 'POST', token },
  );
  return result.verification;
}

export async function listBidVerificationActivity(bidId: string, id: string, token: string) {
  const result = await apiGet<{ items: TenderActivityItem[] }>(
    `/api/v1/bids/${bidId}/verifications/${id}/activity`,
    token,
  );
  return result.items;
}

export const DEMO_CROSS_ADVISORY =
  'Demo source — simulated verification data. Not an official government response.';

export type CrossVerificationStatus =
  | 'consistent'
  | 'inconsistent'
  | 'insufficient_evidence'
  | 'not_comparable'
  | 'error';

export type CrossSourceBasis = 'demo' | 'external' | 'mixed';

export type CrossFieldOutcome =
  | 'exact_match'
  | 'normalized_match'
  | 'difference'
  | 'missing_from_left'
  | 'missing_from_right'
  | 'not_comparable';

export interface CrossFieldComparison {
  field: string;
  label: string;
  outcome: CrossFieldOutcome | string;
  leftValue: string | null;
  rightValue: string | null;
  note: string;
}

export interface CrossVerificationListItem {
  id: string;
  bidSubmissionId: string;
  comparisonType: string;
  comparisonLabel: string;
  status: CrossVerificationStatus | string;
  sourceBasis: CrossSourceBasis | string;
  leftVerificationId: string;
  rightVerificationId: string;
  leftSource: string;
  rightSource: string;
  leftSourceDisplayName: string;
  rightSourceDisplayName: string;
  leftSourceMode: string;
  rightSourceMode: string;
  fieldComparisons: CrossFieldComparison[];
  explanation: string;
  advisory: string;
  attemptNumber: number;
  isLatest: boolean;
  requestedAt: string;
  completedAt: string | null;
  requestedByName: string | null;
  history: Array<{ id: string; attemptNumber: number; status: string; requestedAt: string; isLatest: boolean }>;
}

export type EvidenceStatus =
  | 'evidence_available'
  | 'evidence_missing'
  | 'evidence_processing'
  | 'evidence_conflict'
  | 'not_evaluated';

export type RequirementEvaluation = 'pass' | 'fail' | 'review_required' | 'not_evaluated';

export interface RequirementIntelligenceItem {
  requirementId: string;
  name: string;
  description: string | null;
  requirementType: string;
  mandatory: boolean;
  ruleKind: string;
  evidenceStatus: EvidenceStatus | string;
  evaluation: RequirementEvaluation | string;
  explanation: string;
  documents: Array<{ id: string; originalFilename: string; documentType: string }>;
  verification: { id: string; status: string; source: string } | null;
  crossCheck: { id: string; status: string; comparisonType: string } | null;
}

export interface RequirementIntelligenceSummary {
  total: number;
  mandatory: number;
  evidenceAvailable: number;
  evidenceMissing: number;
  reviewRequired: number;
  passCount: number;
  evidenceCoveragePercent: number | null;
}

export interface BidIntelligenceSummary {
  crossChecks: {
    total: number;
    consistent: number;
    inconsistent: number;
    insufficient: number;
  };
  requirements: RequirementIntelligenceSummary;
}

export interface ReviewItem {
  id: string;
  kind: 'requirement' | 'cross_check' | string;
  title: string;
  reason: string;
  requirementId?: string;
  documentId?: string;
  verificationId?: string;
  crossVerificationId?: string;
}

export interface RequirementIntelligenceResult {
  items: RequirementIntelligenceItem[];
  summary: RequirementIntelligenceSummary;
  reviewItems: ReviewItem[];
  advisory: string;
}

export async function listBidCrossVerifications(
  bidId: string,
  token: string,
  query: Record<string, QueryValue> = {},
) {
  const result = await apiGetWithMeta<{ items: CrossVerificationListItem[] }>(
    `/api/v1/bids/${bidId}/cross-verifications`,
    token,
    query,
  );
  return result.data.items;
}

export async function getBidCrossVerification(bidId: string, id: string, token: string) {
  const result = await apiGet<{ crossVerification: CrossVerificationListItem }>(
    `/api/v1/bids/${bidId}/cross-verifications/${id}`,
    token,
  );
  return result.crossVerification;
}

export async function createBidCrossVerifications(
  bidId: string,
  token: string,
  input: { leftVerificationId?: string; rightVerificationId?: string; comparisonType?: string } = {},
) {
  const result = await apiRequest<{ items: CrossVerificationListItem[] }>(
    `/api/v1/bids/${bidId}/cross-verifications`,
    { method: 'POST', token, body: input },
  );
  return result.items;
}

export async function listBidCrossVerificationActivity(bidId: string, id: string, token: string) {
  const result = await apiGet<{ items: TenderActivityItem[] }>(
    `/api/v1/bids/${bidId}/cross-verifications/${id}/activity`,
    token,
  );
  return result.items;
}

export async function getBidRequirementIntelligence(bidId: string, token: string) {
  return apiGet<RequirementIntelligenceResult>(`/api/v1/bids/${bidId}/requirement-intelligence`, token);
}

export async function listBidReviewItems(bidId: string, token: string) {
  const result = await apiGet<{ items: ReviewItem[]; summary: RequirementIntelligenceSummary }>(
    `/api/v1/bids/${bidId}/review-items`,
    token,
  );
  return result;
}

export const DEMO_REVIEW_ADVISORY =
  'Decision support only. Officer assessments do not approve, reject, or award a bid.';

export const DEMO_CLARIFICATION_ADVISORY =
  'DEMO / SYNTHETIC — this clarification is stored in-app. No bidder email or government message was sent.';

export type OfficerReviewStatus =
  | 'open'
  | 'in_review'
  | 'clarification_requested'
  | 'assessed'
  | 'closed';

export type OfficerReviewIssueType =
  | 'evidence_missing'
  | 'verification_mismatch'
  | 'cross_source_inconsistency'
  | 'evidence_conflict'
  | 'review_required'
  | 'source_unavailable'
  | 'requirement_unevaluated';

export type OfficerAssessmentType =
  | 'confirmed'
  | 'explanation_accepted'
  | 'evidence_sufficient'
  | 'evidence_insufficient'
  | 'requires_clarification'
  | 'not_applicable';

export interface BidReviewSummary {
  total: number;
  open: number;
  inReview: number;
  clarificationRequested: number;
  assessed: number;
  closed: number;
  finalProcurementDecisions: number;
}

export interface OfficerReviewListItem {
  id: string;
  bidSubmissionId: string;
  bidReference: string;
  tenderId: string;
  tenderReference: string;
  tenderTitle: string;
  bidderId: string;
  bidderLegalName: string;
  issueType: OfficerReviewIssueType | string;
  issueLabel: string;
  status: OfficerReviewStatus | string;
  title: string;
  machineFinding: string;
  mandatory: boolean;
  requirementName: string | null;
  latestAssessment: {
    assessment: string;
    assessedAt: string;
    officerName: string;
  } | null;
  openClarification: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerReviewDetail extends OfficerReviewListItem {
  whyCreated: string;
  whyItMatters: string;
  inspectHint: string;
  actionHint: string;
  machineExplanation: string;
  advisory: string;
  requirement: { id: string; name: string; mandatory: boolean; requirementType: string } | null;
  document: {
    id: string;
    originalFilename: string;
    documentType: string;
    extractionStatus: string;
    extractionAdvisory?: string;
  } | null;
  verification: {
    id: string;
    status: string;
    source: string;
    sourceDisplayName: string;
    sourceMode: string;
  } | null;
  crossVerification: {
    id: string;
    status: string;
    comparisonType: string;
    leftSourceDisplayName: string;
    rightSourceDisplayName: string;
    sourceBasis: string;
  } | null;
  latestAssessment: {
    id: string;
    assessment: string;
    note: string;
    attemptNumber: number;
    assessedAt: string;
    officerName: string;
  } | null;
  assessments: Array<{
    id: string;
    assessment: string;
    note: string;
    attemptNumber: number;
    isLatest: boolean;
    assessedAt: string;
    officerName: string;
  }>;
  clarifications: Array<{
    id: string;
    message: string;
    status: string;
    requestedAt: string;
    requestedByName: string;
    response: string | null;
    respondedAt: string | null;
    respondedByName: string | null;
    synthetic: boolean;
    advisory: string;
  }>;
  openedAt: string | null;
  openedByName: string | null;
  closedAt: string | null;
  closedByName: string | null;
}

export interface OfficerReviewDashboard {
  statuses: Record<string, number>;
  issues: Record<string, number>;
  openClarifications: number;
  advisory: string;
}

export async function listOfficerReviews(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ items: OfficerReviewListItem[] }>('/api/v1/reviews', token, query);
  return { items: result.data.items, meta: asMeta(result.meta) };
}

export async function getOfficerReviewSummary(token: string) {
  const result = await apiGet<{ summary: OfficerReviewDashboard }>('/api/v1/reviews/summary', token);
  return result.summary;
}

export async function getOfficerReview(id: string, token: string) {
  const result = await apiGet<{ review: OfficerReviewDetail }>(`/api/v1/reviews/${id}`, token);
  return result.review;
}

export async function listBidOfficerReviews(bidId: string, token: string) {
  return apiGet<{ items: OfficerReviewListItem[]; summary: BidReviewSummary; advisory: string }>(
    `/api/v1/bids/${bidId}/reviews`,
    token,
  );
}

export async function startOfficerReview(id: string, token: string) {
  const result = await apiRequest<{ review: OfficerReviewDetail }>(`/api/v1/reviews/${id}/start`, {
    method: 'POST',
    token,
    body: {},
  });
  return result.review;
}

export async function closeOfficerReview(id: string, token: string) {
  const result = await apiRequest<{ review: OfficerReviewDetail }>(`/api/v1/reviews/${id}/close`, {
    method: 'POST',
    token,
    body: {},
  });
  return result.review;
}

export async function createOfficerAssessment(
  id: string,
  token: string,
  input: { assessment: string; note: string },
) {
  const result = await apiRequest<{ review: OfficerReviewDetail }>(`/api/v1/reviews/${id}/assessments`, {
    method: 'POST',
    token,
    body: input,
  });
  return result.review;
}

export async function createOfficerClarification(
  id: string,
  token: string,
  input: { message: string; reason?: string; requiredInformation?: string },
) {
  const result = await apiRequest<{ review: OfficerReviewDetail }>(`/api/v1/reviews/${id}/clarifications`, {
    method: 'POST',
    token,
    body: input,
  });
  return result.review;
}

export async function respondOfficerClarification(
  reviewId: string,
  clarificationId: string,
  token: string,
  response: string,
) {
  const result = await apiRequest<{ review: OfficerReviewDetail }>(
    `/api/v1/reviews/${reviewId}/clarifications/${clarificationId}/respond`,
    { method: 'POST', token, body: { response } },
  );
  return result.review;
}

export async function cancelOfficerClarification(reviewId: string, clarificationId: string, token: string) {
  const result = await apiRequest<{ review: OfficerReviewDetail }>(
    `/api/v1/reviews/${reviewId}/clarifications/${clarificationId}/cancel`,
    { method: 'POST', token, body: {} },
  );
  return result.review;
}

export async function listOfficerReviewActivity(id: string, token: string) {
  const result = await apiGet<{ items: TenderActivityItem[] }>(`/api/v1/reviews/${id}/activity`, token);
  return result.items;
}

export const DEMO_ATTENTION_ADVISORY =
  'Decision-support only: This indicator prioritizes bids for human review using available evidence, verification, cross-check and review signals. It does not determine bidder eligibility, fraud, rejection or award.';

export type AttentionBand =
  | 'low_attention'
  | 'moderate_attention'
  | 'elevated_attention'
  | 'high_attention'
  | 'critical_attention';

export interface BidAttentionSummary {
  score: number;
  band: AttentionBand;
  bandLabel: string;
  openIssues: number;
  pendingClarifications: number;
  evidenceCoveragePercent: number | null;
  modelVersion: string;
  scoreHint: string;
}

export interface AttentionFactor {
  id: string;
  type: string;
  category: string;
  origin: 'machine' | 'human';
  originLabel: string;
  originalPoints: number;
  currentPoints: number;
  description: string;
  adjustmentReason: string | null;
  source: { kind: string; id: string; label: string };
}

export interface AttentionListItem {
  id: string;
  submissionReference: string;
  tenderId: string;
  tenderReference: string;
  tenderTitle: string;
  tenderCategory: string | null;
  tenderClosingDate: string | null;
  bidderId: string;
  bidderLegalName: string;
  status: string;
  score: number;
  band: AttentionBand;
  bandLabel: string;
  openIssues: number;
  pendingClarifications: number;
  evidenceCoveragePercent: number | null;
  verificationSummary: { total: number; matched: number; mismatched: number; notFound: number; errors: number };
  lastReviewAt: string | null;
  modelVersion: string;
}

export interface BidAttentionDetail extends AttentionListItem {
  unadjustedScore: number;
  scoreHint: string;
  advisory: string;
  demoLabel: string;
  factors: AttentionFactor[];
  history: Array<{ score: number; label: string; reason: string }>;
  coverage?: {
    score: number;
    label: string;
    disclaimer: string;
    factors: Array<{ id: string; label: string; points: number; note: string }>;
  };
  reviewRisk?: { level: string; label: string; explanation: string };
  officerAdvisory?: { text: string; bullets: string[]; disclaimer: string };
  makeInIndia?: {
    declaredClass: string;
    localContentPercent: number | null;
    documentId: string | null;
    documentFilename: string | null;
    explanation: string;
  };
  oemAuthorization?: {
    outcome: string;
    oemName: string | null;
    product: string | null;
    authorizationReference: string | null;
    validFrom: string | null;
    validUntil: string | null;
    bidClaim: string | null;
    documentId: string | null;
    explanation: string;
  };
  digiLockerDemo?: Array<{
    documentId: string;
    documentFilename: string;
    status: string;
    disclaimer: string;
  }>;
  informationGaps?: Array<{ id: string; kind: string; description: string }>;
}

export interface AttentionDashboard {
  totalBids: number;
  lowAttention: number;
  moderateAttention: number;
  elevatedAttention: number;
  highAttention: number;
  criticalAttention: number;
  requiringAttention: number;
  openReviews: number;
  pendingClarifications: number;
  modelVersion: string;
  advisory: string;
  demoLabel: string;
}

export async function getAttentionSummary(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ summary: AttentionDashboard }>('/api/v1/intelligence/summary', token, query);
  return result.data.summary;
}

export async function listAttentionBids(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ items: AttentionListItem[] }>('/api/v1/intelligence/bids', token, query);
  return { items: result.data.items, meta: asMeta(result.meta) };
}

export async function getBidIntelligence(bidId: string, token: string) {
  const result = await apiGet<{ intelligence: BidAttentionDetail }>(`/api/v1/bids/${bidId}/intelligence`, token);
  return result.intelligence;
}

export async function getBidIntelligenceFactors(bidId: string, token: string) {
  return apiGet<{
    score: number;
    unadjustedScore: number;
    band: AttentionBand;
    bandLabel: string;
    modelVersion: string;
    factors: AttentionFactor[];
    advisory: string;
    scoreHint: string;
  }>(`/api/v1/bids/${bidId}/intelligence/factors`, token);
}

export async function getBidIntelligenceHistory(bidId: string, token: string) {
  const result = await apiGet<{
    history: {
      modelVersion: string;
      current: number;
      unadjusted: number;
      entries: Array<{ score: number; label: string; reason: string }>;
      advisory: string;
    };
  }>(`/api/v1/bids/${bidId}/intelligence/history`, token);
  return result.history;
}

export function attentionFactorHref(bidId: string, factor: AttentionFactor): string {
  if (factor.source.kind === 'review') {
    return `/bharatbid/review/${factor.source.id}`;
  }
  if (factor.source.kind === 'cross_check') {
    return `/bharatbid/bids/${bidId}/cross-checks`;
  }
  if (factor.source.kind === 'verification') {
    return `/bharatbid/bids/${bidId}/verification`;
  }
  return `/bharatbid/bids/${bidId}/requirements`;
}

export const DEMO_EVALUATION_ADVISORY =
  'This workspace supports human procurement evaluation using available evidence and system findings. Final procurement decisions remain with authorized officers. BharatBid does not automatically rank bidders, select winners, reject bids, or award tenders.';

export const DEMO_DECISION_ADVISORY =
  'Officer-entered decision-support record. This is not an award, rejection, disqualification, or automated system decision.';

export type TenderEvaluationStatus =
  | 'not_started'
  | 'in_progress'
  | 'ready_for_decision'
  | 'decision_recorded';

export type EvaluationDecisionType =
  | 'accepted_for_further_evaluation'
  | 'requires_clarification'
  | 'not_recommended_for_further_evaluation';

export type EvaluationReadiness =
  | 'ready'
  | 'review_required'
  | 'evidence_incomplete'
  | 'clarification_pending';

export type RequirementCellStatus =
  | 'pass'
  | 'evidence_missing'
  | 'processing'
  | 'conflict'
  | 'review_required'
  | 'not_evaluated';

export interface EvaluationActor {
  id: string;
  displayName: string;
}

export interface TenderEvaluationView {
  id: string;
  tenderId: string;
  status: TenderEvaluationStatus;
  statusLabel: string;
  startedAt: string | null;
  startedBy: EvaluationActor | null;
  readyAt: string | null;
  readyBy: EvaluationActor | null;
  recordedAt: string | null;
  recordedBy: EvaluationActor | null;
  lastUpdated: string;
  lastUpdatedBy: EvaluationActor | null;
  tender: {
    id: string;
    referenceNumber: string;
    title: string;
    category: string;
    status: string;
    closingDate: string;
  };
  advisory: string;
  demoLabel: string;
}

export interface EvaluationListItem {
  tenderId: string;
  evaluationId: string | null;
  referenceNumber: string;
  title: string;
  organizationName: string;
  departmentName: string;
  category: string;
  status: string;
  closingDate: string;
  submittedBids: number;
  underEvaluation: number;
  reviewRequired: number;
  evidenceGaps: number;
  verificationIssues: number;
  evaluationStatus: TenderEvaluationStatus;
  lastEvaluationActivity: string | null;
  demoLabel: string;
}

export interface EvaluationNote {
  id: string;
  evaluationId: string;
  bidSubmissionId: string | null;
  bidReference: string | null;
  note: string;
  attemptNumber: number;
  isLatest: boolean;
  createdBy: EvaluationActor;
  createdAt: string;
}

export interface EvaluationDecision {
  id: string;
  evaluationId: string;
  bidSubmissionId: string;
  bidReference: string;
  decision: EvaluationDecisionType;
  decisionLabel: string;
  reason: string;
  attemptNumber: number;
  isLatest: boolean;
  decidedBy: EvaluationActor;
  decidedAt: string;
  advisory: string;
}

export interface RequirementCell {
  requirementId: string;
  name: string;
  mandatory: boolean;
  evidenceStatus: string;
  evaluation: string;
  cellStatus: RequirementCellStatus;
  cellLabel: string;
  explanation: string;
  documents: Array<{ id: string; originalFilename: string; documentType: string }>;
  verification: { id: string; status: string; source: string } | null;
  crossCheck: { id: string; status: string; comparisonType: string } | null;
  reviews: Array<{ id: string; title: string; status: string; issueType: string }>;
}

export interface ComparisonBid {
  id: string;
  submissionReference: string;
  bidderId: string;
  bidderLegalName: string;
  status: string;
  evidenceCoveragePercent: number | null;
  verificationSummary: { total: number; matched: number; mismatched: number; notFound: number; errors: number };
  verificationLabel: string;
  crossCheckSummary: {
    total: number;
    consistent: number;
    inconsistent: number;
    insufficient: number;
    notComparable: number;
  };
  crossCheckLabel: string;
  reviewSummary: {
    open: number;
    inReview: number;
    clarificationRequested: number;
    assessed: number;
    closed: number;
    total: number;
  };
  attention: {
    score: number;
    band: AttentionBand;
    bandLabel: string;
    scoreHint: string;
    advisory: string;
    factors: AttentionFactor[];
  } | null;
  readiness: EvaluationReadiness;
  readinessLabel: string;
  financialAmount: null;
  financialUnavailableReason: string;
  latestDecision: EvaluationDecision | null;
  requirementCells: RequirementCell[];
  links: {
    bid: string;
    documents: string;
    verification: string;
    crossChecks: string;
    requirements: string;
    review: string;
    intelligence: string;
  };
}

export interface EvaluationComparison {
  tender: {
    id: string;
    referenceNumber: string;
    title: string;
    organizationName: string;
    departmentName: string;
    category: string;
    status: string;
    closingDate: string;
  };
  evaluation: TenderEvaluationView | null;
  overview: {
    submittedBids: number;
    comparedBids: number;
    evidenceGaps: number;
    verificationIssues: number;
    openReviews: number;
    pendingClarifications: number;
  };
  requirements: Array<{
    id: string;
    name: string;
    description: string | null;
    requirementType: RequirementType;
    mandatory: boolean;
    active: boolean;
    sortOrder: number;
  }>;
  availableBids: Array<{ id: string; submissionReference: string; bidderLegalName: string; status: string }>;
  bids: ComparisonBid[];
  notes: EvaluationNote[];
  decisions: EvaluationDecision[];
  checklist: Array<{ id: string; label: string; passed: boolean }>;
  financialUnavailableReason: string;
  advisory: string;
  decisionAdvisory: string;
  attentionDisclaimer: string;
  demoLabel: string;
}

export interface BidEvaluationSummary {
  bidId: string;
  tenderId: string;
  evaluation: TenderEvaluationView | null;
  readiness: EvaluationReadiness | null;
  readinessLabel: string | null;
  latestDecision: EvaluationDecision | null;
  notes: EvaluationNote[];
  decisions: EvaluationDecision[];
  comparisonPath: string;
  advisory: string;
  decisionAdvisory: string;
  demoLabel: string;
}

export async function listEvaluations(token: string, query: Record<string, QueryValue> = {}) {
  const result = await apiGetWithMeta<{ items: EvaluationListItem[]; advisory: string }>(
    '/api/v1/evaluations',
    token,
    query,
  );
  return { items: result.data.items, advisory: result.data.advisory, meta: asMeta(result.meta) };
}

export async function createEvaluation(tenderId: string, token: string) {
  const result = await apiRequest<{ evaluation: TenderEvaluationView }>('/api/v1/evaluations', {
    method: 'POST',
    token,
    body: { tenderId },
  });
  return result.evaluation;
}

export async function getEvaluation(id: string, token: string) {
  const result = await apiGet<{ evaluation: TenderEvaluationView }>(`/api/v1/evaluations/${id}`, token);
  return result.evaluation;
}

export async function startEvaluation(id: string, token: string) {
  const result = await apiRequest<{ evaluation: TenderEvaluationView }>(`/api/v1/evaluations/${id}/start`, {
    method: 'POST',
    token,
  });
  return result.evaluation;
}

export async function markEvaluationReady(id: string, token: string) {
  const result = await apiRequest<{ evaluation: TenderEvaluationView }>(`/api/v1/evaluations/${id}/ready`, {
    method: 'POST',
    token,
  });
  return result.evaluation;
}

export async function recordEvaluationComplete(id: string, token: string) {
  const result = await apiRequest<{ evaluation: TenderEvaluationView }>(`/api/v1/evaluations/${id}/record`, {
    method: 'POST',
    token,
  });
  return result.evaluation;
}

export async function createEvaluationNote(
  id: string,
  body: { note: string; bidSubmissionId?: string },
  token: string,
) {
  const result = await apiRequest<{ note: EvaluationNote }>(`/api/v1/evaluations/${id}/notes`, {
    method: 'POST',
    token,
    body,
  });
  return result.note;
}

export async function listEvaluationNotes(id: string, token: string) {
  const result = await apiGet<{ items: EvaluationNote[]; advisory: string }>(`/api/v1/evaluations/${id}/notes`, token);
  return result.items;
}

export async function createEvaluationDecision(
  id: string,
  body: { bidSubmissionId: string; decision: EvaluationDecisionType; reason: string },
  token: string,
) {
  const result = await apiRequest<{ decision: EvaluationDecision }>(`/api/v1/evaluations/${id}/decisions`, {
    method: 'POST',
    token,
    body,
  });
  return result.decision;
}

export async function getTenderEvaluationComparison(tenderId: string, token: string, bidIds?: string[]) {
  const result = await apiGetWithMeta<{ comparison: EvaluationComparison }>(
    `/api/v1/tenders/${tenderId}/evaluation/comparison`,
    token,
    bidIds && bidIds.length > 0 ? { bidIds: bidIds.join(',') } : undefined,
  );
  return result.data.comparison;
}

export async function getBidEvaluation(bidId: string, token: string) {
  const result = await apiGet<{ evaluation: BidEvaluationSummary }>(`/api/v1/bids/${bidId}/evaluation`, token);
  return result.evaluation;
}
