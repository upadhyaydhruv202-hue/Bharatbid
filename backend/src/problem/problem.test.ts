import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors';
import { maskPan, normalizeIdentifier, isValidGstin, isValidPan, isValidUdyam, identifierPresence, isProfileComplete } from './identifiers';
import { bidderListQuerySchema, bidDocumentListQuerySchema, bidListQuerySchema, createBidDocumentBodySchema, createBidderBodySchema, createCrossVerificationBodySchema, createEvaluationBodySchema, createEvaluationDecisionBodySchema, createEvaluationNoteBodySchema, createReviewAssessmentBodySchema, createReviewClarificationBodySchema, createTenderBodySchema, createVerificationBodySchema, attentionListQuerySchema, evaluationListQuerySchema, reviewListQuerySchema, tenderListQuerySchema } from './schemas';
import { activityTitle, toBidDocumentListItem, toTenderReadiness } from './serialize';
import { assertBidStatusTransition, assertTenderStatusTransition, canAcceptBids, TENDER_STATUS_ACTIONS } from './transitions';
import { normalizeTenderCategory } from './types';

describe('BharatBid identifiers', () => {
  it('normalizes and validates PAN and GSTIN', () => {
    expect(normalizeIdentifier(' aaapb1234c ')).toBe('AAAPB1234C');
    expect(isValidPan('AAAPB1234C')).toBe(true);
    expect(isValidPan('AAAPB1234')).toBe(false);
    expect(isValidGstin('33AAAPB1234C1Z5')).toBe(true);
    expect(isValidUdyam('UDYAM-TN-02-0001001')).toBe(true);
    expect(maskPan('AAAPB1234C')).toBe('AAAPB****C');
    expect(maskPan('ABCDE1234F')).toBe('ABCDE****F');
  });

  it('reports identifier presence without implying verification', () => {
    expect(identifierPresence('AAAPB1234C')).toBe('provided');
    expect(identifierPresence(null)).toBe('not_provided');
    expect(isProfileComplete({ pan: 'AAAPB1234C', gstin: '33AAAPB1234C1Z5', city: 'Chennai', state: 'Tamil Nadu', contactEmail: 'a@example.com' })).toBe(true);
    expect(isProfileComplete({ pan: 'AAAPB1234C', gstin: null, city: 'Chennai', state: 'Tamil Nadu', contactEmail: 'a@example.com' })).toBe(false);
  });
});

describe('BharatBid status transitions', () => {
  it('allows opening a draft tender and rejects awarded to open', () => {
    expect(() => assertTenderStatusTransition('draft', 'open')).not.toThrow();
    expect(canAcceptBids('open')).toBe(true);
    expect(canAcceptBids('draft')).toBe(false);
    expect(() => assertTenderStatusTransition('awarded', 'open')).toThrow(ValidationError);
  });

  it('allows submitting a draft bid and rejects finalized to draft', () => {
    expect(() => assertBidStatusTransition('draft', 'submitted')).not.toThrow();
    expect(() => assertBidStatusTransition('finalized', 'draft')).toThrow(ValidationError);
  });

  it('rejects closed to cancelled and awarded to open', () => {
    expect(() => assertTenderStatusTransition('closed', 'cancelled')).toThrow(ValidationError);
    expect(() => assertTenderStatusTransition('under_evaluation', 'awarded')).toThrow(ValidationError);
    expect(TENDER_STATUS_ACTIONS.open.map((item) => item.to)).toEqual(['under_evaluation', 'cancelled']);
  });
});

