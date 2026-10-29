import { describe, it, expect } from 'vitest';
import { ApiErrorCode } from '@verisync/shared';
import { handleApiError, ERROR_MAPPINGS } from './errorHandler';

describe('Central Error Handler (SRS 8.3.3, NFR-USE-003, Rule 9)', () => {
  const all10Codes: ApiErrorCode[] = [
    ApiErrorCode.UNAUTHENTICATED,
    ApiErrorCode.FORBIDDEN,
    ApiErrorCode.NOT_ELIGIBLE,
    ApiErrorCode.INVALID_STATE,
    ApiErrorCode.QUESTION_EXPIRED,
    ApiErrorCode.DUPLICATE_REQUEST,
    ApiErrorCode.UNSUPPORTED_CLIENT,
    ApiErrorCode.RATE_LIMITED,
    ApiErrorCode.VALIDATION_FAILED,
    ApiErrorCode.INTERNAL_ERROR,
  ];

  it('contains mapping for every SRS 8.3.3 error code', () => {
    for (const code of all10Codes) {
      expect(ERROR_MAPPINGS[code]).toBeDefined();
      expect(ERROR_MAPPINGS[code].title).toBeTruthy();
      expect(ERROR_MAPPINGS[code].defaultMessage).toBeTruthy();
      expect(ERROR_MAPPINGS[code].actionHint).toBeTruthy();
    }
  });

  it('handles UNSUPPORTED_CLIENT (426) with explicit lab staff instruction', () => {
    const error = {
      code: ApiErrorCode.UNSUPPORTED_CLIENT,
      message: 'Outdated client rejected',
      correlationId: 'c-test-426',
    };

    const result = handleApiError(error);

    expect(result.code).toBe(ApiErrorCode.UNSUPPORTED_CLIENT);
    expect(result.isFatal).toBe(true);
    expect(result.actionHint.toLowerCase()).toContain('contact lab staff');
    expect(result.correlationId).toBe('c-test-426');
  });

  it('handles QUESTION_EXPIRED (409) with transition instruction', () => {
    const error = {
      code: ApiErrorCode.QUESTION_EXPIRED,
      message: 'Question deadline exceeded',
      correlationId: 'c-test-409',
    };

    const result = handleApiError(error);

    expect(result.code).toBe(ApiErrorCode.QUESTION_EXPIRED);
    expect(result.actionHint).toContain('Advancing to the next question');
  });

  it('handles generic errors by falling back to INTERNAL_ERROR (500)', () => {
    const genericErr = new Error('Unexpected crash');
    const result = handleApiError(genericErr);

    expect(result.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    expect(result.message).toBe('Unexpected crash');
  });

  // NFR-REL-005: User-facing messages never expose internals
  it('strips internal stack traces and technical paths from user-facing error message (NFR-REL-005)', () => {
    const internalErr = new Error(
      'TypeError: Cannot read property "id" of null\n    at SessionsController.submit (C:\\VeriSync\\apps\\api\\src\\sessions.ts:42:12)'
    );
    Object.assign(internalErr, { correlationId: 'c-stack-trace-001' });

    const result = handleApiError(internalErr);

    expect(result.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    // User message must NOT contain stack trace or internal paths
    expect(result.message).not.toContain('at SessionsController');
    expect(result.message).not.toContain('C:\\VeriSync');
    expect(result.message).toBe(ERROR_MAPPINGS[ApiErrorCode.INTERNAL_ERROR].defaultMessage);
    expect(result.correlationId).toBe('c-stack-trace-001');
  });

  it('strips database internals and network hostnames from user-facing error message (NFR-REL-005)', () => {
    const dbErr = new Error('PrismaClientKnownRequestError: connect ECONNREFUSED 127.0.0.1:5432');
    Object.assign(dbErr, { correlationId: 'c-db-refused-002' });

    const result = handleApiError(dbErr);

    expect(result.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    expect(result.message).not.toContain('ECONNREFUSED');
    expect(result.message).not.toContain('127.0.0.1');
    expect(result.message).toBe(ERROR_MAPPINGS[ApiErrorCode.INTERNAL_ERROR].defaultMessage);
    expect(result.correlationId).toBe('c-db-refused-002');
  });
});

