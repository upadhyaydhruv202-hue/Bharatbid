import { createContext, createElement, useContext, type ReactNode } from 'react';

import type { ApiResponse } from '../types/api';

const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly body?: ApiResponse<unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  query?: Record<string, QueryValue>;
  idempotencyKey?: string;
}

export interface ApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | undefined | Promise<string | undefined>;
  fetchImpl?: typeof fetch;
}

export interface ApiSuccess<T> {
  data: T;
  meta: Record<string, unknown>;
}

export function joinApiPath(path: string, query?: Record<string, QueryValue>): string {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
}

export function getApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  async function requestEnvelope<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiSuccess<T>> {
    const token = options.token ?? (await config.getToken?.());
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const url = `${baseUrl}${joinApiPath(path, options.query)}`;
    const fetchImpl = config.fetchImpl ?? globalThis.fetch;
    const response = await fetchImpl(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    let body: ApiResponse<T> | undefined;
    try {
      body = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new ApiClientError(`Request failed: ${response.status}`, response.status);
    }

    if (!response.ok || !body || !body.success) {
      const message = body && !body.success ? body.error.message : `Request failed: ${response.status}`;
      throw new ApiClientError(message, response.status, body);
    }

    return { data: body.data, meta: body.meta ?? {} };
  }

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const result = await requestEnvelope<T>(path, options);
    return result.data;
  }

  return {
    request,
    requestEnvelope,
    get: <T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient();

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return api.get<T>(path, { token });
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return api.request<T>(path, options);
}

export async function apiGetWithMeta<T>(
  path: string,
  token?: string,
  query?: Record<string, QueryValue>,
): Promise<ApiSuccess<T>> {
  return api.requestEnvelope<T>(path, { method: 'GET', token, query });
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token?: string,
  method = 'POST',
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  let body: ApiResponse<T> | undefined;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(`Request failed: ${response.status}`, response.status);
  }

  if (!response.ok || !body || !body.success) {
    const message = body && !body.success ? body.error.message : `Request failed: ${response.status}`;
    throw new ApiClientError(message, response.status, body);
  }

  return body.data;
}

export async function apiDownloadBlob(
  path: string,
  token?: string,
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as ApiResponse<unknown>;
      if (body && !body.success) {
        message = body.error.message;
      }
    } catch {
      // Binary error body; keep the status message.
    }
    throw new ApiClientError(message, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filenameMatch = /filename="([^"]+)"/.exec(disposition);
  return {
    blob,
    filename: filenameMatch?.[1] ?? 'document',
    mimeType: response.headers.get('Content-Type') ?? blob.type,
  };
}

const ApiClientContext = createContext<ApiClient>(api);

export function ApiClientProvider({ client, children }: { client?: ApiClient; children: ReactNode }) {
  return createElement(ApiClientContext.Provider, { value: client ?? api }, children);
}

export function useApiClient(): ApiClient {
  return useContext(ApiClientContext);
}
