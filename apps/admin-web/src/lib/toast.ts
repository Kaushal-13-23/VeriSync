/**
 * VeriSync Toast Notification & SRS 8.3.3 Error Code Mapper
 * Traceability: SRS 8.3.3, NFR-USE-003, Rule 9 (Correlation IDs)
 */

import { ApiErrorCode } from '../types/api';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  correlationId?: string;
  durationMs?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.toasts]));
  }

  show(toast: Omit<ToastItem, 'id'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.notify();

    const duration = toast.durationMs ?? (toast.type === 'error' ? 6000 : 4000);
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toastManager = new ToastManager();

/**
 * Mapping of SRS 8.3.3 Error Codes to Human-Friendly Explanations
 */
export const SRS_ERROR_MESSAGES: Record<ApiErrorCode, { title: string; defaultMessage: string }> = {
  [ApiErrorCode.UNAUTHENTICATED]: {
    title: 'Authentication Required',
    defaultMessage: 'Your session has expired or credentials are invalid. Please sign in again.',
  },
  [ApiErrorCode.FORBIDDEN]: {
    title: 'Access Denied',
    defaultMessage: 'You do not have administrative permissions to perform this action.',
  },
  [ApiErrorCode.NOT_ELIGIBLE]: {
    title: 'Not Eligible',
    defaultMessage: 'The account or assessment schedule is not eligible for this request.',
  },
  [ApiErrorCode.INVALID_STATE]: {
    title: 'Invalid State Transition',
    defaultMessage: 'This operation is not permitted in the current state of the resource.',
  },
  [ApiErrorCode.QUESTION_EXPIRED]: {
    title: 'Question Expired',
    defaultMessage: 'The server-authoritative deadline for this question has elapsed.',
  },
  [ApiErrorCode.DUPLICATE_REQUEST]: {
    title: 'Duplicate Request',
    defaultMessage: 'An identical request has already been processed (Idempotency key matched).',
  },
  [ApiErrorCode.UNSUPPORTED_CLIENT]: {
    title: 'Unsupported Client',
    defaultMessage: 'Your client version is outdated or unsupported. Please upgrade.',
  },
  [ApiErrorCode.RATE_LIMITED]: {
    title: 'Rate Limit Exceeded',
    defaultMessage: 'Too many requests received. Please wait a moment before trying again.',
  },
  [ApiErrorCode.VALIDATION_FAILED]: {
    title: 'Validation Failed',
    defaultMessage: 'The submitted data is invalid. Please review input fields.',
  },
  [ApiErrorCode.INTERNAL_ERROR]: {
    title: 'System Error',
    defaultMessage:
      'An internal server error occurred. Please quote the correlation ID to support.',
  },
};

export function showApiErrorToast(error: {
  code?: ApiErrorCode | string;
  message?: string;
  correlationId?: string;
  status?: string | number;
}) {
  const code = (error.code as ApiErrorCode) || ApiErrorCode.INTERNAL_ERROR;
  const config = SRS_ERROR_MESSAGES[code] || {
    title: 'Request Failed',
    defaultMessage: 'An unexpected error occurred.',
  };

  toastManager.show({
    type: 'error',
    title: config.title,
    message: error.message || config.defaultMessage,
    correlationId: error.correlationId,
    durationMs: 7000,
  });
}

export function showSuccessToast(title: string, message: string, correlationId?: string) {
  toastManager.show({
    type: 'success',
    title,
    message,
    correlationId,
  });
}

export function showErrorToast(title: string, message: string, correlationId?: string) {
  toastManager.show({
    type: 'error',
    title,
    message,
    correlationId,
  });
}
