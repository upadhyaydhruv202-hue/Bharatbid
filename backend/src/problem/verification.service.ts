import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import type { AuditService } from '../audit/audit.service';
import { notifyProcurement } from './operations/notify';
import type { NotificationService } from '../notifications';
import { AUDIT_ACTIONS } from '../constants';
import { NotFoundError, ValidationError } from '../errors';
import { isValidVerificationIdentifier, normalizeIdentifier } from './identifiers';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidDocumentRepository } from '../repositories/bid-document.repository';
import type { BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { BidVerificationRepository } from '../repositories/bid-verification.repository';
import type { BidderRepository } from '../repositories/bidder.repository';
import type { PaginatedResult } from '../repositories/query';
import type { CreateVerificationBody, VerificationListQuery } from './schemas';
import {
  activityTitle,
  toVerificationDetail,
  toVerificationListItem,
  type TenderActivityItem,
  type VerificationDetail,
  type VerificationListItem,
  type VerificationSourceView,
  type VerificationSummary,
} from './serialize';
import { compareClaimsToSource, notFoundExplanation } from './verification/compare';
import { extractClaimsFromText } from './verification/extract';
import { VerificationAdapterRegistry } from './verification/registry';
import {
  DEMO_SOURCE_ADVISORY,
  ERROR_DISCLAIMER,
  SOURCE_SUPPORTED_IDENTIFIERS,
  VERIFICATION_SOURCE_LABELS,
  type FieldComparison,
  type NormalizedSourceRecord,
  type VerificationIdentifierOriginName,
  type VerificationIdentifierTypeName,
  type VerificationSourceName,
  type VerificationStatusName,
} from './verification/types';
import { BHARATBID_AUDIT_RESOURCES } from './types';

const IDEMPOTENCY_WINDOW_MS = 5_000;

export class BidVerificationService {
  constructor(
    private readonly verifications: BidVerificationRepository,
    private readonly bids: BidSubmissionRepository,
    private readonly bidders: BidderRepository,
    private readonly documents: BidDocumentRepository,
    private readonly registry: VerificationAdapterRegistry,
    private readonly audit?: AuditService | null,
    private readonly auditEvents?: AuditRepository | null,
    private readonly notifications?: NotificationService | null,
  ) {}

  listSources(): VerificationSourceView[] {
    return this.registry.list().map((adapter) => ({
      source: adapter.source,
      displayName: adapter.displayName,
      mode: adapter.mode,
      availability: adapter.availability(),
      supportedIdentifierTypes: [...adapter.supportedIdentifierTypes],
      advisory: DEMO_SOURCE_ADVISORY,
    }));
  }

  async list(
    bidId: string,
    query: VerificationListQuery,
  ): Promise<{
    items: VerificationListItem[];
    meta: PaginatedResult<VerificationListItem>['meta'];
    summary: VerificationSummary;
    sources: VerificationSourceView[];
  }> {
    await this.requireBid(bidId);
    const [result, summary] = await Promise.all([
      this.verifications.list(bidId, query),
      this.verifications.summarize(bidId),
    ]);
    return {
      items: result.items.map(toVerificationListItem),
      meta: result.meta,
      summary,
      sources: this.listSources(),
    };
  }

  async get(bidId: string, id: string): Promise<VerificationDetail> {
    const row = await this.requireVerification(bidId, id);
    const history = await this.verifications.listByGroup(row.groupId);
    return toVerificationDetail(row, history);
  }

  async request(bidId: string, input: CreateVerificationBody, actorId?: string): Promise<VerificationDetail> {
    const prepared = await this.prepare(bidId, input);
    const recent = await this.verifications.findLatestSame({
      bidSubmissionId: bidId,
      source: prepared.source,
      identifierType: prepared.identifierType,
      identifierValue: prepared.identifier,
    });
    if (
      recent &&
      recent.documentId === (prepared.documentId ?? null) &&
      Date.now() - recent.requestedAt.getTime() < IDEMPOTENCY_WINDOW_MS
    ) {
      return this.get(bidId, recent.id);
    }
    return this.execute(bidId, prepared, actorId, false);
  }

  async retry(bidId: string, id: string, actorId?: string): Promise<VerificationDetail> {
    const existing = await this.requireVerification(bidId, id);
    if (existing.status !== 'error') {
      throw new ValidationError('Only a failed verification can be retried', [
        { path: 'id', message: 'Retry is available when the source lookup failed', code: 'custom' },
      ]);
    }
    return this.execute(
      bidId,
      {
        source: existing.source,
        identifierType: existing.identifierType,
        identifier: existing.identifierValue,
        identifierOrigin: existing.identifierOrigin,
        documentId: existing.documentId,
        legalName: null,
        legalNameOrigin: 'bidder_profile',
        state: null,
        stateOrigin: 'bidder_profile',
        reuseClaimsFromBid: true,
      },
      actorId,
      true,
    );
  }

  async listActivity(bidId: string, id: string): Promise<TenderActivityItem[]> {
    await this.requireVerification(bidId, id);
    if (!this.auditEvents) {
      return [];
    }
    const events = await this.auditEvents.listByResourceId(bidId, 80);
    return events
      .filter((event) => {
        const meta = event.metadata ?? event.request;
        return Boolean(meta && typeof meta === 'object' && (meta as { verificationId?: string }).verificationId === id);
      })
      .map((event) => ({
        id: event.id,
        action: event.action,
        title: activityTitle(event.action, event.metadata ?? event.request),
        actorName: event.actorName,
        timestamp: event.createdAt.toISOString(),
      }));
  }

  async summarize(bidId: string): Promise<VerificationSummary> {
    await this.requireBid(bidId);
    return this.verifications.summarize(bidId);
  }

  private async execute(
    bidId: string,
    prepared: PreparedVerification,
    actorId: string | undefined,
    isRetry: boolean,
  ): Promise<VerificationDetail> {
    const bid = await this.requireBid(bidId);
    const claims = prepared.reuseClaimsFromBid
      ? await this.claimsFromBid(bid.bidderId, prepared)
      : prepared;
    const latest = await this.verifications.findLatestSame({
      bidSubmissionId: bidId,
      source: prepared.source,
      identifierType: prepared.identifierType,
      identifierValue: prepared.identifier,
    });
    const groupId = latest?.groupId ?? randomUUID();
    const attemptNumber = (latest?.attemptNumber ?? 0) + 1;
    if (latest) {
      await this.verifications.markGroupNotLatest(groupId);
    }

    await this.audit?.record({
      actorId,
      action: isRetry ? AUDIT_ACTIONS.VERIFICATION_RETRIED : AUDIT_ACTIONS.VERIFICATION_REQUESTED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: {
        source: prepared.source,
        sourceMode: 'demo',
        identifierType: prepared.identifierType,
        documentId: prepared.documentId,
        retry: isRetry,
      },
      status: 'succeeded',
    });

    const adapter = this.registry.require(prepared.source);
    const lookup = await adapter.lookup({
      identifierType: prepared.identifierType,
      identifier: prepared.identifier,
    });

    let status: Extract<VerificationStatusName, 'matched' | 'mismatched' | 'not_found' | 'error'> = 'error';
    let fields: FieldComparison[] = [];
    let snapshot: NormalizedSourceRecord | { recordFound: false; source: string; sourceMode: 'demo'; sourceDisplayName: string; identifier: string; retrievedAt: string } | null =
      null;
    let explanation = ERROR_DISCLAIMER;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    if (!lookup.ok && lookup.code === 'RECORD_NOT_FOUND') {
      status = 'not_found';
      explanation = notFoundExplanation(adapter.displayName);
      snapshot = {
        recordFound: false,
        source: adapter.source,
        sourceMode: 'demo',
        sourceDisplayName: adapter.displayName,
        identifier: prepared.identifier,
        retrievedAt: new Date().toISOString(),
      };
    } else if (!lookup.ok) {
      status = 'error';
      errorCode = lookup.code;
      errorMessage = lookup.message;
      explanation = `${ERROR_DISCLAIMER}\n\nSource: ${adapter.displayName}\nMode: DEMO / SIMULATED\n${DEMO_SOURCE_ADVISORY}`;
    } else {
      const compared = compareClaimsToSource(
        {
          identifier: prepared.identifier,
          legalName: claims.legalName,
          legalNameOrigin: claims.legalNameOrigin,
          state: claims.state,
          stateOrigin: claims.stateOrigin,
        },
        lookup.record,
      );
      status = compared.status;
      fields = compared.fields;
      snapshot = lookup.record;
      explanation = compared.explanation;
    }

    const created = await this.verifications.create({
      id: randomUUID(),
      bidSubmissionId: bidId,
      bidderId: bid.bidderId,
      documentId: prepared.documentId,
      groupId,
      attemptNumber,
      isLatest: true,
      identifierType: prepared.identifierType,
      identifierValue: prepared.identifier,
      identifierOrigin: prepared.identifierOrigin,
      source: prepared.source,
      sourceMode: 'demo',
      sourceDisplayName: adapter.displayName,
      status,
      explanation,
      fieldComparisons: fields as unknown as Prisma.InputJsonValue,
      sourceSnapshot: snapshot ? (snapshot as unknown as Prisma.InputJsonValue) : null,
      errorCode,
      errorMessage,
      requestedAt: new Date(),
      completedAt: new Date(),
      requestedById: actorId ?? null,
    });

    await this.audit?.record({
      actorId,
      action: auditActionForStatus(status),
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: {
        verificationId: created.id,
        source: prepared.source,
        sourceMode: 'demo',
        identifierType: prepared.identifierType,
        documentId: prepared.documentId,
        status,
      },
      status: status === 'error' ? 'failed' : 'succeeded',
    });

    if (status === 'mismatched' || status === 'not_found' || status === 'error') {
      await notifyProcurement(this.notifications, {
        userId: actorId,
        type: 'warning',
        title: 'Verification issue detected',
        body: `${adapter.displayName} returned ${status.replace(/_/g, ' ')} (DEMO SOURCE).`,
        href: `/bharatbid/bids/${bidId}/verification`,
        entityType: 'verification',
        entityId: created.id,
      });
    }

    return this.get(bidId, created.id);
  }

  private async prepare(bidId: string, input: CreateVerificationBody): Promise<PreparedVerification> {
    const bid = await this.requireBid(bidId);
    const source = input.source as VerificationSourceName;
    const identifierType = input.identifierType as VerificationIdentifierTypeName;
    if (!SOURCE_SUPPORTED_IDENTIFIERS[source].includes(identifierType)) {
      throw new ValidationError('This source does not support the selected identifier type', [
        {
          path: 'identifierType',
          message: `${VERIFICATION_SOURCE_LABELS[source]} cannot look up ${identifierType.toUpperCase()}`,
          code: 'custom',
        },
      ]);
    }

    const documentId: string | null = input.documentId ?? null;
    let extracted = extractClaimsFromText(null);
    if (documentId) {
      const document = await this.documents.findById(documentId);
      if (!document || document.bidSubmissionId !== bidId) {
        throw new NotFoundError('Document not found');
      }
      extracted = extractClaimsFromText(document.extractedText);
    }

    const bidder = await this.bidders.findById(bid.bidderId);
    const extractedIdentifier = identifierFromClaims(extracted, identifierType);
    const provided = normalizeIdentifier(input.identifier ?? null);
    const bidderIdentifier = identifierFromBidder(bidder, identifierType);
    const identifier = provided ?? extractedIdentifier ?? bidderIdentifier;
    const identifierOrigin: VerificationIdentifierOriginName = provided
      ? 'manual'
      : extractedIdentifier
        ? 'extracted'
        : 'bidder_profile';
    if (!identifier) {
      throw new ValidationError('An identifier is required to run verification', [
        {
          path: 'identifier',
          message: 'Extraction did not produce a usable identifier. Enter one manually.',
          code: 'custom',
        },
      ]);
    }
    assertIdentifier(identifierType, identifier);

    const legalName = extracted.legalName ?? bidder?.legalName ?? null;
    const legalNameOrigin = extracted.legalName ? 'extracted' : 'bidder_profile';
    const state = extracted.state ?? bidder?.state ?? null;
    const stateOrigin = extracted.state ? 'extracted' : 'bidder_profile';

    return {
      source,
      identifierType,
      identifier,
      identifierOrigin,
      documentId,
      legalName,
      legalNameOrigin,
      state,
      stateOrigin,
      reuseClaimsFromBid: false,
    };
  }

  private async claimsFromBid(bidderId: string, prepared: PreparedVerification): Promise<PreparedVerification> {
    const bidder = await this.bidders.findById(bidderId);
    let extracted = extractClaimsFromText(null);
    if (prepared.documentId) {
      const document = await this.documents.findById(prepared.documentId);
      extracted = extractClaimsFromText(document?.extractedText);
    }
    return {
      ...prepared,
      legalName: extracted.legalName ?? bidder?.legalName ?? null,
      legalNameOrigin: extracted.legalName ? 'extracted' : 'bidder_profile',
      state: extracted.state ?? bidder?.state ?? null,
      stateOrigin: extracted.state ? 'extracted' : 'bidder_profile',
    };
  }

  private async requireBid(bidId: string) {
    const bid = await this.bids.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    return bid;
  }

  private async requireVerification(bidId: string, id: string) {
    await this.requireBid(bidId);
    const row = await this.verifications.findById(id);
    if (!row || row.bidSubmissionId !== bidId) {
      throw new NotFoundError('Verification not found');
    }
    return row;
  }
}

interface PreparedVerification {
  source: VerificationSourceName;
  identifierType: VerificationIdentifierTypeName;
  identifier: string;
  identifierOrigin: VerificationIdentifierOriginName;
  documentId: string | null;
  legalName: string | null;
  legalNameOrigin: FieldComparison['claimedOrigin'];
  state: string | null;
  stateOrigin: FieldComparison['claimedOrigin'];
  reuseClaimsFromBid: boolean;
}

function identifierFromClaims(
  claims: ReturnType<typeof extractClaimsFromText>,
  type: VerificationIdentifierTypeName,
): string | null {
  if (type === 'gstin') return claims.gstin;
  if (type === 'cin') return claims.cin;
  if (type === 'udyam') return claims.udyam;
  if (type === 'pan') return claims.pan;
  if (type === 'epfo') return claims.epfo;
  if (type === 'esic') return claims.esic;
  if (type === 'nsic') return claims.nsic;
  if (type === 'dpiit') return claims.dpiit;
  if (type === 'gem_seller') return claims.gemSeller;
  if (type === 'bis') return claims.bis;
  return null;
}

function identifierFromBidder(
  bidder: { gstin: string | null; cin: string | null; udyamRegistrationNumber: string | null; pan: string | null } | null,
  type: VerificationIdentifierTypeName,
): string | null {
  if (!bidder) return null;
  if (type === 'gstin') return normalizeIdentifier(bidder.gstin);
  if (type === 'cin') return normalizeIdentifier(bidder.cin);
  if (type === 'udyam') return normalizeIdentifier(bidder.udyamRegistrationNumber);
  if (type === 'pan') return normalizeIdentifier(bidder.pan);
  return null;
}

function assertIdentifier(type: VerificationIdentifierTypeName, value: string): void {
  if (!isValidVerificationIdentifier(type, value)) {
    throw new ValidationError('Identifier is not in the expected format', [
      { path: 'identifier', message: `Enter a valid ${type.toUpperCase()}`, code: 'custom' },
    ]);
  }
}

function auditActionForStatus(status: string): string {
  if (status === 'matched') return AUDIT_ACTIONS.VERIFICATION_COMPLETED;
  if (status === 'mismatched') return AUDIT_ACTIONS.VERIFICATION_MISMATCHED;
  if (status === 'not_found') return AUDIT_ACTIONS.VERIFICATION_NOT_FOUND;
  return AUDIT_ACTIONS.VERIFICATION_FAILED;
}
