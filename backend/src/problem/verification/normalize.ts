export function normalizeComparableText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const collapsed = value
    .toUpperCase()
    .replace(/[.,'`"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!collapsed) {
    return null;
  }
  return collapsed
    .replace(/\bP\s*VT\b/g, 'PRIVATE')
    .replace(/\bPVT\b/g, 'PRIVATE')
    .replace(/\bLTD\b/g, 'LIMITED')
    .replace(/\bPRIVATE LIMITED\b/g, 'PRIVATE LIMITED')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeStateName(value: string | null | undefined): string | null {
  const normalized = normalizeComparableText(value);
  if (!normalized) {
    return null;
  }
  if (normalized === 'TN' || normalized === 'TAMILNADU') {
    return 'TAMIL NADU';
  }
  if (normalized === 'GJ') {
    return 'GUJARAT';
  }
  if (normalized === 'MH') {
    return 'MAHARASHTRA';
  }
  if (normalized === 'KA') {
    return 'KARNATAKA';
  }
  if (normalized === 'DL' || normalized === 'NCT OF DELHI' || normalized === 'NEW DELHI') {
    return 'DELHI';
  }
  return normalized;
}

export function tokenSet(value: string): Set<string> {
  return new Set(value.split(' ').filter((token) => token.length > 1));
}

export function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) {
    return 1;
  }
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
