import { randomUUID } from 'node:crypto';

import type { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, DOCUMENT } from '../constants';
import { ConflictError, ExternalServiceError, NotFoundError, ValidationError } from '../errors';
import { extractDocumentText, validateDocumentFile } from '../integrations/documents/document.files';
import type { StorageService } from '../integrations/storage/storage.service';
import { assertStorageKey } from '../integrations/storage/storage.keys';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidDocumentRepository } from '../repositories/bid-document.repository';
import type { BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { PaginatedResult } from '../repositories/query';
import type { TenderRequirementRepository } from '../repositories/tender-requirement.repository';
import type { BidDocumentListQuery, CreateBidDocumentBody } from './schemas';
import {
  activityTitle,
  toBidDocumentDetail,
  toBidDocumentListItem,
  type BidDocumentDetail,
  type BidDocumentListItem,
  type BidDocumentSummary,
  type TenderActivityItem,
} from './serialize';
import { BHARATBID_AUDIT_RESOURCES } from './types';

const DUPLICATE_FILE_MESSAGE = 'An identical file already exists for this submission.';
const EXTRACTION_ENGINE = 'bharatbid-text-extract';
const IMAGE_EXTRACTION_ERROR =
  'Text extraction is not available for this file. The original document is still available.';

export class BidDocumentService {
  constructor(
    private readonly documents: BidDocumentRepository,
    private readonly bids: BidSubmissionRepository,
    private readonly requirements: TenderRequirementRepository,
    private readonly storage: StorageService | null,
    private readonly audit?: AuditService | null,
    private readonly auditEvents?: AuditRepository | null,
    private readonly maxBytes: number = DOCUMENT.MAX_BYTES,
  ) {}

  async list(
    bidId: string,
    query: BidDocumentListQuery,
  ): Promise<{
    items: BidDocumentListItem[];
    meta: PaginatedResult<BidDocumentListItem>['meta'];
    summary: BidDocumentSummary;
    requirements: Array<{ id: string; name: string }>;
  }> {
    const bid = await this.requireBid(bidId);
    const [result, summary, requirements] = await Promise.all([
      this.documents.list(bidId, query),
      this.documents.summarize(bidId),
      this.requirements.listByTender(bid.tenderId),
    ]);
    return {
      items: result.items.map(toBidDocumentListItem),
      meta: result.meta,
      summary,
      requirements: requirements.map((item) => ({ id: item.id, name: item.name })),
    };
  }

  async get(bidId: string, id: string): Promise<BidDocumentDetail> {
    const document = await this.requireDocument(bidId, id);
    const versions = await this.documents.listByGroup(document.groupId);
    return toBidDocumentDetail(document, versions);
  }

  async upload(
    bidId: string,
    input: CreateBidDocumentBody & {
      file: { originalname: string; mimetype: string; size: number; buffer: Buffer; fieldname?: string };
    },
    actorId?: string,
  ): Promise<BidDocumentDetail> {
    const bid = await this.requireBid(bidId);
    if (input.file.size > this.maxBytes) {
      throw new ValidationError(`Uploaded file is too large. Maximum size is ${this.maxBytes} bytes`, [
        { path: 'file.size', message: `File exceeds the maximum allowed size of ${this.maxBytes} bytes`, code: 'too_big' },
      ]);
    }
    const file = validateDocumentFile(input.file, { maxBytes: this.maxBytes });
    const duplicate = await this.documents.findCurrentByChecksum(bidId, file.checksumSha256);
    if (duplicate) {
      throw new ConflictError(DUPLICATE_FILE_MESSAGE, { existingDocumentId: duplicate.id });
    }
    const requirementId = await this.resolveRequirement(bid.tenderId, input.tenderRequirementId);
    const id = randomUUID();
    const groupId = randomUUID();
    const storageKey = assertStorageKey(`bids/${bidId}/documents/${id}/v1`);
    try {
      await this.store().put({ key: storageKey, body: file.buffer, contentType: file.mimeType });
    } catch {
      throw new ExternalServiceError('Document storage failed', { provider: 'storage' });
    }

    try {
      const created = await this.documents.create({
        id,
        bidSubmissionId: bidId,
        tenderRequirementId: requirementId,
        groupId,
        versionNumber: 1,
        isCurrent: true,
        documentType: input.documentType,
        originalFilename: file.originalFilename,
        storedFilename: file.storedFilename,
        mimeType: file.mimeType,
        extension: file.extension,
        sizeBytes: file.size,
        storageKey,
        checksumSha256: file.checksumSha256,
        status: 'ready',
        extractionStatus: 'not_started',
        uploadedById: actorId ?? null,
      });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: bidId,
        metadata: {
          documentId: created.id,
          originalFilename: created.originalFilename,
          documentType: created.documentType,
          versionNumber: 1,
        },
        status: 'succeeded',
      });
      await this.extract(created.id, bidId, actorId);
      return this.get(bidId, created.id);
    } catch (error) {
      await this.store().delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async replaceVersion(
    bidId: string,
    id: string,
    input: {
      file: { originalname: string; mimetype: string; size: number; buffer: Buffer; fieldname?: string };
      documentType?: CreateBidDocumentBody['documentType'];
    },
    actorId?: string,
  ): Promise<BidDocumentDetail> {
    const existing = await this.requireDocument(bidId, id);
    if (!existing.isCurrent) {
      throw new ValidationError('Only the current document version can be replaced', [
        { path: 'id', message: 'Replace the latest version', code: 'custom' },
      ]);
    }
    if (input.file.size > this.maxBytes) {
      throw new ValidationError(`Uploaded file is too large. Maximum size is ${this.maxBytes} bytes`, [
        { path: 'file.size', message: `File exceeds the maximum allowed size of ${this.maxBytes} bytes`, code: 'too_big' },
      ]);
    }
    const file = validateDocumentFile(input.file, { maxBytes: this.maxBytes });
    const duplicate = await this.documents.findCurrentByChecksum(bidId, file.checksumSha256);
    if (duplicate && duplicate.groupId !== existing.groupId) {
      throw new ConflictError(DUPLICATE_FILE_MESSAGE, { existingDocumentId: duplicate.id });
    }
    const nextId = randomUUID();
    const nextVersion = existing.versionNumber + 1;
    const storageKey = assertStorageKey(`bids/${bidId}/documents/${nextId}/v${nextVersion}`);
    try {
      await this.store().put({ key: storageKey, body: file.buffer, contentType: file.mimeType });
    } catch {
      throw new ExternalServiceError('Document storage failed', { provider: 'storage' });
    }

    try {
      const created = await this.documents.replaceCurrent({
        previousId: existing.id,
        next: {
          id: nextId,
          bidSubmissionId: bidId,
          tenderRequirementId: existing.tenderRequirementId,
          groupId: existing.groupId,
          versionNumber: nextVersion,
          isCurrent: true,
          documentType: input.documentType ?? existing.documentType,
          originalFilename: file.originalFilename,
          storedFilename: file.storedFilename,
          mimeType: file.mimeType,
          extension: file.extension,
          sizeBytes: file.size,
          storageKey,
          checksumSha256: file.checksumSha256,
          status: 'ready',
          extractionStatus: 'not_started',
          uploadedById: actorId ?? null,
        },
      });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.DOCUMENT_VERSION_CREATED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: bidId,
        metadata: {
          documentId: created.id,
          originalFilename: created.originalFilename,
          versionNumber: created.versionNumber,
          previousDocumentId: existing.id,
        },
        status: 'succeeded',
      });
      await this.extract(created.id, bidId, actorId);
      return this.get(bidId, created.id);
    } catch (error) {
      await this.store().delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async linkRequirement(bidId: string, id: string, tenderRequirementId: string | null, actorId?: string) {
    const document = await this.requireDocument(bidId, id);
    const bid = await this.requireBid(bidId);
    const requirementId = await this.resolveRequirement(bid.tenderId, tenderRequirementId);
    const updated = await this.documents.update(document.id, { tenderRequirementId: requirementId });
    const requirementName = updated.requirement?.name ?? null;
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.DOCUMENT_REQUIREMENT_LINKED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: {
        documentId: document.id,
        originalFilename: document.originalFilename,
        requirementName,
        unmapped: requirementId === null,
      },
      status: 'succeeded',
    });
    return this.get(bidId, id);
  }

  async archive(bidId: string, id: string, actorId?: string) {
    const document = await this.requireDocument(bidId, id);
    if (document.status === 'archived') {
      return this.get(bidId, id);
    }
    await this.documents.update(document.id, { status: 'archived', archivedAt: new Date() });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.DOCUMENT_ARCHIVED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: { documentId: document.id, originalFilename: document.originalFilename },
      status: 'succeeded',
    });
    return this.get(bidId, id);
  }

  async download(
    bidId: string,
    id: string,
    disposition: 'inline' | 'attachment' = 'attachment',
    actorId?: string,
  ): Promise<{ body: Buffer; mimeType: string; filename: string; disposition: string }> {
    const document = await this.requireDocument(bidId, id);
    const body = await this.store().get(document.storageKey);
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: { documentId: document.id, originalFilename: document.originalFilename, disposition },
      status: 'succeeded',
    });
    const ascii = document.originalFilename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    return {
      body,
      mimeType: document.mimeType,
      filename: document.originalFilename,
      disposition: `${disposition}; filename="${ascii}"`,
    };
  }

  async listActivity(bidId: string, id: string): Promise<TenderActivityItem[]> {
    await this.requireDocument(bidId, id);
    if (!this.auditEvents) {
      return [];
    }
    const events = await this.auditEvents.listByResourceId(bidId, 80);
    return events
      .filter((event) => {
        const meta = event.metadata ?? event.request;
        return Boolean(meta && typeof meta === 'object' && (meta as { documentId?: string }).documentId === id);
      })
      .map((event) => ({
        id: event.id,
        action: event.action,
        title: activityTitle(event.action, event.metadata ?? event.request),
        actorName: event.actorName,
        timestamp: event.createdAt.toISOString(),
      }));
  }

  async summarize(bidId: string): Promise<BidDocumentSummary> {
    await this.requireBid(bidId);
    return this.documents.summarize(bidId);
  }

  private async extract(documentId: string, bidId: string, actorId?: string): Promise<void> {
    const document = await this.documents.findById(documentId);
    if (!document) {
      return;
    }
    await this.documents.update(documentId, { extractionStatus: 'processing' });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.DOCUMENT_EXTRACTION_STARTED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: { documentId, originalFilename: document.originalFilename },
      status: 'succeeded',
    });
    try {
      const buffer = await this.store().get(document.storageKey);
      const extracted = extractDocumentText({
        buffer,
        extension: document.extension as 'pdf' | 'png' | 'jpg' | 'jpeg' | 'txt',
        mimeType: document.mimeType,
        originalFilename: document.originalFilename,
      });
      const usable = extracted.text.trim().length > 0 && !extracted.multimodal;
      if (!usable) {
        await this.documents.update(documentId, {
          extractionStatus: 'failed',
          extractionError: IMAGE_EXTRACTION_ERROR,
          extractedText: null,
          extractedAt: new Date(),
          extractionEngine: EXTRACTION_ENGINE,
        });
        await this.audit?.record({
          actorId,
          action: AUDIT_ACTIONS.DOCUMENT_EXTRACTION_FAILED,
          resource: BHARATBID_AUDIT_RESOURCES.BID,
          resourceId: bidId,
          metadata: { documentId, originalFilename: document.originalFilename },
          status: 'failed',
        });
        return;
      }
      await this.documents.update(documentId, {
        extractionStatus: 'completed',
        extractedText: extracted.text,
        extractedAt: new Date(),
        extractionEngine: EXTRACTION_ENGINE,
        extractionError: null,
      });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.DOCUMENT_EXTRACTION_COMPLETED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: bidId,
        metadata: { documentId, originalFilename: document.originalFilename, truncated: extracted.truncated },
        status: 'succeeded',
      });
    } catch {
      await this.documents.update(documentId, {
        extractionStatus: 'failed',
        extractionError: IMAGE_EXTRACTION_ERROR,
        extractedAt: new Date(),
        extractionEngine: EXTRACTION_ENGINE,
      });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.DOCUMENT_EXTRACTION_FAILED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: bidId,
        metadata: { documentId, originalFilename: document.originalFilename },
        status: 'failed',
      });
    }
  }

  private async requireBid(bidId: string) {
    const bid = await this.bids.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    return bid;
  }

  private async requireDocument(bidId: string, id: string) {
    await this.requireBid(bidId);
    const document = await this.documents.findById(id);
    if (!document || document.bidSubmissionId !== bidId) {
      throw new NotFoundError('Document not found');
    }
    return document;
  }

  private async resolveRequirement(tenderId: string, requirementId: string | null | undefined) {
    if (!requirementId) {
      return null;
    }
    const items = await this.requirements.listByTender(tenderId);
    const match = items.find((item) => item.id === requirementId);
    if (!match) {
      throw new ValidationError('Requirement does not belong to this tender', [
        { path: 'tenderRequirementId', message: 'Select a requirement from this tender or leave unmapped', code: 'custom' },
      ]);
    }
    return match.id;
  }

  private store(): StorageService {
    if (!this.storage) {
      throw new ExternalServiceError('Storage is not configured', { provider: 'storage' });
    }
    return this.storage;
  }
}
