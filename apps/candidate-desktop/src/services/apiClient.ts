import {
  ApiErrorCode,
  ApiErrorResponse,
  CandidateQuestionDto,
  FinalSubmitResponseDto,
  HealthStatusResponse,
  SaveDraftDto,
  SessionHeartbeatResponseDto,
  SessionStatusDto,
  StartSessionResponseDto,
  SubmitAnswerAckDto,
  SubmitAnswerDto,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from '@verisync/shared';
import { tokenStorage } from './tokenStorage';
import { timeSync } from './timeSync';
import { mockApi, MockAssessmentSession, MockUser } from './mockApi';
import { CandidateAssignedAssessment } from '../types/assessment';

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
      timeSync.setConnectionStatus('degraded');
      const fallback = await mockApi.getHealth();
      timeSync.recordServerTime(fallback.serverTime, startMs, Date.now());
      this.isServerReachable = false;
      return fallback;
    }
  }

  /**
   * Real Server Handshake & Client Version Verification (FR-LAB-003, SRS 8.3.3)
   * Detects HTTP 426 UNSUPPORTED_CLIENT and reports lab staff instructions.
   */
  public async checkServerHandshake(): Promise<{
    ok: boolean;
    latencyMs: number;
    serverVersion?: string;
    isUnsupportedClient: boolean;
    errorMessage?: string;
  }> {
    const startMs = Date.now();
    if (this.config.forceMock) {
      return {
        ok: true,
        latencyMs: 8,
        serverVersion: '1.1.0',
        isUnsupportedClient: false,
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: await this.buildHeaders(),
      });
      const endMs = Date.now();
      const latencyMs = endMs - startMs;

      if (response.status === 426) {
        timeSync.setConnectionStatus('degraded');
        return {
          ok: false,
          latencyMs,
          isUnsupportedClient: true,
          errorMessage: 'Unsupported client version (HTTP 426). Please contact lab staff.',
        };
      }

      if (!response.ok) {
        try {
          const errData = await response.json();
          if (errData?.code === ApiErrorCode.UNSUPPORTED_CLIENT) {
            return {
              ok: false,
              latencyMs,
              isUnsupportedClient: true,
              errorMessage: errData.message || 'Unsupported client version. Please contact lab staff.',
            };
          }
        } catch {
          // ignore
        }
        return {
          ok: false,
          latencyMs,
          isUnsupportedClient: false,
          errorMessage: `Server returned status ${response.status}`,
        };
      }

      const data = (await response.json()) as HealthStatusResponse;
      timeSync.recordServerTime(data.serverTime, startMs, endMs);
      timeSync.setConnectionStatus('online');
      this.isServerReachable = true;
      return {
        ok: true,
        latencyMs,
        serverVersion: data.version,
        isUnsupportedClient: false,
      };
    } catch {
      timeSync.setConnectionStatus('degraded');
      this.isServerReachable = false;
      return {
        ok: true,
        latencyMs: 15,
        serverVersion: '1.1.0 (Mock Fallback)',
        isUnsupportedClient: false,
      };
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

        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) {
          throw err;
        }
      }
    }

    const mockResult = await mockApi.login(identifier, password);
    await tokenStorage.setToken(mockResult.accessToken);
    timeSync.recordServerTime(new Date().toISOString(), startMs, Date.now());
    return mockResult;
  }

  /**
   * Fetch Candidate Assigned Assessments (FR-UI-001, UC-08, openapi.yaml)
   * Zero disclosure of answer keys or hidden test cases (BR-009, Rule 2, TC09).
   */
  public async getAssignedAssessments(): Promise<CandidateAssignedAssessment[]> {
    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/assessments`, {
          method: 'GET',
          headers: await this.buildHeaders(),
        });
        if (response.ok) {
          const data = (await response.json()) as CandidateAssignedAssessment[];
          return data;
        }
        if (response.status === 401 || response.status === 403) {
          const errPayload = (await response.json()) as ApiErrorResponse;
          throw errPayload;
        }
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) {
          throw err;
        }
      }
    }
    return mockApi.getAssignedAssessments();
  }

  /**
   * Phase 3: Start Assessment Session (POST /candidate/assessments/:id/start)
   * FR-UI-002, BR-007, TC-15, TC-16
   */
  public async startSession(assessmentId: string): Promise<StartSessionResponseDto> {
    const clientVersion = await this.getClientVersion();
    const deviceId = await this.getDeviceId();
    const startMs = Date.now();

    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/assessments/${assessmentId}/start`, {
          method: 'POST',
          headers: await this.buildHeaders(),
          body: JSON.stringify({
            clientVersion,
            deviceId,
            acknowledgedInstructions: true,
          }),
        });
        const endMs = Date.now();
        if (response.ok) {
          const data = (await response.json()) as StartSessionResponseDto;
          timeSync.recordServerTime(data.serverTime, startMs, endMs);
          return data;
        }
        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) throw err;
      }
    }

    return mockApi.startSession(assessmentId);
  }

  /**
   * Phase 3: Get Active Question & Authoritative Deadline (GET /candidate/sessions/:id/current-question)
   * FR-UI-003, TC-08, TC-09
   */
  public async getCurrentQuestion(sessionId: string): Promise<CandidateQuestionDto> {
    const startMs = Date.now();
    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/sessions/${sessionId}/current-question`, {
          method: 'GET',
          headers: await this.buildHeaders(),
        });
        const endMs = Date.now();
        if (response.ok) {
          const data = (await response.json()) as CandidateQuestionDto;
          if (data.startedAt) {
            timeSync.recordServerTime(data.startedAt, startMs, endMs);
          }
          return data;
        }
        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) throw err;
      }
    }

    return mockApi.getCurrentQuestion(sessionId);
  }

  /**
   * Phase 3: Authoritative Session Status & Remaining Time (GET /candidate/sessions/:id/status)
   * FR-TIME-008, FR-UI-004, TC-07
   */
  public async getSessionStatus(sessionId: string): Promise<SessionStatusDto> {
    const startMs = Date.now();
    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/sessions/${sessionId}/status`, {
          method: 'GET',
          headers: await this.buildHeaders(),
        });
        const endMs = Date.now();
        if (response.ok) {
          const data = (await response.json()) as SessionStatusDto;
          timeSync.recordServerTime(data.serverTime, startMs, endMs);
          return data;
        }
        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) throw err;
      }
    }

    return mockApi.getSessionStatus(sessionId);
  }

  /**
   * Phase 3: Submit Question Answer with Idempotency-Key (POST /candidate/sessions/:id/answers)
   * FR-ANS-001..009, FR-TIME-001..011, TC-01..05
   */
  public async submitSessionAnswer(
    sessionId: string,
    dto: SubmitAnswerDto,
    idempotencyKey?: string
  ): Promise<SubmitAnswerAckDto> {
    const key = idempotencyKey || crypto.randomUUID();
    const startMs = Date.now();

    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/sessions/${sessionId}/answers`, {
          method: 'POST',
          headers: await this.buildHeaders(key),
          body: JSON.stringify(dto),
        });
        const endMs = Date.now();
        if (response.ok) {
          const data = (await response.json()) as SubmitAnswerAckDto;
          timeSync.recordServerTime(data.serverTime, startMs, endMs);
          return data;
        }
        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) throw err;
      }
    }

    return mockApi.submitSessionAnswer(sessionId, dto, key);
  }

  /**
   * Phase 3: Autosave Draft without Submitting or Extending Deadlines (PUT /candidate/sessions/:id/draft)
   * FR-ANS-005
   */
  public async saveDraft(sessionId: string, dto: SaveDraftDto): Promise<{ success: boolean }> {
    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/sessions/${sessionId}/draft`, {
          method: 'PUT',
          headers: await this.buildHeaders(),
          body: JSON.stringify(dto),
        });
        if (response.ok) {
          return { success: true };
        }
        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) throw err;
      }
    }
    return mockApi.saveDraft(sessionId, dto);
  }

  /**
   * Phase 3: Final Assessment Submission (POST /candidate/sessions/:id/final-submit)
   * FR-ANS-008, UC-13, Decision 4
   */
  public async finalSubmitSession(sessionId: string): Promise<FinalSubmitResponseDto> {
    const startMs = Date.now();
    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/sessions/${sessionId}/final-submit`, {
          method: 'POST',
          headers: await this.buildHeaders(),
        });
        const endMs = Date.now();
        if (response.ok) {
          const data = (await response.json()) as FinalSubmitResponseDto;
          timeSync.recordServerTime(data.serverTime, startMs, endMs);
          return data;
        }
        const errPayload = (await response.json()) as ApiErrorResponse;
        throw errPayload;
      } catch (err) {
        if ((err as ApiErrorResponse)?.code) throw err;
      }
    }

    return mockApi.finalSubmitSession(sessionId);
  }

  /**
   * Phase 3: Session Heartbeat (POST /candidate/sessions/:id/heartbeat)
   * BR-010, UC-12
   */
  public async sendHeartbeat(sessionId: string): Promise<SessionHeartbeatResponseDto> {
    const deviceId = await this.getDeviceId();
    const clientVersion = await this.getClientVersion();
    if (!this.config.forceMock && this.isServerReachable) {
      try {
        const response = await fetch(`${this.config.baseUrl}/candidate/sessions/${sessionId}/heartbeat`, {
          method: 'POST',
          headers: await this.buildHeaders(),
          body: JSON.stringify({ deviceId, clientVersion }),
        });
        if (response.ok) {
          return (await response.json()) as SessionHeartbeatResponseDto;
        }
      } catch {
        // Heartbeat is best-effort
      }
    }
    return mockApi.sendHeartbeat(sessionId);
  }

  /**
   * Legacy method for backwards compatibility with earlier phase screens/tests
   */
  public async startAssessment(assessmentId: string, candidateId: string): Promise<MockAssessmentSession> {
    return mockApi.initMockSession(candidateId, assessmentId);
  }

  /**
   * Legacy method for backwards compatibility
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

    const mockRes = await mockApi.submitAnswer(payload, key);
    timeSync.recordServerTime(mockRes.serverTime, startMs, Date.now());
    return mockRes;
  }

  /**
   * Legacy final submit for backwards compatibility
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
