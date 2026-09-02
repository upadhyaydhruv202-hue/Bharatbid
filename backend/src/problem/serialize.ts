import type { BidDocument, BidSubmission, BidVerification, Bidder, Tender, TenderRequirement } from '@prisma/client';

import { identifierPresence, isProfileComplete, maskPan } from './identifiers';
import type { TenderStatusAction } from './transitions';
import {
  BID_DOCUMENT_TYPE_CATEGORY,
  BID_DOCUMENT_TYPE_LABELS,
  EXTRACTION_ADVISORY,
  type BidDocumentTypeName,
  type BidSubmissionStatusName,
  type TenderRequirementTypeName,
  type TenderStatusName,
} from './types';
import {
  DEMO_SOURCE_ADVISORY,
  VERIFICATION_IDENTIFIER_LABELS,
  type VerificationIdentifierTypeName,
} from './verification/types';

export interface TenderListItem {
  id: string;
  referenceNumber: string;
  title: string;
  organizationName: string;
  departmentName: string;
  category: string;
  status: TenderStatusName;
  issueDate: string;
  closingDate: string;
  bidCount: number;
  requirementCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenderRequirementView {
  id: string;
  tenderId: string;
  name: string;
  description: string | null;
  requirementType: TenderRequirementTypeName;
  mandatory: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessItem {
  id: string;
  label: string;
  passed: boolean;
}

export interface TenderReadiness {
  readyToOpen: boolean;
  items: ReadinessItem[];
}

export interface RequirementCounts {
  total: number;
  mandatory: number;
  optional: number;
  active: number;
}

export interface BidParticipationSummary {
  total: number;
  draft: number;
  submitted: number;
  underReview: number;
  withdrawn: number;
  finalized: number;
}

export interface TenderFieldLocks {
  all: boolean;
  closingDate: boolean;
  requirementCore: boolean;
}

export interface TenderCreatedBy {
  id: string;
  displayName: string;
}

export interface TenderActivityItem {
  id: string;
  action: string;
  title: string;
  actorName: string | null;
  timestamp: string;
}

export interface TenderDetail extends Omit<TenderListItem, 'bidCount' | 'requirementCount'> {
  description: string | null;
  createdById: string | null;
  createdBy: TenderCreatedBy | null;
  requirements: TenderRequirementView[];
  bidCount: number;
  requirementCount: number;
  readiness: TenderReadiness;
  requirementCounts: RequirementCounts;
  bidSummary: BidParticipationSummary;
  allowedStatusActions: TenderStatusAction[];
  fieldLocks: TenderFieldLocks;
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
  participation: BidParticipationSummary & { tenderCount: number };
  bids: BidListItem[];
}

export interface BidListItem {
  id: string;
  submissionReference: string;
  tenderId: string;
  tenderReference: string;
  tenderTitle: string;
  bidderId: string;
  bidderLegalName: string;
  status: BidSubmissionStatusName;
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
  readiness: TenderReadiness;
  fieldLocks: { all: boolean };
  allowedActions: Array<{ action: 'submit'; label: string }>;
  documentSummary?: BidDocumentSummary;
  verificationSummary?: VerificationSummary;
}

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
  documentType: string;
  documentTypeLabel: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumShort: string;
  status: string;
  extractionStatus: string;
  tenderRequirementId: string | null;
  requirementName: string | null;
  linked: boolean;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface VerificationSummary {
  total: number;
  matched: number;
  mismatched: number;
  notFound: number;
  errors: number;
  processing: number;
}

export interface VerificationSourceView {
  source: string;
  displayName: string;
  mode: string;
  availability: string;
  supportedIdentifierTypes: string[];
  advisory: string;
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
  fieldComparisons: unknown;
  sourceSnapshot: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  advisory: string;
  requestedByName: string | null;
  history: Array<{ id: string; attemptNumber: number; status: string; requestedAt: string; isLatest: boolean }>;
}

export interface BidDocumentDetail extends BidDocumentListItem {
  extractedText: string | null;
  extractedAt: string | null;
  extractionEngine: string | null;
  extractionError: string | null;
  extractionAdvisory: string;
  versions: Array<{ id: string; versionNumber: number; status: string; createdAt: string; isCurrent: boolean }>;
}

function iso(value: Date): string {
  return value.toISOString();
}

export function toTenderListItem(
  tender: Tender & { _count?: { bids: number; requirements?: number } },
): TenderListItem {
  return {
    id: tender.id,
    referenceNumber: tender.referenceNumber,
    title: tender.title,
    organizationName: tender.organizationName,
    departmentName: tender.departmentName,
    category: tender.category,
    status: tender.status,
    issueDate: iso(tender.issueDate),
    closingDate: iso(tender.closingDate),
    bidCount: tender._count?.bids ?? 0,
    requirementCount: tender._count?.requirements ?? 0,
    createdAt: iso(tender.createdAt),
    updatedAt: iso(tender.updatedAt),
  };
}

export function toTenderRequirementView(requirement: TenderRequirement): TenderRequirementView {
  return {
    id: requirement.id,
    tenderId: requirement.tenderId,
    name: requirement.name,
    description: requirement.description,
    requirementType: requirement.requirementType,
    mandatory: requirement.mandatory,
    active: requirement.active,
    sortOrder: requirement.sortOrder,
    createdAt: iso(requirement.createdAt),
    updatedAt: iso(requirement.updatedAt),
  };
}

export function toRequirementCounts(requirements: TenderRequirement[]): RequirementCounts {
  return {
    total: requirements.length,
    mandatory: requirements.filter((item) => item.mandatory).length,
    optional: requirements.filter((item) => !item.mandatory).length,
    active: requirements.filter((item) => item.active).length,
  };
}

export function toTenderReadiness(tender: Tender, requirements: TenderRequirement[]): TenderReadiness {
  const items: ReadinessItem[] = [
    {
      id: 'basic',
      label: 'Basic tender information',
      passed: Boolean(
        tender.referenceNumber.trim() &&
          tender.title.trim() &&
          tender.organizationName.trim() &&
          tender.departmentName.trim() &&
          tender.category.trim(),
      ),
    },
    {
      id: 'dates',
      label: 'Valid issue and closing dates',
      passed: tender.closingDate.getTime() >= tender.issueDate.getTime(),
    },
    {
      id: 'requirements',
      label: 'At least one active requirement',
      passed: requirements.some((item) => item.active),
    },
    {
      id: 'status',
      label: 'Tender status configured',
      passed: Boolean(tender.status),
    },
  ];
  return { readyToOpen: items.every((item) => item.passed), items };
}

export function emptyBidSummary(): BidParticipationSummary {
  return { total: 0, draft: 0, submitted: 0, underReview: 0, withdrawn: 0, finalized: 0 };
}

export function toBidSummary(counts: Partial<Record<BidSubmissionStatusName, number>>): BidParticipationSummary {
  const draft = counts.draft ?? 0;
  const submitted = counts.submitted ?? 0;
  const underReview = counts.under_review ?? 0;
  const withdrawn = counts.withdrawn ?? 0;
  const finalized = counts.finalized ?? 0;
  return {
    total: draft + submitted + underReview + withdrawn + finalized,
    draft,
    submitted,
    underReview,
    withdrawn,
    finalized,
  };
}

export function activityTitle(action: string, metadata: unknown): string {
  const meta = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
  switch (action) {
    case 'tender.created':
      return 'created this tender';
    case 'tender.updated':
      return 'updated tender details';
    case 'tender.status.changed':
      return `moved the tender to ${String(meta.to ?? 'a new status').replace(/_/g, ' ')}`;
    case 'tender.requirement.created':
      return meta.name ? `added requirement “${String(meta.name)}”` : 'added a requirement';
    case 'tender.requirement.updated':
      return 'updated a requirement';
    case 'tender.requirement.activated':
      return 'activated a requirement';
    case 'tender.requirement.deactivated':
      return 'deactivated a requirement';
    case 'tender.requirement.reordered':
      return 'reordered requirements';
    case 'bidder.created':
      return 'created this bidder profile';
    case 'bidder.updated':
      return 'updated bidder details';
    case 'bid.created':
      return 'created this bid submission';
    case 'bid.updated':
      return 'updated the draft submission';
    case 'bid.submitted':
      return 'submitted this bid';
    case 'bid.status.changed':
      return `moved the bid to ${String(meta.to ?? 'a new status').replace(/_/g, ' ')}`;
    case 'document.uploaded':
      return meta.originalFilename
        ? `uploaded “${String(meta.originalFilename)}”`
        : 'uploaded a document';
    case 'document.updated':
      return 'updated document details';
    case 'document.version.created':
      return meta.originalFilename
        ? `added a new version of “${String(meta.originalFilename)}”`
        : 'added a document version';
    case 'document.requirement.linked':
      return meta.requirementName
        ? `linked a document to “${String(meta.requirementName)}”`
        : 'updated document requirement mapping';
    case 'document.archived':
      return 'archived a document';
    case 'document.downloaded':
      return 'downloaded a document';
    case 'document.extraction.started':
      return 'started document extraction';
    case 'document.extraction.completed':
      return 'completed document extraction';
    case 'document.extraction.failed':
      return 'document extraction failed';
    case 'verification.requested':
      return meta.retry
        ? `retried ${String(meta.identifierType ?? 'identifier')} against ${String(meta.source ?? 'a demo source').toUpperCase()} demo registry`
        : `requested ${String(meta.identifierType ?? 'identifier')} check against ${String(meta.source ?? 'a demo source').toUpperCase()} demo registry`;
    case 'verification.completed':
      return 'verification completed — matched (demo source)';
    case 'verification.mismatched':
      return 'verification completed — mismatched (demo source)';
    case 'verification.not_found':
      return 'verification completed — not found (demo source)';
    case 'verification.failed':
      return 'verification could not be completed';
    case 'verification.retried':
      return 'retried a failed verification against a demo source';
    case 'cross_verification.requested':
      return `requested ${String(meta.comparisonType ?? 'source').replace(/_/g, ' ↔ ')} cross-check`;
    case 'cross_verification.completed':
      return 'cross-check completed (demo sources)';
    case 'cross_verification.inconsistent':
      return 'cross-check completed — difference detected (demo sources)';
    case 'requirement.evaluation.completed':
      return 'requirement evidence mapping was generated';
    case 'review_item.created':
      return 'System identified a review item';
    case 'review.opened':
      return 'opened this review item';
    case 'review.started':
      return 'started officer review';
    case 'review.assessment.created':
      return 'recorded an officer assessment';
    case 'review.assessment.updated':
      return 'recorded an amended officer assessment';
    case 'clarification.requested':
      return 'requested clarification (in-app, DEMO)';
    case 'clarification.responded':
      return 'recorded a DEMO / SYNTHETIC clarification response';
    case 'clarification.cancelled':
      return 'cancelled a clarification request';
    case 'review.closed':
      return 'closed this review item';
    case 'evaluation.created':
      return 'created this evaluation workspace';
    case 'evaluation.started':
      return 'started officer evaluation';
    case 'evaluation.note.created':
      return 'recorded an officer evaluation note';
    case 'evaluation.decision.recorded':
      return 'recorded an officer decision-support entry';
    case 'evaluation.status.changed':
      return `moved the evaluation to ${String(meta.to ?? 'a new status').replace(/_/g, ' ')}`;
    case 'evaluation.report.generated':
      return 'generated a tender evaluation report';
    default:
      return action.replace(/\./g, ' ');
  }
}

export function toTenderDetail(
  tender: Tender & {
    requirements: TenderRequirement[];
    createdBy?: { id: string; displayName: string } | null;
    _count?: { bids: number; requirements?: number };
  },
  extras: {
    bidSummary: BidParticipationSummary;
    fieldLocks: TenderFieldLocks;
    allowedStatusActions: TenderStatusAction[];
  },
): TenderDetail {
  const requirements = [...tender.requirements].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.createdAt.getTime() - right.createdAt.getTime(),
  );
  return {
    ...toTenderListItem({
      ...tender,
      _count: {
        bids: extras.bidSummary.total,
        requirements: requirements.length,
      },
    }),
    description: tender.description,
    createdById: tender.createdById,
    createdBy: tender.createdBy ? { id: tender.createdBy.id, displayName: tender.createdBy.displayName } : null,
    requirements: requirements.map(toTenderRequirementView),
    readiness: toTenderReadiness(tender, requirements),
    requirementCounts: toRequirementCounts(requirements),
    bidSummary: extras.bidSummary,
    allowedStatusActions: extras.allowedStatusActions,
    fieldLocks: extras.fieldLocks,
  };
}

export function toBidderListItem(
  bidder: Bidder & {
    tenderCount?: number;
    activeBidCount?: number;
    lastParticipationAt?: Date | null;
  },
): BidderListItem {
  return {
    id: bidder.id,
    legalName: bidder.legalName,
    tradeName: bidder.tradeName,
    panMasked: maskPan(bidder.pan),
    panStatus: identifierPresence(bidder.pan),
    gstinStatus: identifierPresence(bidder.gstin),
    udyamStatus: identifierPresence(bidder.udyamRegistrationNumber),
    profileComplete: isProfileComplete(bidder),
    city: bidder.city,
    state: bidder.state,
    tenderCount: bidder.tenderCount ?? 0,
    activeBidCount: bidder.activeBidCount ?? 0,
    lastParticipationAt: bidder.lastParticipationAt ? iso(bidder.lastParticipationAt) : null,
    createdAt: iso(bidder.createdAt),
  };
}

export function toBidderDetail(
  bidder: Bidder & {
    bids: Array<BidSubmission & { tender: Pick<Tender, 'id' | 'referenceNumber' | 'title'> }>;
  },
): BidderDetail {
  const counts: Partial<Record<BidSubmissionStatusName, number>> = {};
  const tenderIds = new Set<string>();
  for (const bid of bidder.bids) {
    counts[bid.status] = (counts[bid.status] ?? 0) + 1;
    tenderIds.add(bid.tenderId);
  }
  return {
    id: bidder.id,
    legalName: bidder.legalName,
    tradeName: bidder.tradeName,
    pan: bidder.pan,
    gstin: bidder.gstin,
    cin: bidder.cin,
    udyamRegistrationNumber: bidder.udyamRegistrationNumber,
    panStatus: identifierPresence(bidder.pan),
    gstinStatus: identifierPresence(bidder.gstin),
    udyamStatus: identifierPresence(bidder.udyamRegistrationNumber),
    registeredAddress: bidder.registeredAddress,
    city: bidder.city,
    state: bidder.state,
    pincode: bidder.pincode,
    contactName: bidder.contactName,
    contactEmail: bidder.contactEmail,
    contactPhone: bidder.contactPhone,
    createdAt: iso(bidder.createdAt),
    updatedAt: iso(bidder.updatedAt),
    participation: { ...toBidSummary(counts), tenderCount: tenderIds.size },
    bids: bidder.bids.map((bid) => toBidListItem(bid)),
  };
}

export function toBidListItem(
  bid: BidSubmission & {
    tender?: Pick<Tender, 'id' | 'referenceNumber' | 'title'> | null;
    bidder?: Pick<Bidder, 'id' | 'legalName'> | null;
  },
): BidListItem {
  return {
    id: bid.id,
    submissionReference: bid.submissionReference,
    tenderId: bid.tenderId,
    tenderReference: bid.tender?.referenceNumber ?? '',
    tenderTitle: bid.tender?.title ?? '',
    bidderId: bid.bidderId,
    bidderLegalName: bid.bidder?.legalName ?? '',
    status: bid.status,
    submittedAt: bid.submittedAt ? iso(bid.submittedAt) : null,
    createdAt: iso(bid.createdAt),
    updatedAt: iso(bid.updatedAt),
  };
}

export function toBidDetail(
  bid: BidSubmission & {
    tender?: Pick<Tender, 'id' | 'referenceNumber' | 'title' | 'status' | 'category' | 'closingDate'> | null;
    bidder?: Pick<
      Bidder,
      'id' | 'legalName' | 'tradeName' | 'city' | 'state' | 'contactName' | 'contactEmail' | 'pan' | 'gstin'
    > | null;
  },
): BidDetail {
  const locked = bid.status !== 'draft';
  return {
    ...toBidListItem(bid),
    tenderCategory: bid.tender && 'category' in bid.tender ? bid.tender.category : null,
    tenderClosingDate: bid.tender && 'closingDate' in bid.tender ? iso(bid.tender.closingDate) : null,
    tenderStatus: bid.tender && 'status' in bid.tender ? bid.tender.status : null,
    bidderTradeName: bid.bidder && 'tradeName' in bid.bidder ? bid.bidder.tradeName : null,
    bidderCity: bid.bidder && 'city' in bid.bidder ? bid.bidder.city : null,
    bidderState: bid.bidder && 'state' in bid.bidder ? bid.bidder.state : null,
    bidderContactName: bid.bidder && 'contactName' in bid.bidder ? bid.bidder.contactName : null,
    bidderContactEmail: bid.bidder && 'contactEmail' in bid.bidder ? bid.bidder.contactEmail : null,
    bidderPan: bid.bidder && 'pan' in bid.bidder ? bid.bidder.pan : null,
    bidderGstin: bid.bidder && 'gstin' in bid.bidder ? bid.bidder.gstin : null,
    readiness: {
      readyToOpen: true,
      items: [
        { id: 'tender', label: 'Tender selected', passed: Boolean(bid.tenderId) },
        { id: 'bidder', label: 'Bidder selected', passed: Boolean(bid.bidderId) },
        { id: 'reference', label: 'Submission reference created', passed: Boolean(bid.submissionReference) },
        { id: 'metadata', label: 'Submission metadata complete', passed: Boolean(bid.status && bid.createdAt) },
      ],
    },
    fieldLocks: { all: locked },
    allowedActions: locked ? [] : [{ action: 'submit', label: 'Submit bid' }],
  };
}

export function toBidDocumentListItem(
  document: BidDocument & {
    requirement?: Pick<TenderRequirement, 'id' | 'name'> | null;
    uploadedBy?: { id: string; displayName: string } | null;
  },
): BidDocumentListItem {
  const documentType = document.documentType as BidDocumentTypeName;
  return {
    id: document.id,
    bidSubmissionId: document.bidSubmissionId,
    groupId: document.groupId,
    versionNumber: document.versionNumber,
    isCurrent: document.isCurrent,
    documentType,
    documentTypeLabel: BID_DOCUMENT_TYPE_LABELS[documentType] ?? documentType,
    category: BID_DOCUMENT_TYPE_CATEGORY[documentType] ?? 'other',
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    checksumShort: document.checksumSha256.slice(0, 8),
    status: document.status,
    extractionStatus: document.extractionStatus,
    tenderRequirementId: document.tenderRequirementId,
    requirementName: document.requirement?.name ?? null,
    linked: Boolean(document.tenderRequirementId),
    uploadedById: document.uploadedById,
    uploadedByName: document.uploadedBy?.displayName ?? null,
    createdAt: iso(document.createdAt),
    archivedAt: document.archivedAt ? iso(document.archivedAt) : null,
  };
}

export function toBidDocumentDetail(
  document: BidDocument & {
    requirement?: Pick<TenderRequirement, 'id' | 'name'> | null;
    uploadedBy?: { id: string; displayName: string } | null;
  },
  versions: BidDocument[] = [],
): BidDocumentDetail {
  return {
    ...toBidDocumentListItem(document),
    extractedText: document.extractedText,
    extractedAt: document.extractedAt ? iso(document.extractedAt) : null,
    extractionEngine: document.extractionEngine,
    extractionError: document.extractionError,
    extractionAdvisory: EXTRACTION_ADVISORY,
    versions: versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      status: version.status,
      createdAt: iso(version.createdAt),
      isCurrent: version.isCurrent,
    })),
  };
}

