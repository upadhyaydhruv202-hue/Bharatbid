export const VERIFICATION_SOURCES = [
  'gst',
  'mca',
  'udyam',
  'gem',
  'pan',
  'income_tax',
  'epfo',
  'esic',
  'dpiit',
  'nsic',
  'debarment',
  'bis',
] as const;
export type VerificationSourceName = (typeof VERIFICATION_SOURCES)[number];

export const VERIFICATION_IDENTIFIER_TYPES = [
  'gstin',
  'cin',
  'udyam',
  'pan',
  'epfo',
  'esic',
  'nsic',
  'dpiit',
  'gem_seller',
  'bis',
] as const;
export type VerificationIdentifierTypeName = (typeof VERIFICATION_IDENTIFIER_TYPES)[number];

/** Identifier types DEMO adapters can look up. There is no live government API. */
export const VERIFIABLE_IDENTIFIER_TYPES = VERIFICATION_IDENTIFIER_TYPES;
export type VerifiableIdentifierTypeName = (typeof VERIFIABLE_IDENTIFIER_TYPES)[number];

export const VERIFICATION_SOURCE_MODES = ['demo', 'external'] as const;
export type VerificationSourceModeName = (typeof VERIFICATION_SOURCE_MODES)[number];

export const VERIFICATION_STATUSES = [
  'not_started',
  'queued',
  'processing',
  'matched',
  'mismatched',
  'not_found',
  'error',
] as const;
export type VerificationStatusName = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_IDENTIFIER_ORIGINS = ['extracted', 'manual', 'bidder_profile'] as const;
export type VerificationIdentifierOriginName = (typeof VERIFICATION_IDENTIFIER_ORIGINS)[number];

export const VERIFICATION_FIELD_OUTCOMES = [
  'match',
  'mismatch',
  'potential_match',
  'review_required',
  'not_compared',
] as const;
export type VerificationFieldOutcomeName = (typeof VERIFICATION_FIELD_OUTCOMES)[number];

export const VERIFICATION_ADAPTER_ERRORS = [
  'SOURCE_UNAVAILABLE',
  'SOURCE_TIMEOUT',
  'RECORD_NOT_FOUND',
  'INVALID_IDENTIFIER',
  'UNSUPPORTED_IDENTIFIER',
] as const;
export type VerificationAdapterErrorCode = (typeof VERIFICATION_ADAPTER_ERRORS)[number];

export const SOURCE_SUPPORTED_IDENTIFIERS: Record<VerificationSourceName, VerificationIdentifierTypeName[]> = {
  gst: ['gstin'],
  mca: ['cin'],
  udyam: ['udyam'],
  gem: ['gem_seller'],
  pan: ['pan'],
  income_tax: ['pan'],
  epfo: ['epfo'],
  esic: ['esic'],
  dpiit: ['dpiit'],
  nsic: ['nsic'],
  debarment: ['pan'],
  bis: ['bis'],
};

export const VERIFICATION_SOURCE_LABELS: Record<VerificationSourceName, string> = {
  gst: 'DEMO GST Registry',
  mca: 'DEMO MCA Registry',
  udyam: 'DEMO UDYAM Registry',
  gem: 'DEMO GeM Registry',
  pan: 'DEMO PAN Registry',
  income_tax: 'DEMO Income Tax Registry',
  epfo: 'DEMO EPFO Registry',
  esic: 'DEMO ESIC Registry',
  dpiit: 'DEMO DPIIT Registry',
  nsic: 'DEMO NSIC Registry',
  debarment: 'DEMO Debarment Registry',
  bis: 'DEMO BIS Registry',
};

export const VERIFICATION_IDENTIFIER_LABELS: Record<VerificationIdentifierTypeName, string> = {
  gstin: 'GSTIN',
  cin: 'CIN',
  udyam: 'Udyam',
  pan: 'PAN',
  epfo: 'EPFO',
  esic: 'ESIC',
  nsic: 'NSIC',
  dpiit: 'DPIIT',
  gem_seller: 'GeM seller',
  bis: 'BIS',
};

export const DEMO_SOURCE_ADVISORY =
  'Demo source — simulated verification data. Not an official government response.';

export const NOT_FOUND_DISCLAIMER =
  'No matching record found in the selected demo source. This does not by itself prove that the bidder is invalid.';

export const MISMATCH_DISCLAIMER = 'This difference requires officer review.';

export const ERROR_DISCLAIMER = 'Verification could not be completed.';

export interface NormalizedSourceRecord {
  source: VerificationSourceName;
  sourceMode: VerificationSourceModeName;
  sourceDisplayName: string;
  recordFound: boolean;
  retrievedAt: string;
  identifierType: VerificationIdentifierTypeName;
  identifier: string;
  legalName: string | null;
  tradeName: string | null;
  status: string | null;
  registrationDate: string | null;
  state: string | null;
  attributes?: Record<string, string | null>;
}

export interface FieldComparison {
  field: string;
  label: string;
  outcome: VerificationFieldOutcomeName;
  claimedValue: string | null;
  claimedOrigin: 'extracted' | 'manual' | 'bidder_profile' | 'identifier' | null;
  sourceValue: string | null;
  note: string;
}

export type AdapterLookupResult =
  | { ok: true; record: NormalizedSourceRecord }
  | { ok: false; code: VerificationAdapterErrorCode; message: string };

export interface VerificationAdapter {
  readonly source: VerificationSourceName;
  readonly displayName: string;
  readonly mode: VerificationSourceModeName;
  readonly supportedIdentifierTypes: readonly VerificationIdentifierTypeName[];
  availability(): 'available' | 'unavailable';
  lookup(input: {
    identifierType: VerificationIdentifierTypeName;
    identifier: string;
  }): Promise<AdapterLookupResult>;
}

export interface ExtractedClaims {
  gstin: string | null;
  cin: string | null;
  udyam: string | null;
  pan: string | null;
  epfo: string | null;
  esic: string | null;
  nsic: string | null;
  dpiit: string | null;
  gemSeller: string | null;
  bis: string | null;
  legalName: string | null;
  state: string | null;
}
