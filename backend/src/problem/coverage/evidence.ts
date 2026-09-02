import type {
  DigiLockerDemoView,
  DigiLockerDemoStatus,
  InformationGap,
  MakeInIndiaClass,
  MakeInIndiaView,
  OemAuthorizationView,
  OemOutcome,
} from './types';

export const DIGILOCKER_DEMO_DISCLAIMER =
  'This is a synthetic demonstration result and is not connected to DigiLocker.';

export interface EvidenceDocument {
  id: string;
  originalFilename: string;
  documentType: string;
  extractedText: string | null;
}

export function classifyMakeInIndia(documents: EvidenceDocument[]): MakeInIndiaView {
  const document = documents.find((item) => item.documentType === 'declaration' || /make in india|local content/i.test(item.extractedText ?? ''));
  const text = document?.extractedText ?? '';
  const declaredClass = parseMiiClass(text);
  const percent = parsePercent(text);
  return {
    declaredClass,
    localContentPercent: percent,
    documentId: document?.id ?? null,
    documentFilename: document?.originalFilename ?? null,
    explanation:
      declaredClass === 'NOT_DECLARED'
        ? 'No Make in India class was declared in submitted evidence. This is not an eligibility determination.'
        : `Declaration records ${declaredClass.replace('_', ' ')}${percent !== null ? ` with local content ${percent}%` : ''}. Officer remains responsible for eligibility.`,
  };
}

export function evaluateOemAuthorization(documents: EvidenceDocument[], bidClaim: string | null): OemAuthorizationView {
  const document = documents.find((item) => item.documentType === 'oem_authorization');
  if (!document) {
    return {
      outcome: 'EVIDENCE_MISSING',
      oemName: null,
      product: null,
      authorizationReference: null,
      validFrom: null,
      validUntil: null,
      bidClaim,
      documentId: null,
      explanation: 'Information not available in submitted evidence.',
    };
  }
  const text = document.extractedText ?? '';
  const oemName = labeled(text, ['oem name', 'manufacturer']);
  const product = labeled(text, ['product']);
  const authorizationReference = labeled(text, ['authorization reference', 'reference']);
  const validFrom = labeled(text, ['valid from']);
  const validUntil = labeled(text, ['valid until', 'valid to']);
  const outcome: OemOutcome = compareOem(oemName, product, bidClaim);
  return {
    outcome,
    oemName,
    product,
    authorizationReference,
    validFrom,
    validUntil,
    bidClaim,
    documentId: document.id,
    explanation: oemExplanation(outcome),
  };
}

export function demoDigiLockerViews(documents: EvidenceDocument[]): DigiLockerDemoView[] {
  return documents.map((document) => ({
    documentId: document.id,
    documentFilename: document.originalFilename,
    status: parseDigiLockerStatus(document.extractedText),
    disclaimer: DIGILOCKER_DEMO_DISCLAIMER,
  }));
}

export function detectInformationGaps(input: {
  documents: EvidenceDocument[];
  legalName?: string | null;
  state?: string | null;
  oem: OemAuthorizationView;
  mii: MakeInIndiaView;
  mandatoryMissing: Array<{ id: string; name: string }>;
}): InformationGap[] {
  const gaps: InformationGap[] = [];
  for (const requirement of input.mandatoryMissing) {
    gaps.push({
      id: `missing-document:${requirement.id}`,
      kind: 'missing_document',
      description: `Information not available in submitted evidence for "${requirement.name}".`,
      source: { kind: 'requirement', id: requirement.id },
    });
  }
  const names = input.documents
    .map((item) => labeled(item.extractedText ?? '', ['legal name', 'enterprise name', 'company name']))
    .filter((value): value is string => Boolean(value));
  if (input.legalName && names.some((name) => normalize(name) !== normalize(input.legalName))) {
    gaps.push({
      id: 'conflicting-name',
      kind: 'conflicting_name',
      description: 'Submitted documents use a legal name that differs from the bidder profile after safe comparison.',
    });
  }
  if (input.oem.outcome === 'MISMATCHED' || input.oem.outcome === 'NOT_COMPARABLE') {
    gaps.push({
      id: 'oem-inconsistent',
      kind: 'inconsistent_oem',
      description: input.oem.explanation,
      source: input.oem.documentId ? { kind: 'document', id: input.oem.documentId } : undefined,
    });
  }
  if (input.mii.declaredClass === 'NOT_DECLARED' && input.documents.some((item) => item.documentType === 'declaration')) {
    gaps.push({
      id: 'mii-undeclared',
      kind: 'inconsistent_declaration',
      description: 'A declaration document is present but no Make in India class could be read.',
    });
  }
  for (const document of input.documents) {
    if (document.documentType === 'oem_authorization' && !labeled(document.extractedText ?? '', ['valid until', 'valid to'])) {
      gaps.push({
        id: `missing-validity:${document.id}`,
        kind: 'missing_validity',
        description: `Validity dates were not found in ${document.originalFilename}.`,
        source: { kind: 'document', id: document.id },
      });
    }
  }
  return gaps;
}

