import {
  CIN_PATTERN,
  DEMO_REGISTRY_CODE_PATTERN,
  GSTIN_PATTERN,
  PAN_PATTERN,
  UDYAM_PATTERN,
  normalizeIdentifier,
} from '../identifiers';
import type { ExtractedClaims } from './types';

const STATES = [
  'andaman and nicobar islands',
  'andhra pradesh',
  'arunachal pradesh',
  'assam',
  'bihar',
  'chandigarh',
  'chhattisgarh',
  'delhi',
  'goa',
  'gujarat',
  'haryana',
  'himachal pradesh',
  'jammu and kashmir',
  'jharkhand',
  'karnataka',
  'kerala',
  'ladakh',
  'madhya pradesh',
  'maharashtra',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'odisha',
  'puducherry',
  'punjab',
  'rajasthan',
  'sikkim',
  'tamil nadu',
  'telangana',
  'tripura',
  'uttar pradesh',
  'uttarakhand',
  'west bengal',
];

const STATE_LABEL: Record<string, string> = {
  'tamil nadu': 'Tamil Nadu',
  gujarat: 'Gujarat',
  maharashtra: 'Maharashtra',
  karnataka: 'Karnataka',
  delhi: 'Delhi',
};

export function firstMatch(text: string, pattern: RegExp): string | null {
  const source = pattern.source.replace(/^\^/, '').replace(/\$$/, '');
  const match = text.toUpperCase().match(new RegExp(source));
  return match ? normalizeIdentifier(match[0]) : null;
}

export function extractClaimsFromText(text: string | null | undefined): ExtractedClaims {
  const raw = text ?? '';
  const upper = raw.toUpperCase();
  return {
    gstin: firstMatch(upper, GSTIN_PATTERN),
    cin: firstMatch(upper, CIN_PATTERN),
    udyam: firstMatch(upper, UDYAM_PATTERN),
    pan: firstMatch(upper, PAN_PATTERN),
    epfo: firstDemoCode(upper, 'EPFO'),
    esic: firstDemoCode(upper, 'ESIC'),
    nsic: firstMatch(upper, /^DEMO-NSIC-[A-Z0-9-]+$/),
    dpiit: firstMatch(upper, /^DEMO-DPIIT-[A-Z0-9-]+$/),
    gemSeller: firstMatch(upper, /^DEMO-GEM-[A-Z0-9-]+$/),
    bis: firstMatch(upper, /^DEMO-BIS-[A-Z0-9-]+$/),
    legalName: extractLabeledValue(raw, ['legal name', 'enterprise name', 'company name', 'name of the entity'])
      ?? extractCompanyLine(raw),
    state: extractState(raw),
  };
}

export function firstDemoCode(text: string, kind: string): string | null {
  const match = text.toUpperCase().match(new RegExp(`DEMO-${kind}-[A-Z0-9-]+`));
  if (!match) {
    return null;
  }
  const value = normalizeIdentifier(match[0]);
  return value && DEMO_REGISTRY_CODE_PATTERN.test(value) ? value : null;
}

function extractLabeledValue(text: string, labels: string[]): string | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const label of labels) {
      if (lower.startsWith(`${label}:`) || lower.startsWith(`${label} -`) || lower.startsWith(`${label}–`)) {
        const value = line.replace(/^[^:–-]+[:–-]\s*/, '').trim();
        if (value && !/not verified/i.test(value)) {
          return value;
        }
      }
    }
  }
  return null;
}

function extractCompanyLine(text: string): string | null {
  const match = text.match(/\b([A-Z][A-Za-z0-9&.,' -]{8,}(?:Private Limited|Pvt\.?\s*Ltd\.?|Limited|LLP))\b/);
  return match ? match[1].trim() : null;
}

function extractState(text: string): string | null {
  const lower = text.toLowerCase();
  for (const state of STATES) {
    if (lower.includes(state)) {
      return STATE_LABEL[state] ?? titleCase(state);
    }
  }
  return null;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
