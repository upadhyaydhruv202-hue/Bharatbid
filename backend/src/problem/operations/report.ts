import type { PdfDocumentSpec } from '../../integrations/pdf/pdf.renderer';

export const EVALUATION_REPORT_DISCLAIMER =
  'This report is a decision-support record generated from information available in the BharatBid system. It does not constitute an automatic procurement award, rejection, or government certification. Final decisions remain with authorized procurement officers.';

export const REPORT_KINDS = ['evaluation', 'evidence', 'verification', 'review', 'decision'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_KIND_TITLES: Record<ReportKind, string> = {
  evaluation: 'Tender Evaluation Report',
  evidence: 'Bid Evidence Summary',
  verification: 'Verification Summary',
  review: 'Officer Review Summary',
  decision: 'Evaluation Decision Record',
};

type ComparisonLike = {
  tender: {
    referenceNumber: string;
    title: string;
    organizationName: string;
    departmentName: string;
    category: string;
    status: string;
    closingDate: string;
  };
  evaluation: {
    statusLabel: string;
    startedBy?: { displayName: string } | null;
    recordedBy?: { displayName: string } | null;
  } | null;
  overview: {
    submittedBids: number;
    comparedBids: number;
    evidenceGaps: number;
    verificationIssues: number;
    openReviews: number;
    pendingClarifications: number;
  };
  requirements: Array<{ name: string; requirementType: string; mandatory: boolean }>;
  bids: Array<{
    submissionReference: string;
    bidderLegalName: string;
    status: string;
    evidenceCoveragePercent: number | null;
    verificationLabel: string;
    crossCheckLabel: string;
    attention: { bandLabel: string; score: number } | null;
    coverageScore?: number | null;
    reviewRisk?: string | null;
    officerAdvisory?: string | null;
    readinessLabel: string;
    latestDecision: { decisionLabel: string; reason: string } | null;
    requirementCells: Array<{
      name: string;
      cellLabel: string;
      documents: Array<{ originalFilename: string }>;
    }>;
    verificationSummary: { matched: number; mismatched: number; notFound: number; errors: number; total: number };
    crossCheckSummary: { consistent: number; inconsistent: number; total: number };
    reviewSummary: {
      open: number;
      inReview: number;
      clarificationRequested: number;
      assessed: number;
      closed: number;
    };
  }>;
  notes: Array<{ note: string; createdBy: { displayName: string }; createdAt: string; bidReference: string | null }>;
  decisions: Array<{
    decisionLabel: string;
    reason: string;
    decidedBy: { displayName: string };
    decidedAt: string;
    bidReference: string;
  }>;
  activity?: Array<{ title: string; actorName?: string | null; timestamp: string }>;
  demoLabel: string;
};

export function buildEvaluationReportSpec(comparison: ComparisonLike, kind: ReportKind = 'evaluation'): PdfDocumentSpec {
  const title = REPORT_KIND_TITLES[kind];
  const include = sectionsForKind(kind);
  const blocks: PdfDocumentSpec['blocks'] = [
    { type: 'heading', text: 'BharatBid', level: 1 },
    { type: 'paragraph', text: 'Procurement Intelligence & Evidence-Based Bid Evaluation' },
    { type: 'heading', text: title, level: 2 },
    { type: 'paragraph', text: 'DEMO / SYNTHETIC DATA' },
    { type: 'paragraph', text: EVALUATION_REPORT_DISCLAIMER },
    { type: 'spacer', height: 8 },
    {
      type: 'facts',
      title: 'Tender information',
      entries: [
        { key: 'Reference', value: comparison.tender.referenceNumber },
        { key: 'Title', value: comparison.tender.title },
        { key: 'Organisation', value: comparison.tender.organizationName },
        { key: 'Department', value: comparison.tender.departmentName },
        { key: 'Category', value: comparison.tender.category },
        { key: 'Tender status', value: comparison.tender.status.replace(/_/g, ' ') },
        { key: 'Closing date', value: comparison.tender.closingDate.slice(0, 10) },
        { key: 'Data class', value: comparison.demoLabel },
      ],
    },
  ];

  if (include.requirements) {
    blocks.push({
      type: 'table',
      title: 'Requirements',
      columns: ['Requirement', 'Type', 'Mandatory'],
      rows: comparison.requirements.map((item) => [
        item.name,
        item.requirementType.replace(/_/g, ' '),
        item.mandatory ? 'Yes' : 'No',
      ]),
    });
  }

  if (include.bids) {
    blocks.push({
      type: 'table',
      title: 'Submitted bids',
      columns: ['Bid', 'Bidder', 'Status', 'Evidence coverage', 'Compliance coverage', 'Review risk', 'Officer Review Priority', 'Readiness'],
      rows: comparison.bids.map((bid) => [
        bid.submissionReference,
        bid.bidderLegalName,
        bid.status.replace(/_/g, ' '),
        bid.evidenceCoveragePercent === null ? 'Not calculated' : `${bid.evidenceCoveragePercent}%`,
        bid.coverageScore === null || bid.coverageScore === undefined ? 'Not calculated' : `${bid.coverageScore} / 100`,
        bid.reviewRisk ?? 'Not calculated',
        bid.attention?.bandLabel ?? 'Not calculated',
        bid.readinessLabel.replace(/_/g, ' '),
      ]),
    });
    blocks.push({
      type: 'paragraph',
      text: 'Compliance coverage and review risk are decision-support indicators derived from available evidence and DEMO source results. They are not official government determinations. Officer advisory text never awards, rejects, or ranks bidders.',
    });
    const advisory = comparison.bids.map((bid) => bid.officerAdvisory).find(Boolean);
    if (advisory) {
      blocks.push({ type: 'paragraph', text: `Officer advisory: ${advisory}` });
    }
  }

  if (include.evidence) {
    blocks.push({
      type: 'heading',
      text: 'Evidence summary',
      level: 2,
    });
    blocks.push({
      type: 'paragraph',
      text: `Evidence gaps on ${comparison.overview.evidenceGaps} compared bid(s). Coverage uses existing Evidence Coverage terminology and is not a compliance score.`,
    });
    for (const bid of comparison.bids) {
      blocks.push({
        type: 'table',
        title: `${bid.submissionReference} — ${bid.bidderLegalName}`,
        columns: ['Requirement', 'Cell', 'Documents'],
        rows: bid.requirementCells.map((cell) => [
          cell.name,
          cell.cellLabel,
          cell.documents.map((doc) => doc.originalFilename).join(', ') || 'None linked',
        ]),
      });
    }
  }

  if (include.verification) {
    blocks.push({
      type: 'table',
      title: 'Verification summary (DEMO SOURCE)',
      columns: ['Bid', 'Matched', 'Mismatched', 'Not found', 'Error', 'Total', 'Label'],
      rows: comparison.bids.map((bid) => [
        bid.submissionReference,
        String(bid.verificationSummary.matched),
        String(bid.verificationSummary.mismatched),
        String(bid.verificationSummary.notFound),
        String(bid.verificationSummary.errors),
        String(bid.verificationSummary.total),
        bid.verificationLabel,
      ]),
    });
    blocks.push({
      type: 'table',
      title: 'Cross-verification summary (DEMO SOURCE)',
      columns: ['Bid', 'Consistent', 'Inconsistent', 'Total', 'Label'],
      rows: comparison.bids.map((bid) => [
        bid.submissionReference,
        String(bid.crossCheckSummary.consistent),
        String(bid.crossCheckSummary.inconsistent),
        String(bid.crossCheckSummary.total),
        bid.crossCheckLabel,
      ]),
    });
  }

  if (include.review) {
    blocks.push({
      type: 'table',
      title: 'Review summary',
      columns: ['Bid', 'Open', 'In review', 'Clarification', 'Assessed', 'Closed', 'Officer Review Priority'],
      rows: comparison.bids.map((bid) => [
        bid.submissionReference,
        String(bid.reviewSummary.open),
        String(bid.reviewSummary.inReview),
        String(bid.reviewSummary.clarificationRequested),
        String(bid.reviewSummary.assessed),
        String(bid.reviewSummary.closed),
        bid.attention?.bandLabel ?? 'Not calculated',
      ]),
    });
  }

  if (include.evaluation) {
    blocks.push({
      type: 'facts',
      title: 'Evaluation status',
      entries: [
        { key: 'Workspace', value: comparison.evaluation?.statusLabel ?? 'Not started' },
        { key: 'Started by', value: comparison.evaluation?.startedBy?.displayName ?? '—' },
        { key: 'Decision recorded by', value: comparison.evaluation?.recordedBy?.displayName ?? '—' },
        { key: 'Compared bids', value: String(comparison.overview.comparedBids) },
        { key: 'Open reviews', value: String(comparison.overview.openReviews) },
        { key: 'Pending clarifications', value: String(comparison.overview.pendingClarifications) },
      ],
    });
  }

  if (include.notes) {
    blocks.push({
      type: 'heading',
      text: 'Officer notes',
      level: 2,
    });
    if (comparison.notes.length === 0) {
      blocks.push({ type: 'paragraph', text: 'No officer notes recorded.' });
    } else {
      for (const note of comparison.notes) {
        const scope = note.bidReference ? ` (${note.bidReference})` : '';
        blocks.push({
          type: 'paragraph',
          text: `${note.createdAt.slice(0, 16).replace('T', ' ')} — ${note.createdBy.displayName}${scope}: ${truncate(note.note, 400)}`,
        });
      }
    }
  }

  if (include.decisions) {
    blocks.push({
      type: 'table',
      title: 'Officer decisions',
      columns: ['Bid', 'Decision-support state', 'Officer', 'Recorded'],
      rows:
        comparison.decisions.length === 0
          ? [['—', 'No officer decision recorded', '—', '—']]
          : comparison.decisions.map((item) => [
              item.bidReference,
              item.decisionLabel,
              item.decidedBy.displayName,
              item.decidedAt.slice(0, 16).replace('T', ' '),
            ]),
    });
    if (comparison.decisions.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: comparison.decisions
          .map((item) => `${item.bidReference}: ${truncate(item.reason, 240)}`)
          .join(' '),
      });
    }
  }

  if (include.activity && comparison.activity && comparison.activity.length > 0) {
    blocks.push({
      type: 'heading',
      text: 'Audit / activity summary',
      level: 2,
    });
    for (const event of comparison.activity.slice(0, 20)) {
      blocks.push({
        type: 'paragraph',
        text: `${event.timestamp.slice(0, 16).replace('T', ' ')} — ${event.actorName ?? 'System'} — ${event.title}`,
      });
    }
  }

  blocks.push({ type: 'spacer', height: 12 });
  blocks.push({ type: 'paragraph', text: EVALUATION_REPORT_DISCLAIMER });
  blocks.push({ type: 'paragraph', text: 'DEMO / SYNTHETIC DATA. Adapters are simulated sources, not live government registries.' });

  return {
    title: `BharatBid — ${title}`,
    subtitle: `${comparison.tender.referenceNumber} · DEMO / SYNTHETIC DATA`,
    metadata: {
      title: `BharatBid — ${title}`,
      author: 'BharatBid',
      subject: 'Decision-support procurement record',
      createdAt: new Date().toISOString(),
      keywords: ['DEMO', 'SYNTHETIC', 'decision-support'],
    },
    header: { text: 'BharatBid · DEMO / SYNTHETIC DATA', timestamp: true },
    footer: { text: 'Decision-support only. Not an award or government certification.', pageNumbers: true },
    blocks,
  };
}

function sectionsForKind(kind: ReportKind) {
  return {
    requirements: kind === 'evaluation' || kind === 'evidence',
    bids: kind !== 'decision',
    evidence: kind === 'evaluation' || kind === 'evidence',
    verification: kind === 'evaluation' || kind === 'verification',
    review: kind === 'evaluation' || kind === 'review',
    evaluation: kind === 'evaluation' || kind === 'decision',
    notes: kind === 'evaluation' || kind === 'decision' || kind === 'review',
    decisions: kind === 'evaluation' || kind === 'decision',
    activity: kind === 'evaluation',
  };
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}
