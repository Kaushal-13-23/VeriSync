import { describe, it, expect } from 'vitest';
import { ApiErrorCode, ApiErrorCodeHttpStatus } from '../src/errors';

describe('SRS 8.3.3 Standard API Error Codes', () => {
  it('should define all 10 error codes specified in SRS Section 8.3.3', () => {
    const expectedCodes = [
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_ELIGIBLE',
      'INVALID_STATE',
      'QUESTION_EXPIRED',
      'DUPLICATE_REQUEST',
      'UNSUPPORTED_CLIENT',
      'RATE_LIMITED',
      'VALIDATION_FAILED',
      'INTERNAL_ERROR',
    ];

    const actualCodes = Object.values(ApiErrorCode);
    expect(actualCodes.sort()).toEqual(expectedCodes.sort());
  });

  it('should map each error code to its authoritative HTTP status', () => {
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.UNAUTHENTICATED]).toBe(401);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.FORBIDDEN]).toBe(403);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.NOT_ELIGIBLE]).toBe(403);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.INVALID_STATE]).toBe(409);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.QUESTION_EXPIRED]).toBe(409);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.DUPLICATE_REQUEST]).toBe(200);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.UNSUPPORTED_CLIENT]).toBe(426);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.RATE_LIMITED]).toBe(429);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.VALIDATION_FAILED]).toBe(422);
    expect(ApiErrorCodeHttpStatus[ApiErrorCode.INTERNAL_ERROR]).toBe(500);
  });
});
