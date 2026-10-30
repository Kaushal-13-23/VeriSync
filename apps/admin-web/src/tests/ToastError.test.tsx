/**
 * Vitest Toast Error & SRS 8.3.3 Error Mapping Tests
 * Traceability: SRS 8.3.3, Rule 9 (Correlation IDs), NFR-USE-003
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { toastManager, showApiErrorToast } from '../lib/toast';
import { ApiErrorCode } from '../types/api';

describe('SRS 8.3.3 Error Mapping & Toast Manager', () => {
  beforeEach(() => {
    toastManager.clear();
  });

  it('[SRS 8.3.3, Rule 9] maps UNAUTHENTICATED error code with correlation ID', () => {
    let capturedToasts: unknown[] = [];
    toastManager.subscribe((toasts) => {
      capturedToasts = toasts;
    });

    showApiErrorToast({
      code: ApiErrorCode.UNAUTHENTICATED,
      message: 'Session has expired.',
      correlationId: 'cid-auth-001',
    });

    expect(capturedToasts.length).toBe(1);
    const toast = capturedToasts[0] as {
      type: string;
      title: string;
      message: string;
      correlationId: string;
    };
    expect(toast.type).toBe('error');
    expect(toast.title).toBe('Authentication Required');
    expect(toast.message).toBe('Session has expired.');
    expect(toast.correlationId).toBe('cid-auth-001');
  });

  it('[SRS 8.3.3] maps QUESTION_EXPIRED and RATE_LIMITED error codes', () => {
    let capturedToasts: unknown[] = [];
    toastManager.subscribe((toasts) => {
      capturedToasts = toasts;
    });

    showApiErrorToast({
      code: ApiErrorCode.QUESTION_EXPIRED,
      correlationId: 'cid-q-exp-42',
    });

    showApiErrorToast({
      code: ApiErrorCode.RATE_LIMITED,
      correlationId: 'cid-rate-99',
    });

    expect(capturedToasts.length).toBe(2);
    const first = capturedToasts[0] as { title: string; correlationId: string };
    const second = capturedToasts[1] as { title: string; correlationId: string };

    expect(first.title).toBe('Question Expired');
    expect(first.correlationId).toBe('cid-q-exp-42');
    expect(second.title).toBe('Rate Limit Exceeded');
    expect(second.correlationId).toBe('cid-rate-99');
  });
});