describe('BharatBid input schemas', () => {
  it('rejects a closing date earlier than the issue date', () => {
    const result = createTenderBodySchema.safeParse({
      referenceNumber: 'GEM/2026/B/TEST/009',
      title: 'Date check tender',
      organizationName: 'Chennai Petroleum Corporation Limited',
      departmentName: 'Contracts and Procurement',
      category: 'Goods',
      issueDate: '2026-09-20',
      closingDate: '2026-09-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid PAN while accepting a well-formed PAN', () => {
    expect(createBidderBodySchema.safeParse({ legalName: 'Valid Bidder', pan: 'NOTAPAN' }).success).toBe(false);
    const valid = createBidderBodySchema.safeParse({ legalName: 'Valid Bidder', pan: 'aaapb1234c' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.pan).toBe('AAAPB1234C');
    }
  });

  it('normalizes tender categories and rejects unknown values', () => {
    expect(normalizeTenderCategory('GOODS')).toBe('Goods');
    const parsed = createTenderBodySchema.safeParse({
      referenceNumber: 'GEM/2026/B/TEST/010',
      title: 'Category check',
      category: 'services',
      issueDate: '2026-07-01',
      closingDate: '2026-08-01',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.category).toBe('Services');
    }
    expect(createTenderBodySchema.safeParse({
      referenceNumber: 'GEM/2026/B/TEST/011',
      title: 'Bad category',
      category: 'Weapons',
      issueDate: '2026-07-01',
      closingDate: '2026-08-01',
    }).success).toBe(false);
  });

  it('accepts search and sort aliases on the tender list query', () => {
    const parsed = tenderListQuerySchema.parse({
      search: 'valve',
      status: 'OPEN',
      category: 'IT',
      sort: 'closing_date',
      order: 'asc',
      page: '1',
      pageSize: '10',
    });
    expect(parsed.search).toBe('valve');
    expect(parsed.status).toBe('open');
    expect(parsed.category).toBe('IT');
    expect(parsed.sort).toBe('closing_date');
    expect(parsed.order).toBe('asc');
  });

  it('accepts bidder and bid list search aliases and filters', () => {
    const bidders = bidderListQuerySchema.parse({
      search: 'Bayfront',
      state: 'Tamil Nadu',
      city: 'Chennai',
      hasUdyam: 'true',
      completeness: 'complete',
      page: '1',
      pageSize: '10',
    });
    expect(bidders.search).toBe('Bayfront');
    expect(bidders.state).toBe('Tamil Nadu');
    expect(bidders.hasUdyam).toBe(true);
    expect(bidders.completeness).toBe('complete');

    const bids = bidListQuerySchema.parse({
      search: 'BID-GEM',
      status: 'UNDER_REVIEW',
      page: '1',
      pageSize: '10',
    });
    expect(bids.search).toBe('BID-GEM');
    expect(bids.status).toBe('under_review');
  });

  it('normalizes bid document types and unmapped requirements', () => {
    const parsed = createBidDocumentBodySchema.parse({
      documentType: 'GST_CERTIFICATE',
      tenderRequirementId: 'unmapped',
    });
    expect(parsed.documentType).toBe('gst_certificate');
    expect(parsed.tenderRequirementId).toBeNull();
  });

  it('accepts document list filters including unmapped and currentOnly', () => {
    const parsed = bidDocumentListQuerySchema.parse({
      category: 'Identity',
      sort: 'name',
      currentOnly: 'false',
      tenderRequirementId: 'unmapped',
      extractionStatus: 'COMPLETED',
    });
    expect(parsed.category).toBe('identity');
    expect(parsed.sort).toBe('name');
    expect(parsed.currentOnly).toBe(false);
    expect(parsed.tenderRequirementId).toBe('unmapped');
    expect(parsed.extractionStatus).toBe('completed');
  });

  it('accepts verification requests and rejects mismatched identifiers, URLs, and unknown sources', () => {
    const parsed = createVerificationBodySchema.parse({
      source: 'GST',
      identifierType: 'GSTIN',
      identifier: '33AAAPB1234C1Z5',
    });
    expect(parsed.source).toBe('gst');
    expect(parsed.identifierType).toBe('gstin');
    expect(createVerificationBodySchema.safeParse({
      source: 'pan',
      identifierType: 'pan',
      identifier: 'AAAPB1234C',
    }).success).toBe(true);
    expect(createVerificationBodySchema.safeParse({
      source: 'gst',
      identifierType: 'pan',
      identifier: 'AAAPB1234C',
    }).success).toBe(false);
    expect(createVerificationBodySchema.safeParse({
      source: 'gst',
      identifierType: 'gstin',
      identifier: '33AAAPB1234C1Z5',
      url: 'http://arbitrary.example',
    }).success).toBe(false);
    expect(createVerificationBodySchema.safeParse({
      source: 'http://arbitrary.example',
      identifierType: 'gstin',
      identifier: '33AAAPB1234C1Z5',
    }).success).toBe(false);
  });

  it('accepts empty or paired cross-verification bodies and rejects a single verification id', () => {
    const empty = createCrossVerificationBodySchema.parse({});
    expect(empty.leftVerificationId).toBeUndefined();
    expect(empty.rightVerificationId).toBeUndefined();
    expect(
      createCrossVerificationBodySchema.parse({
        comparisonType: 'GST-MCA',
      }).comparisonType,
    ).toBe('gst_mca');
    const paired = createCrossVerificationBodySchema.parse({
      leftVerificationId: '11111111-1111-4111-8111-111111111111',
      rightVerificationId: '22222222-2222-4222-8222-222222222222',
    });
    expect(paired.leftVerificationId).toBe('11111111-1111-4111-8111-111111111111');
    expect(
      createCrossVerificationBodySchema.safeParse({
        leftVerificationId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false);
    expect(
      createCrossVerificationBodySchema.safeParse({
        comparisonType: 'gst_mca',
        url: 'http://arbitrary.example',
      }).success,
    ).toBe(false);
  });
});

describe('Bid document presentation', () => {
  it('never exposes storage keys and does not use verification language', () => {
    const item = toBidDocumentListItem({
      id: '11111111-1111-4111-8111-111111111111',
      bidSubmissionId: '22222222-2222-4222-8222-222222222222',
      tenderRequirementId: null,
      groupId: '33333333-3333-4333-8333-333333333333',
      versionNumber: 1,
      isCurrent: true,
      documentType: 'gst_certificate',
      originalFilename: 'DEMO_GST.txt',
      storedFilename: 'DEMO_GST.txt',
      mimeType: 'text/plain',
      extension: 'txt',
      sizeBytes: 24,
      storageKey: 'bids/22222222-2222-4222-8222-222222222222/documents/11111111-1111-4111-8111-111111111111/v1',
      checksumSha256: 'abcdef1234567890aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      status: 'ready',
      extractionStatus: 'completed',
      extractedText: 'secret extracted body',
      extractedAt: new Date('2026-08-12T11:00:00.000Z'),
      extractionEngine: 'bharatbid-text-extract',
      extractionError: null,
      uploadedById: null,
      archivedAt: null,
      createdAt: new Date('2026-08-12T11:00:00.000Z'),
      updatedAt: new Date('2026-08-12T11:00:00.000Z'),
      requirement: null,
      uploadedBy: null,
    });
    expect(item.checksumShort).toBe('abcdef12');
    expect(item).not.toHaveProperty('storageKey');
    expect(item).not.toHaveProperty('extractedText');
    expect(JSON.stringify(item)).not.toContain('bids/');
    expect(activityTitle('document.uploaded', { originalFilename: 'DEMO_GST.txt' })).toContain('DEMO_GST.txt');
    expect(activityTitle('document.uploaded', { originalFilename: 'DEMO_GST.txt' }).toLowerCase()).not.toMatch(
      /verif|compliant|authentic/,
    );
    expect(activityTitle('verification.completed', { source: 'gst', identifierType: 'gstin' })).toContain('demo source');
    expect(activityTitle('verification.completed', {})).not.toMatch(/government api|officially verified|fraud/i);
    expect(activityTitle('cross_verification.completed', { comparisonType: 'gst_mca' })).toMatch(/demo sources/);
    expect(activityTitle('cross_verification.inconsistent', {})).toMatch(/difference detected/);
    expect(activityTitle('cross_verification.inconsistent', {})).not.toMatch(/fraud|fake|disqualified/i);
    expect(activityTitle('requirement.evaluation.completed', {})).toMatch(/evidence mapping/);
    expect(activityTitle('review.assessment.created', {})).toMatch(/officer assessment/);
    expect(activityTitle('clarification.requested', {})).toMatch(/DEMO/);
    expect(activityTitle('evaluation.created', {})).toMatch(/evaluation workspace/);
    expect(activityTitle('evaluation.decision.recorded', {})).toMatch(/decision-support/);
    expect(activityTitle('evaluation.decision.recorded', {})).not.toMatch(/award|winner|rank/i);
    expect(activityTitle('evaluation.report.generated', {})).toMatch(/evaluation report/);
  });
});

describe('BharatBid review schemas', () => {
  it('rejects officer identity in assessment bodies and maps limit to pageSize', () => {
    expect(
      createReviewAssessmentBodySchema.safeParse({
        assessment: 'CONFIRMED',
        note: 'GST legal name uses an abbreviated suffix while MCA contains the expanded name.',
        officerId: '11111111-1111-4111-8111-aaaaaaaaaaaa',
      }).success,
    ).toBe(false);
    const parsed = reviewListQuerySchema.parse({ limit: '5', status: 'OPEN', q: 'Bayfront' });
    expect(parsed.pageSize).toBe(5);
    expect(parsed.status).toBe('open');
    expect(createReviewClarificationBodySchema.safeParse({ message: 'Please provide the current Udyam certificate.' }).success).toBe(true);
  });
});

describe('BharatBid attention schemas', () => {
  it('ignores frontend-supplied score fields and maps limit to pageSize', () => {
    const parsed = attentionListQuerySchema.parse({
      limit: '8',
      band: 'HIGH_ATTENTION',
      score: 3,
      factorPoints: 99,
      sortBy: 'evidence-coverage',
    });
    expect(parsed.pageSize).toBe(8);
    expect(parsed.band).toBe('high_attention');
    expect(parsed.sortBy).toBe('evidence_coverage');
    expect(parsed).not.toHaveProperty('score');
    expect(parsed).not.toHaveProperty('factorPoints');
  });
});

describe('BharatBid evaluation schemas', () => {
  it('rejects forged officer identity on notes and decisions', () => {
    expect(
      createEvaluationNoteBodySchema.safeParse({
        note: 'Technical documentation requires additional clarification before evaluation.',
        createdById: '11111111-1111-4111-8111-aaaaaaaaaaaa',
      }).success,
    ).toBe(false);
    expect(
      createEvaluationDecisionBodySchema.safeParse({
        bidSubmissionId: '11111111-1111-4111-8111-bbbbbbbbbbbb',
        decision: 'accepted_for_further_evaluation',
        reason: 'Evidence coverage and verification are sufficient for further officer evaluation.',
        officerId: '11111111-1111-4111-8111-aaaaaaaaaaaa',
      }).success,
    ).toBe(false);
    expect(createEvaluationBodySchema.safeParse({ tenderId: '11111111-1111-4111-8111-cccccccccccc' }).success).toBe(true);
    const listed = evaluationListQuerySchema.parse({ q: 'CPCL', status: 'OPEN', category: 'Goods' });
    expect(listed.status).toBe('open');
  });
});

describe('Tender readiness', () => {
  it('fails when no active requirement is configured', () => {
    const readiness = toTenderReadiness(
      {
        id: '11111111-1111-4111-8111-111111111111',
        referenceNumber: 'GEM/1',
        title: 'Test',
        description: null,
        organizationName: 'CPCL',
        departmentName: 'Contracts',
        category: 'Goods',
        status: 'draft',
        issueDate: new Date('2026-07-01'),
        closingDate: new Date('2026-08-01'),
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [],
    );
    expect(readiness.readyToOpen).toBe(false);
    expect(readiness.items.find((item) => item.id === 'requirements')?.passed).toBe(false);
  });
});
