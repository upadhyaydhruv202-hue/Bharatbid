import type { Response } from 'express';

import type { ErrorDetails, ErrorResponse, SuccessMeta, SuccessResponse } from '../types/api';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta: SuccessMeta = {},
): Response<SuccessResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
  });
}

export function sendError(
  res: Response,
  options: {
    statusCode?: number;
    code: string;
    message: string;
    details?: ErrorDetails;
    requestId: string;
  },
): Response<ErrorResponse> {
  return res.status(options.statusCode ?? 500).json({
    success: false,
    error: {
      code: options.code,
      message: options.message,
      details: options.details ?? {},
    },
    requestId: options.requestId,
  });
}
