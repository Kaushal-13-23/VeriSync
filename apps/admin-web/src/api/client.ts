/**
 * VeriSync Authoritative API Client
 * Traceability: FR-AUTH-001, FR-AUTH-007, FR-AUTH-008, FR-ADMIN-001, SRS 8.3.3, Rule 1, Rule 9
 */

import { ApiErrorCode, ApiErrorResponse, LoginApiResponse, TokenPairResponse, DashboardStats, HealthStatusResponse } from '../types/api';
import { showApiErrorToast } from '../lib/toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  public code: ApiErrorCode;
  public httpStatus: number;
  public correlationId: string;
  public details?: unknown;

  constructor(payload: {
    message?: string;
    code?: ApiErrorCode | string;
    httpStatus?: number;
    correlationId?: string;
    details?: unknown;
  }) {
    super(payload.message || 'API request failed');
    this.name = 'ApiError';
    this.code = (payload.code as ApiErrorCode) || ApiErrorCode.INTERNAL_ERROR;
    this.httpStatus = payload.httpStatus || 500;
    this.correlationId = payload.correlationId || `err-${Date.now().toString(36)}`;
    this.details = payload.details;
  }
}

// Token getter / setter callbacks to avoid circular dependencies with auth store
let getAccessTokenFn: () => string | null = () => null;
let getRefreshTokenFn: () => string | null = () => null;
let onTokenRotatedFn: (pair: TokenPairResponse) => void = () => {};
let onAuthFailedFn: () => void = () => {};

export function configureAuthClient(callbacks: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokenRotated: (pair: TokenPairResponse) => void;
  onAuthFailed: () => void;
}) {
  getAccessTokenFn = callbacks.getAccessToken;
  getRefreshTokenFn = callbacks.getRefreshToken;
  onTokenRotatedFn = callbacks.onTokenRotated;
  onAuthFailedFn = callbacks.onAuthFailed;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Low-level authoritative fetch wrapper
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean; silentError?: boolean } = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessTokenFn();
  if (token && !options.skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr) {
    const error = new ApiError({
      httpStatus: 0,
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'Network connection failed. Unable to reach server.',
      correlationId: `net-${Date.now().toString(36)}`,
    });
    if (!options.silentError) showApiErrorToast(error);
    throw error;
  }

  // Handle 401 Unauthorized with automatic token refresh (FR-AUTH-007)
  if (response.status === 401 && !options.skipAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = getRefreshTokenFn();
    if (!refreshToken) {
      onAuthFailedFn();
      const err = await parseErrorResponse(response);
      if (!options.silentError) showApiErrorToast(err);
      throw err;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) {
          throw new Error('Refresh token invalid or expired');
        }

        const newTokens: TokenPairResponse = await refreshRes.json();
        onTokenRotatedFn(newTokens);
        isRefreshing = false;
        onRefreshed(newTokens.accessToken);

        // Retry original request with new token
        headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
        const retryRes = await fetch(url, { ...options, headers });
        if (!retryRes.ok) {
          const err = await parseErrorResponse(retryRes);
          if (!options.silentError) showApiErrorToast(err);
          throw err;
        }
        return retryRes.json();
      } catch (refreshErr) {
        isRefreshing = false;
        onRefreshed(null);
        onAuthFailedFn();
        const error = new ApiError({
          httpStatus: 401,
          code: ApiErrorCode.UNAUTHENTICATED,
          message: 'Your session has expired. Please log in again.',
          correlationId: `ref-${Date.now().toString(36)}`,
        });
        if (!options.silentError) showApiErrorToast(error);
        throw error;
      }
    }

    // Wait for the ongoing refresh to finish
    return new Promise<T>((resolve, reject) => {
      subscribeTokenRefresh((newToken) => {
        if (!newToken) {
          reject(
            new ApiError({
              httpStatus: 401,
              code: ApiErrorCode.UNAUTHENTICATED,
              message: 'Session refresh failed.',
              correlationId: `ref-${Date.now().toString(36)}`,
            })
          );
          return;
        }
        headers.set('Authorization', `Bearer ${newToken}`);
        fetch(url, { ...options, headers })
          .then((res) => {
            if (!res.ok) {
              return parseErrorResponse(res).then((err) => {
                if (!options.silentError) showApiErrorToast(err);
                reject(err);
              });
            }
            return res.json().then(resolve);
          })
          .catch(reject);
      });
    });
  }

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    if (!options.silentError) showApiErrorToast(error);
    throw error;
  }

  // Handle 204 or empty response
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let json: Partial<ApiErrorResponse> = {};
  try {
    json = await response.json();
  } catch {
    // If not JSON, use default fallback
  }

  const correlationId =
    json.correlationId || response.headers.get('x-correlation-id') || `cid-${Date.now().toString(36)}`;

  return new ApiError({
    httpStatus: response.status,
    code: (json.code as ApiErrorCode) || mapStatusToErrorCode(response.status),
    message: json.message || response.statusText || 'Request failed',
    correlationId,
    details: json.details,
  });
}

function mapStatusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return ApiErrorCode.UNAUTHENTICATED;
    case 403:
      return ApiErrorCode.FORBIDDEN;
    case 409:
      return ApiErrorCode.INVALID_STATE;
    case 422:
      return ApiErrorCode.VALIDATION_FAILED;
    case 426:
      return ApiErrorCode.UNSUPPORTED_CLIENT;
    case 429:
      return ApiErrorCode.RATE_LIMITED;
    default:
      return ApiErrorCode.INTERNAL_ERROR;
  }
}

/**
 * Strongly-typed API Services matching packages/shared/openapi.yaml
 */
export const authApi = {
  login: (payload: { identifier: string; password: string }) =>
    apiFetch<LoginApiResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
      silentError: true, // caller handles inline form errors
    }),

  verifyMfa: (payload: { mfaToken: string; code: string }) =>
    apiFetch<TokenPairResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
      silentError: true,
    }),

  refreshToken: (payload: { refreshToken: string }) =>
    apiFetch<TokenPairResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  logout: () =>
    apiFetch<{ success: boolean; message?: string }>('/auth/logout', {
      method: 'POST',
    }),
};

export const dashboardApi = {
  getStats: () => apiFetch<DashboardStats>('/admin/dashboard-stats'),
};

export const systemApi = {
  getHealth: () => apiFetch<HealthStatusResponse>('/health', { skipAuth: true }),
};
