import type { PrismaClient } from '@prisma/client';

import { NotificationRepository } from './notification.repository';
import { PermissionRepository } from './permission.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RoleRepository } from './role.repository';
import { UserRepository } from './user.repository';
import { DocumentRepository } from './document.repository';
import { FileRepository } from './file.repository';
import { AuditRepository } from './audit.repository';
import { BidDocumentRepository } from './bid-document.repository';
import { BidSubmissionRepository } from './bid-submission.repository';
import { BidVerificationRepository } from './bid-verification.repository';
import { BidCrossVerificationRepository } from './bid-cross-verification.repository';
import { BidReviewItemRepository } from './bid-review-item.repository';
import { TenderEvaluationRepository } from './tender-evaluation.repository';
import { BidderRepository } from './bidder.repository';
import { TenderRequirementRepository } from './tender-requirement.repository';
import { TenderRepository } from './tender.repository';
import type { DbClient } from './types';

export function createRepositories(db: DbClient) {
  return {
    users: new UserRepository(db),
    roles: new RoleRepository(db),
    permissions: new PermissionRepository(db),
    notifications: new NotificationRepository(db),
    refreshTokens: new RefreshTokenRepository(db),
    documents: new DocumentRepository(db),
    files: new FileRepository(db),
    audit: new AuditRepository(db),
    tenders: new TenderRepository(db),
    tenderRequirements: new TenderRequirementRepository(db),
    bidders: new BidderRepository(db),
    bids: new BidSubmissionRepository(db),
    bidDocuments: new BidDocumentRepository(db),
    bidVerifications: new BidVerificationRepository(db),
    bidCrossVerifications: new BidCrossVerificationRepository(db),
    bidReviewItems: new BidReviewItemRepository(db),
    tenderEvaluations: new TenderEvaluationRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export { NotificationRepository } from './notification.repository';
export { PermissionRepository } from './permission.repository';
export { RefreshTokenRepository } from './refresh-token.repository';
export { RoleRepository } from './role.repository';
export { UserRepository } from './user.repository';
export { DocumentRepository } from './document.repository';
export { FileRepository } from './file.repository';
export { AuditRepository } from './audit.repository';
export { TenderRepository } from './tender.repository';
export { TenderRequirementRepository } from './tender-requirement.repository';
export { BidderRepository } from './bidder.repository';
export { BidDocumentRepository } from './bid-document.repository';
export { BidVerificationRepository } from './bid-verification.repository';
export { BidCrossVerificationRepository } from './bid-cross-verification.repository';
export { BidReviewItemRepository } from './bid-review-item.repository';
export { TenderEvaluationRepository } from './tender-evaluation.repository';
export { BidSubmissionRepository } from './bid-submission.repository';
export type { UserWithRoles } from './types';
export {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseFilters,
  parsePagination,
  parseSort,
  toPaginatedResult,
  toPrismaOrderBy,
  toPrismaWhere,
} from './query';
export type { PaginatedResult, PaginationInput, FilterRule } from './query';
export type { PublicUser } from './types';
export type { PrismaClient };
