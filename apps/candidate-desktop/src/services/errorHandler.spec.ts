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
});