export function toVerificationListItem(
  row: BidVerification & {
    document?: { id: string; originalFilename: string; documentType: string } | null;
    requestedBy?: { id: string; displayName: string } | null;
  },
): VerificationListItem {
  const identifierType = row.identifierType as VerificationIdentifierTypeName;
  const documentType = row.document?.documentType as BidDocumentTypeName | undefined;
  return {
    id: row.id,
    bidSubmissionId: row.bidSubmissionId,
    bidderId: row.bidderId,
    documentId: row.documentId,
    documentFilename: row.document?.originalFilename ?? null,
    documentTypeLabel: documentType ? BID_DOCUMENT_TYPE_LABELS[documentType] ?? documentType : null,
    groupId: row.groupId,
    attemptNumber: row.attemptNumber,
    isLatest: row.isLatest,
    identifierType,
    identifierTypeLabel: VERIFICATION_IDENTIFIER_LABELS[identifierType] ?? identifierType,
    identifierValue: identifierType === 'pan' ? maskPan(row.identifierValue) ?? row.identifierValue : row.identifierValue,
    identifierOrigin: row.identifierOrigin,
    source: row.source,
    sourceDisplayName: row.sourceDisplayName,
    sourceMode: row.sourceMode,
    status: row.status,
    requestedAt: iso(row.requestedAt),
    completedAt: row.completedAt ? iso(row.completedAt) : null,
  };
}

export function toVerificationDetail(
  row: BidVerification & {
    document?: { id: string; originalFilename: string; documentType: string } | null;
    requestedBy?: { id: string; displayName: string } | null;
  },
  history: BidVerification[] = [],
): VerificationDetail {
  return {
    ...toVerificationListItem(row),
    explanation: row.explanation,
    fieldComparisons: row.fieldComparisons,
    sourceSnapshot: row.sourceSnapshot,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    advisory: DEMO_SOURCE_ADVISORY,
    requestedByName: row.requestedBy?.displayName ?? null,
    history: history.map((item) => ({
      id: item.id,
      attemptNumber: item.attemptNumber,
      status: item.status,
      requestedAt: iso(item.requestedAt),
      isLatest: item.isLatest,
    })),
  };
}
