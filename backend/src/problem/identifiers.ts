const EMPTY = new Set(['', 'null', 'undefined']);

export function blankToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed && !EMPTY.has(trimmed.toLowerCase()) ? trimmed : null;
}

export function normalizeIdentifier(value: string | null | undefined): string | null {
  const trimmed = blankToNull(value);
  return trimmed ? trimmed.toUpperCase() : null;
}

/** Indian PAN: 5 letters, 4 digits, 1 letter. */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** GSTIN: 2-digit state, PAN, entity, Z, checksum. */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Corporate Identification Number. */
export const CIN_PATTERN = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** Indian Udyam registration number. */
export const UDYAM_PATTERN = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;

export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

/** DEMO-only registry codes. Not official EPFO/ESIC/NSIC/BIS formats. */
export const DEMO_REGISTRY_CODE_PATTERN = /^DEMO-[A-Z]{2,12}-[A-Z0-9-]{1,24}$/;

/** Indian mobile in E.164. */
export const INDIAN_MOBILE_PATTERN = /^\+91[6-9][0-9]{9}$/;

export function isValidPan(value: string): boolean {
  return PAN_PATTERN.test(value);
}

export function isValidGstin(value: string): boolean {
  return GSTIN_PATTERN.test(value);
}

export function isValidCin(value: string): boolean {
  return CIN_PATTERN.test(value);
}

export function isValidUdyam(value: string): boolean {
  return UDYAM_PATTERN.test(value);
}

export function isValidDemoRegistryCode(value: string): boolean {
  return DEMO_REGISTRY_CODE_PATTERN.test(value);
}

export function isValidVerificationIdentifier(type: string, value: string): boolean {
  if (type === 'gstin') return isValidGstin(value);
  if (type === 'cin') return isValidCin(value);
  if (type === 'udyam') return isValidUdyam(value);
  if (type === 'pan') return isValidPan(value);
  return isValidDemoRegistryCode(value);
}

/** Mask PAN for list views. Example: ABCDE1234F → ABCDE****F */
export function maskPan(pan: string | null | undefined): string | null {
  if (!pan) {
    return null;
  }
  if (pan.length < 6) {
    return pan;
  }
  return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
}

export function identifierPresence(value: string | null | undefined): 'provided' | 'not_provided' {
  return value && value.trim() ? 'provided' : 'not_provided';
}

export function isProfileComplete(input: {
  pan?: string | null;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
}): boolean {
  return Boolean(input.pan && input.gstin && input.city && input.state && input.contactEmail);
}
