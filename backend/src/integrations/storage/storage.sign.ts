import { createHmac, timingSafeEqual } from 'node:crypto';

import { AuthenticationError, ValidationError } from '../../errors';
import { assertStorageKey } from './storage.keys';
import type { SignedDownload } from './storage.types';

export const STORAGE_DOWNLOAD_MAX_SECONDS = 86_400;
export const STORAGE_DOWNLOAD_DEFAULT_SECONDS = 300;

export interface StorageSigning {
  appUrl: string;
  secret: string;
}

export function createSignedDownload(
  key: string,
  expiresInSeconds: number,
  signing: StorageSigning,
): SignedDownload {
  const safeKey = assertStorageKey(key);
  const ttl = clampExpiry(expiresInSeconds);
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const signature = signStorageDownload(signing.secret, safeKey, expires);
  const url = new URL('/api/v1/storage/download', signing.appUrl);
  url.searchParams.set('key', safeKey);
  url.searchParams.set('expires', String(expires));
  url.searchParams.set('sig', signature);

  return {
    key: safeKey,
    url: url.toString(),
    expiresAt: new Date(expires * 1000).toISOString(),
  };
}

export function verifySignedDownload(input: {
  key: string;
  expires: string;
  signature: string;
  secret: string;
}): string {
  const safeKey = assertStorageKey(input.key);
  const expires = Number(input.expires);
  if (!Number.isInteger(expires) || expires * 1000 < Date.now()) {
    throw new AuthenticationError('Download link has expired');
  }

  const expected = signStorageDownload(input.secret, safeKey, expires);
  const actual = input.signature.trim().toLowerCase();
  if (!safeEqualHex(expected, actual)) {
    throw new AuthenticationError('Download link is invalid');
  }

  return safeKey;
}

export function contentTypeFromKey(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'json':
      return 'application/json';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function signStorageDownload(secret: string, key: string, expires: number): string {
  return createHmac('sha256', secret).update(`${key}\n${expires}`).digest('hex');
}

function clampExpiry(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new ValidationError('Invalid download expiry', [
      { path: 'expiresInSeconds', message: 'Expiry must be a positive number of seconds', code: 'custom' },
    ]);
  }

  return Math.min(Math.floor(seconds), STORAGE_DOWNLOAD_MAX_SECONDS);
}

function safeEqualHex(expected: string, actual: string): boolean {
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(actual, 'hex');
  if (left.length === 0 || left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
