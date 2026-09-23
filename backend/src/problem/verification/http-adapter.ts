import { createHash, randomUUID } from 'node:crypto';

import { assertSafeExternalUrl, fetchExternal } from '../../security/ssrf';
import { normalizeIdentifier } from '../identifiers';
import type {
  AdapterLookupResult,
  VerificationAdapter,
  VerificationIdentifierTypeName,
  VerificationSourceModeName,
  VerificationSourceName,
} from './types';
import { SOURCE_SUPPORTED_IDENTIFIERS } from './types';

export interface HttpProviderConfig {
  source: VerificationSourceName;
  authority: string;
  providerName: string;
  mode: Extract<VerificationSourceModeName, 'sandbox' | 'live'>;
  baseUrl?: string;
  pathTemplate?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  timeoutMs?: number;
}

function isConfigured(config: HttpProviderConfig): boolean {
  return Boolean(config.baseUrl && Object.values(config.headers ?? {}).some(Boolean));
}

export class AuthorizedHttpAdapter implements VerificationAdapter {
  readonly source: VerificationSourceName;
  readonly mode: VerificationSourceModeName;
  readonly displayName: string;

  constructor(private readonly config: HttpProviderConfig) {
    this.source = config.source;
    this.mode = config.mode;
    this.displayName = `${config.providerName} (${config.mode.toUpperCase()})`;
  }

  get supportedIdentifierTypes(): readonly VerificationIdentifierTypeName[] {
    return SOURCE_SUPPORTED_IDENTIFIERS[this.source];
  }

  availability(): 'available' | 'unavailable' {
    return isConfigured(this.config) ? 'available' : 'unavailable';
  }

  isConfigured(): boolean {
    return isConfigured(this.config);
  }

  async lookup(input: {
    identifierType: VerificationIdentifierTypeName;
    identifier: string;
  }): Promise<AdapterLookupResult> {
    if (!this.supportedIdentifierTypes.includes(input.identifierType)) {
      return {
        ok: false,
        code: 'UNSUPPORTED_IDENTIFIER',
        message: `${this.displayName} does not support ${input.identifierType} lookups`,
      };
    }
    const identifier = normalizeIdentifier(input.identifier);
    if (!identifier) {
      return { ok: false, code: 'INVALID_IDENTIFIER', message: 'Identifier is required' };
    }
    if (!this.isConfigured() || !this.config.baseUrl) {
      return {
        ok: false,
        code: 'SOURCE_UNAVAILABLE',
        message: 'Provider credentials are not configured. This is not a match.',
      };
    }

    const path = (this.config.pathTemplate ?? '/{identifier}').replace('{identifier}', encodeURIComponent(identifier));
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    let allowedHosts: string[] | undefined;
    try {
      allowedHosts = [new URL(this.config.baseUrl).hostname];
      assertSafeExternalUrl(url, { field: 'providerUrl', allowHttp: false, allowedHosts });
    } catch {
      return {
        ok: false,
        code: 'SOURCE_UNAVAILABLE',
        message: 'Provider URL is not an allowed https host',
      };
    }

    try {
      const response = await requestWithRetry(() =>
        fetchExternal(url, {
          method: this.config.method ?? 'GET',
          headers: {
            Accept: 'application/json',
            ...(this.config.headers ?? {}),
          },
          body:
            this.config.method === 'POST'
              ? JSON.stringify({ [input.identifierType]: identifier, gstin: identifier, cin: identifier, pan: identifier })
              : undefined,
          timeoutMs: this.config.timeoutMs ?? 8_000,
          allowHttp: false,
          allowedHosts,
        }),
      );
      if (response.status === 404) {
        return { ok: false, code: 'RECORD_NOT_FOUND', message: 'No matching record at the selected provider' };
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, code: 'SOURCE_UNAVAILABLE', message: 'Provider authentication failed' };
      }
      if (response.status === 429) {
        return { ok: false, code: 'SOURCE_TIMEOUT', message: 'Provider rate limit reached' };
      }
      if (!response.ok) {
        return { ok: false, code: 'SOURCE_UNAVAILABLE', message: `Provider returned HTTP ${response.status}` };
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return { ok: false, code: 'SOURCE_UNAVAILABLE', message: 'Provider returned a malformed response' };
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { ok: false, code: 'SOURCE_UNAVAILABLE', message: 'Provider returned a malformed response' };
      }
      const record = payload as Record<string, unknown>;
      const legalName = stringField(record, ['legalName', 'lgnm', 'legal_name', 'companyName', 'name']);
      const tradeName = stringField(record, ['tradeName', 'tradeNam', 'trade_name']);
      const status = stringField(record, ['status', 'sts', 'registrationStatus']);
      const registrationDate = stringField(record, ['registrationDate', 'rgdt', 'incorporationDate']);
      const state = stringField(record, ['state', 'stj', 'pradr', 'registeredState']);
      if (!legalName && !tradeName && !status && !registrationDate && !state) {
        return {
          ok: false,
          code: 'SOURCE_UNAVAILABLE',
          message: 'Provider returned an empty response. This is not a verified match.',
        };
      }
      return {
        ok: true,
        record: {
          source: this.source,
          sourceMode: this.mode,
          sourceDisplayName: this.displayName,
          recordFound: true,
          retrievedAt: new Date().toISOString(),
          identifierType: input.identifierType,
          identifier,
          legalName,
          tradeName,
          status,
          registrationDate,
          state,
          attributes: {
            provider: this.config.providerName,
            authority: this.config.authority,
            mode: this.mode,
            requestId: randomUUID(),
            responseHash: createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0, 32),
          },
        },
      };
    } catch {
      return {
        ok: false,
        code: 'SOURCE_TIMEOUT',
        message: 'Provider request failed or timed out. This is not a verified match.',
      };
    }
  }
}

async function requestWithRetry(run: () => Promise<Response>): Promise<Response> {
  let last: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    last = await run();
    if (last.status !== 429 && last.status !== 503) {
      return last;
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  return last as Response;
}

function stringField(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (value && typeof value === 'object' && 'ntr' in (value as object)) {
      continue;
    }
  }
  const nested = payload.data;
  if (nested && typeof nested === 'object') {
    return stringField(nested as Record<string, unknown>, keys);
  }
  return null;
}
