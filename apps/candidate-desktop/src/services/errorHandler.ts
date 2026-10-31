/**
 * Central Error Handler for VeriSync Candidate Desktop
 * Non-Negotiable Rules & SRS Requirements:
 * - SRS 8.3.3: Standard Error Codes (UNAUTHENTICATED, FORBIDDEN, NOT_ELIGIBLE, INVALID_STATE,
 *   QUESTION_EXPIRED, DUPLICATE_REQUEST, UNSUPPORTED_CLIENT, RATE_LIMITED, VALIDATION_FAILED, INTERNAL_ERROR)
 * - Rule 9: Timestamps are UTC ISO-8601 with correlationId
 * - NFR-USE-003: Transparent, candidate-friendly error messaging
 */

import { ApiErrorCode, ApiErrorResponse } from '@verisync/shared';
import { logger } from './logger';

export interface UserFacingError {
  code: ApiErrorCode;
  title: string;
  message: string;
  actionHint: string;
  correlationId?: string;
  isFatal?: boolean;
}

export const ERROR_MAPPINGS: Record<
  ApiErrorCode,
  { title: string; defaultMessage: string; actionHint: string; isFatal?: boolean }
> = {
  [ApiErrorCode.UNAUTHENTICATED]: {
    title: 'Authentication Required',
    defaultMessage: 'Your session has expired or is invalid. Please sign in again.',
    actionHint: 'Return to login screen and sign in with your credentials.',
    isFatal: true,
  },
  [ApiErrorCode.FORBIDDEN]: {
    title: 'Access Denied',
    defaultMessage: 'You do not have permission to access this assessment or resource.',
    actionHint: 'Please verify your assigned assessments or speak with your test administrator.',
    isFatal: false,
  },
  [ApiErrorCode.NOT_ELIGIBLE]: {
    title: 'Assessment Ineligible',
    defaultMessage: 'You are not eligible to take this assessment at this time.',
    actionHint:
      'The assessment window may not have opened yet, has expired, or maximum attempts have been reached.',
    isFatal: false,
  },
  [ApiErrorCode.INVALID_STATE]: {
    title: 'Invalid Exam State',
    defaultMessage: 'The requested action is not valid for the current assessment state.',
    actionHint: 'The question or assessment state may have changed. Please refresh your session.',
    isFatal: false,
  },
  [ApiErrorCode.QUESTION_EXPIRED]: {
    title: 'Question Time Expired',
    defaultMessage: 'The time limit for this question has passed before submission was received.',
    actionHint: 'Your answer state has been recorded. Advancing to the next question.',
    isFatal: false,
  },
  [ApiErrorCode.DUPLICATE_REQUEST]: {
    title: 'Request Already Processed',
    defaultMessage: 'This submission was already processed by the server.',
    actionHint: 'Your response was successfully recorded with no duplicate submissions created.',
    isFatal: false,
  },
  [ApiErrorCode.UNSUPPORTED_CLIENT]: {
    title: 'Unsupported Client Version (HTTP 426)',
    defaultMessage:
      'This computer is running an outdated or unapproved version of the VeriSync client.',
    actionHint: 'Please contact lab staff immediately to update this machine before proceeding.',
    isFatal: true,
  },
  [ApiErrorCode.RATE_LIMITED]: {
    title: 'Rate Limit Exceeded',
    defaultMessage: 'Too many requests were sent in a short period.',
    actionHint: 'Please wait a few moments before trying again.',
    isFatal: false,
  },
  [ApiErrorCode.VALIDATION_FAILED]: {
    title: 'Submission Validation Failed',
    defaultMessage: 'The submitted answer data failed format validation.',
    actionHint: 'Please check your inputs and try submitting again.',
    isFatal: false,
  },
  [ApiErrorCode.INTERNAL_ERROR]: {
    title: 'Server Error (500)',
    defaultMessage: 'An internal server error occurred while processing your request.',
    actionHint: 'Please notify lab staff with the correlation ID shown below.',
    isFatal: false,
  },
};

export function containsInternalDetails(text: string): boolean {
  const internalPatterns = [
    /\bat\s+[A-Za-z0-9_$.<>]+\s+\(/i, // Stack trace frame (at Method (file:...))
    /(\/|\\)[A-Za-z0-9_.-]+(\/|\\)[A-Za-z0-9_.-]+/i, // File system path
    /\b(prisma|pg_|postgres|sqlite|foreign key|syntax error)\b/i, // Database internals
    /\b(econnrefused|etimedout|enotfound|econnreset)\b/i, // Network internals
    /\b(127\.0\.0\.1|localhost|::1|\.internal)\b/i, // Internal network hosts
  ];
  return internalPatterns.some((pattern) => pattern.test(text));
}

export function sanitizeUserFacingMessage(rawMessage: string, defaultMessage: string): string {
  if (!rawMessage || containsInternalDetails(rawMessage)) {
    return defaultMessage;
  }
  return rawMessage;
}

export function handleApiError(error: unknown): UserFacingError {
  let apiError: ApiErrorResponse | null = null;

  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    apiError = error as ApiErrorResponse;
  }

  const code: ApiErrorCode = apiError?.code || ApiErrorCode.INTERNAL_ERROR;
  const mapping = ERROR_MAPPINGS[code] || ERROR_MAPPINGS[ApiErrorCode.INTERNAL_ERROR];
  const correlationId =
    apiError?.correlationId || (error as { correlationId?: string })?.correlationId;
  const rawMessage = apiError?.message || (error as Error)?.message || mapping.defaultMessage;
  const userSafeMessage = sanitizeUserFacingMessage(rawMessage, mapping.defaultMessage);

  const result: UserFacingError = {
    code,
    title: mapping.title,
    message: userSafeMessage,
    actionHint: mapping.actionHint,
    correlationId,
    isFatal: mapping.isFatal ?? false,
  };

  // Structured logging with correlation ID and secret scrubbing (NFR-REL-005, Rule 5, Rule 9)
  void logger.error(`API Error [${code}]: ${rawMessage}`, correlationId, {
    code,
    title: mapping.title,
    rawMessage,
    isFatal: result.isFatal,
  });

  return result;
}
