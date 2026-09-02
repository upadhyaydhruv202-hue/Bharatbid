export const TENDER_STATUSES = [
  'draft',
  'open',
  'under_evaluation',
  'closed',
  'awarded',
  'cancelled',
] as const;

export type TenderStatusName = (typeof TENDER_STATUSES)[number];

export const TENDER_REQUIREMENT_TYPES = [
  'statutory',
  'eligibility',
  'document',
  'financial',
  'technical',
  'organizational',
  'declaration',
  'tender_specific',
  'other',
] as const;

export type TenderRequirementTypeName = (typeof TENDER_REQUIREMENT_TYPES)[number];

export const BID_SUBMISSION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'withdrawn',
  'finalized',
] as const;

export type BidSubmissionStatusName = (typeof BID_SUBMISSION_STATUSES)[number];

export const BID_DOCUMENT_TYPES = [
  'pan',
  'gst_certificate',
  'cin',
  'udyam_certificate',
  'financial_statement',
  'turnover_certificate',
  'bank_certificate',
  'technical_qualification',
  'experience_certificate',
  'oem_authorization',
  'product_datasheet',
  'incorporation_certificate',
  'authorization_letter',
  'affidavit',
  'declaration',
  'bid_form',
  'tender_response',
  'price_schedule',
  'epfo_certificate',
  'esic_certificate',
  'nsic_certificate',
  'dpiit_certificate',
  'bis_licence',
  'other',
] as const;

export type BidDocumentTypeName = (typeof BID_DOCUMENT_TYPES)[number];

export const BID_DOCUMENT_CATEGORIES = [
  'identity',
  'financial',
  'technical',
  'legal',
  'procurement',
  'other',
] as const;

export type BidDocumentCategoryName = (typeof BID_DOCUMENT_CATEGORIES)[number];

export const BID_DOCUMENT_TYPE_CATEGORY: Record<BidDocumentTypeName, BidDocumentCategoryName> = {
  pan: 'identity',
  gst_certificate: 'identity',
  cin: 'identity',
  udyam_certificate: 'identity',
  financial_statement: 'financial',
  turnover_certificate: 'financial',
  bank_certificate: 'financial',
  technical_qualification: 'technical',
  experience_certificate: 'technical',
  oem_authorization: 'technical',
  product_datasheet: 'technical',
  incorporation_certificate: 'legal',
  authorization_letter: 'legal',
  affidavit: 'legal',
  declaration: 'legal',
  bid_form: 'procurement',
  tender_response: 'procurement',
  price_schedule: 'procurement',
  epfo_certificate: 'identity',
  esic_certificate: 'identity',
  nsic_certificate: 'identity',
  dpiit_certificate: 'identity',
  bis_licence: 'technical',
  other: 'other',
};

export const BID_DOCUMENT_TYPE_LABELS: Record<BidDocumentTypeName, string> = {
  pan: 'PAN',
  gst_certificate: 'GST Certificate',
  cin: 'CIN',
  udyam_certificate: 'Udyam Certificate',
  financial_statement: 'Financial Statement',
  turnover_certificate: 'Turnover Certificate',
  bank_certificate: 'Bank Certificate',
  technical_qualification: 'Technical Qualification',
  experience_certificate: 'Experience Certificate',
  oem_authorization: 'OEM Authorization',
  product_datasheet: 'Product Datasheet',
  incorporation_certificate: 'Incorporation Certificate',
  authorization_letter: 'Authorization Letter',
  affidavit: 'Affidavit',
  declaration: 'Declaration',
  bid_form: 'Bid Form',
  tender_response: 'Tender Response',
  price_schedule: 'Price Schedule',
  epfo_certificate: 'EPFO Certificate',
  esic_certificate: 'ESIC Certificate',
  nsic_certificate: 'NSIC Certificate',
  dpiit_certificate: 'DPIIT Recognition',
  bis_licence: 'BIS Licence',
  other: 'Other Supporting Document',
};

export const BID_DOCUMENT_STATUSES = ['uploaded', 'processing', 'ready', 'failed', 'archived'] as const;

export type BidDocumentStatusName = (typeof BID_DOCUMENT_STATUSES)[number];

export const BID_DOCUMENT_EXTRACTION_STATUSES = [
  'not_started',
  'queued',
  'processing',
  'completed',
  'failed',
] as const;

export type BidDocumentExtractionStatusName = (typeof BID_DOCUMENT_EXTRACTION_STATUSES)[number];

export const EXTRACTION_ADVISORY =
  'Machine-extracted information. Not independently verified.';

export const TENDER_CATEGORIES = ['Goods', 'Services', 'Works', 'IT', 'Consultancy', 'Other'] as const;

export type TenderCategoryName = (typeof TENDER_CATEGORIES)[number];

export function normalizeTenderCategory(value: string): TenderCategoryName | null {
  const trimmed = value.trim();
  const match = TENDER_CATEGORIES.find((category) => category.toLowerCase() === trimmed.toLowerCase());
  return match ?? null;
}

export const DEFAULT_ORGANIZATION_NAME = 'Chennai Petroleum Corporation Limited';
export const DEFAULT_DEPARTMENT_NAME = 'Contracts and Procurement';

export const BHARATBID_AUDIT_RESOURCES = {
  TENDER: 'tender',
  TENDER_REQUIREMENT: 'tender_requirement',
  BIDDER: 'bidder',
  BID: 'bid',
  BID_DOCUMENT: 'bid_document',
  VERIFICATION: 'verification',
  CROSS_VERIFICATION: 'cross_verification',
  EVALUATION: 'evaluation',
} as const;
