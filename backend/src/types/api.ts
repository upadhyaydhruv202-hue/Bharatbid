export interface SuccessMeta {
  [key: string]: unknown;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: SuccessMeta;
}

export type ErrorDetails = Record<string, unknown> | unknown[];

export interface ErrorBody {
  code: string;
  message: string;
  details: ErrorDetails;
}

export interface ErrorResponse {
  success: false;
  error: ErrorBody;
  requestId: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
