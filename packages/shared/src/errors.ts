/**
 * VeriSync Standard API Error Codes
 * Source: docs/SRS/srs.md (Section 8.3.3 Standard Error Codes)
 */
export enum ApiErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  INVALID_STATE = 'INVALID_STATE',
  QUESTION_EXPIRED = 'QUESTION_EXPIRED',
  DUPLICATE_REQUEST = 'DUPLICATE_REQUEST',
  UNSUPPORTED_CLIENT = 'UNSUPPORTED_CLIENT',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * HTTP Status Mapping for SRS 8.3.3 Error Codes
 */
export const ApiErrorCodeHttpStatus: Record<ApiErrorCode, number> = {
  [ApiErrorCode.UNAUTHENTICATED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_ELIGIBLE]: 403,
  [ApiErrorCode.INVALID_STATE]: 409,
  [ApiErrorCode.QUESTION_EXPIRED]: 409,
  [ApiErrorCode.DUPLICATE_REQUEST]: 200,
  [ApiErrorCode.UNSUPPORTED_CLIENT]: 426,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.VALIDATION_FAILED]: 422,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * Standard Error Response Payload (SRS 8.3.1 / 8.3.3 / Non-Negotiable Rule 9)
 */
export interface ApiErrorResponse {
  status: 'rejected' | 'error';
  code: ApiErrorCode;
  message: string;
  correlationId: string;
  details?: Record<string, unknown> | Array<unknown>;
}
