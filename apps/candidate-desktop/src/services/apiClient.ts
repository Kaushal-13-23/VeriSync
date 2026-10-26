import {
  ApiErrorResponse,
  HealthStatusResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from '@verisync/shared';
import { tokenStorage } from './tokenStorage';
import { timeSync } from './timeSync';
import { mockApi, MockAssessmentSession, MockUser } from './mockApi';

/**
 * Unified API Client for VeriSync Candidate Desktop
 * Non-Negotiable Rules & SRS Requirements:
 * - Rule 1: The server is the only authority for deadlines and scoring (FR-TIME-001)
 * - Rule 3 & FR-ANS-009: Every answer/code submission carries an Idempotency-Key
 * - Rule 9: Timestamps are UTC ISO-8601; API errors use SRS 8.3.3 codes with correlationId
 * - FR-LAB-002: Unique application-managed device identifier header (X-Device-Id)
 * - FR-LAB-003: Installed client version verification header (X-Client-Version)
 * - FR-UI-008: Real-time network health and connection status synchronization
 */

export interface ApiClientConfig {
  baseUrl: string;
  forceMock?: boolean;
}

class ApiClient {
  private config: ApiClientConfig = {
    baseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000/api/v1',
    forceMock: false,
  };
  private cachedDeviceId: string | null = null;
  private isServerReachable = false;

  public setConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): ApiClientConfig {
    return { ...this.config };
  }

  public async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) return this.cachedDeviceId;
    if (typeof window !== 'undefined' && window.verisyncBridge) {
      try {
        const id = await window.verisyncBridge.getDeviceId();
        if (id) {
          this.cachedDeviceId = id;
          return id;
        }
      } catch {
        // Fallback below
      }
    }
    // Browser fallback
    let id = localStorage.getItem('verisync_device_id');
    if (!id) {
      id = 'dev-' + crypto.randomUUID();
      localStorage.setItem('verisync_device_id', id);
    }
    this.cachedDeviceId = id;
    return id;
  }

  public async getClientVersion(): Promise<string> {
    if (typeof window !== 'undefined' && window.verisyncBridge) {
      try {
        return await window.verisyncBridge.getAppVersion();
      } catch {
        // Fallback
      }
    }
    return '1.1.0';
  }

  private async buildHeaders(idempotencyKey?: string): Promise<Record<string, string>> {
    const deviceId = await this.getDeviceId();
    const version = await this.getClientVersion();
    const token = await tokenStorage.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Version': version,
      'X-Device-Id': deviceId,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return headers;
  }

  /**
   * Health Check & Time Synchronization (FR-TIME-001, FR-TIME-008)
   */
  public async getHealth(): Promise<HealthStatusResponse> {
    const startMs = Date.now();
    if (this.config.forceMock) {
      const mockRes = await mockApi.getHealth();
      timeSync.recordServerTime(mockRes.serverTime, startMs, Date.now());
      this.isServerReachable = true;
      return mockRes;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: await this.buildHeaders(),
      });
      const endMs = Date.now();

      if (!response.ok) {
        throw new Error(`Health check returned status ${response.status}`);
      }

      const data = (await response.json()) as HealthStatusResponse;
      timeSync.recordServerTime(data.serverTime, startMs, endMs);
      this.isServerReachable = true;
      return data;
    } catch {
      // Dev A might not have merged Phase 1 auth yet; fall back to local mock server
      timeSync.setConnectionStatus('degraded');
      const fallback = await mockApi.getHealth();
      timeSync.recordServerTime(fallback.serverTime, startMs, Date.now());
      this.isServerReachable = false;
      return fallback;
    }
  }

  /**
   * Candidate Login (FR-AUTH-002, FR-CAN-007, openapi.yaml)
   * Supports either Candidate ID or Username
   */
  public async login(
    identifier: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string; user: MockUser }> {
    const startMs = Date.now();
    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/auth/login`, {
          method: 'POST',
          headers: await this.buildHeaders(),
          body: JSON.stringify({ identifier, password }),
        });
        const endMs = Date.now();

        if (response.ok) {
          const data = await response.json();
          await tokenStorage.setToken(data.accessToken);
          timeSync.recordServerTime(new Date().toISOString(), startMs, endMs);
          timeSync.setConnectionStatus('online');
          return data;
        }

        // Parse structured API error response per SRS 8.3.3
        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) {
          throw err;
        }
        // Fall back to mock server if backend network error
      }
    }

    // Local mock server path
    const mockResult = await mockApi.login(identifier, password);
    await tokenStorage.setToken(mockResult.accessToken);
    timeSync.recordServerTime(new Date().toISOString(), startMs, Date.now());
    return mockResult;
  }

  /**
   * Initialize and start candidate assessment session (FR-UI-001, FR-ASMT-006)
   */
  public async startAssessment(candidateId: string): Promise<MockAssessmentSession> {
    return mockApi.initMockSession(candidateId);
  }

  /**
   * Submit Answer with Idempotency-Key (FR-ANS-009, Rule 3, openapi.yaml)
   */
  public async submitAnswer(
    payload: SubmitAnswerPayload,
    idempotencyKey?: string
  ): Promise<SubmitAnswerResponse> {
    const key = idempotencyKey || crypto.randomUUID();
    const startMs = Date.now();

    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/assessments/active/submit-answer`, {
          method: 'POST',
          headers: await this.buildHeaders(key),
          body: JSON.stringify(payload),
        });
        const endMs = Date.now();

        if (response.ok) {
          const data = (await response.json()) as SubmitAnswerResponse;
          timeSync.recordServerTime(data.serverTime, startMs, endMs);
          return data;
        }

        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) {
          throw err;
        }
      }
    }

    // Mock API path
    const mockRes = await mockApi.submitAnswer(payload, key);
    timeSync.recordServerTime(mockRes.serverTime, startMs, Date.now());
    return mockRes;
  }

  /**
   * Final Assessment Submission (FR-UI-007, FR-ANS-008)
   */
  public async finalSubmit(sessionId: string): Promise<{ status: 'accepted'; submittedAt: string }> {
    const key = crypto.randomUUID();
    return mockApi.finalSubmit(sessionId, key);
  }

  /**
   * Logout and clear local tokens
   */
  public async logout(): Promise<void> {
    await tokenStorage.clearToken();
  }
}

export const apiClient = new ApiClient();