function parseMiiClass(text: string): MakeInIndiaClass {
  const upper = text.toUpperCase();
  if (/CLASS[_\s-]*I\b/.test(upper) && !/CLASS[_\s-]*II\b/.test(upper)) {
    return 'CLASS_I';
  }
  if (/CLASS[_\s-]*II\b/.test(upper)) {
    return 'CLASS_II';
  }
  return 'NOT_DECLARED';
}

function parsePercent(text: string): number | null {
  const match = text.match(/local content[^0-9]{0,20}(\d{1,3})\s*%/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

function parseDigiLockerStatus(text: string | null): DigiLockerDemoStatus {
  const upper = (text ?? '').toUpperCase();
  if (/DIGILOCKER AUTHENTICITY:\s*ISSUED/.test(upper) || /DEMO DIGILOCKER:\s*ISSUED/.test(upper)) {
    return 'ISSUED';
  }
  if (/DIGILOCKER AUTHENTICITY:\s*NOT_ISSUED/.test(upper) || /DEMO DIGILOCKER:\s*NOT_ISSUED/.test(upper)) {
    return 'NOT_ISSUED';
  }
  return 'NOT_AVAILABLE';
}

function labeled(text: string, labels: string[]): string | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const label of labels) {
      if (lower.startsWith(`${label}:`) || lower.startsWith(`${label} -`)) {
        const value = line.replace(/^[^:-]+[:\-]\s*/, '').trim();
        if (value) {
          return value;
        }
      }
    }
  }
  return null;
}

function compareOem(oemName: string | null, product: string | null, bidClaim: string | null): OemOutcome {
  if (!oemName && !product) {
    return 'REVIEW_REQUIRED';
  }
  if (!bidClaim) {
    return 'NOT_COMPARABLE';
  }
  const claim = normalize(bidClaim);
  const haystack = normalize([oemName, product].filter(Boolean).join(' '));
  if (!haystack) {
    return 'NOT_COMPARABLE';
  }
  if (haystack.includes(claim) || claim.includes(haystack) || tokenize(claim).some((token) => haystack.includes(token))) {
    return 'MATCHED';
  }
  return 'MISMATCHED';
}

function oemExplanation(outcome: OemOutcome): string {
  if (outcome === 'MATCHED') {
    return 'OEM authorization fields are consistent with the bid claim after safe comparison. Officer remains the decision-maker.';
  }
  if (outcome === 'MISMATCHED') {
    return 'OEM authorization evidence differs from the bid claim. Officer review is required.';
  }
  if (outcome === 'EVIDENCE_MISSING') {
    return 'Information not available in submitted evidence.';
  }
  if (outcome === 'NOT_COMPARABLE') {
    return 'OEM evidence and bid claim cannot be compared with the information currently available.';
  }
  return 'OEM authorization requires officer review.';
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenize(value: string): string[] {
  return value.split(' ').filter((token) => token.length >= 4);
}
