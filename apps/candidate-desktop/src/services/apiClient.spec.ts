import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from './apiClient';
import { mockApi } from './mockApi';
import { ApiErrorCode, SessionState } from '@verisync/shared';

/**
 * API Client & Mock Server Tests
 * SRS Requirements:
 * - FR-TIME-001: Backend authoritative server time sync (UTC ISO-8601)
 * - FR-ANS-009: Mandatory client-generated Idempotency-Key on submissions
 * - Non-Negotiable Rule 3: Repeats return the original result and create no duplicates
 * - FR-LAB-002: Unique application-managed device identifier persistence
 * - FR-LAB-003: Client version handshake verification
 * - SRS 8.3.3: Standard error codes and correlation ID validation
 * - Phase 3 APIs: startSession, getCurrentQuestion, getSessionStatus, submitSessionAnswer, finalSubmitSession
 */

describe('apiClient & mockApi (FR-TIME-001, FR-ANS-009, FR-LAB-002, Rule 3, SRS 8.3.3)', () => {
  beforeEach(() => {
    mockApi.resetStore();
    apiClient.setConfig({ forceMock: true });
  });

  it('FR-TIME-001: getHealth returns operational status and valid UTC ISO-8601 timestamp', async () => {
    const health = await apiClient.getHealth();
    expect(health.status).toBe('ok');
    expect(health.version).toBe('1.1.0');
    expect(new Date(health.serverTime).toISOString()).toBe(health.serverTime);
  });

  it('FR-LAB-002: getDeviceId returns a persistent UUID identifier', async () => {
    const id1 = await apiClient.getDeviceId();
    const id2 = await apiClient.getDeviceId();
    expect(id1).toBeDefined();
    expect(id1).toBe(id2);
  });

  it('FR-LAB-003: getClientVersion returns 1.1.0', async () => {
    const version = await apiClient.getClientVersion();
    expect(version).toBe('1.1.0');
  });

  it('FR-AUTH-002 & FR-CAN-007: login succeeds with candidate ID or username', async () => {
    const resCandidateId = await apiClient.login('CAN-2026-081', 'ValidPass123');
    expect(resCandidateId.accessToken).toContain('mock-jwt-token');
    expect(resCandidateId.user.candidateId).toBe('CAN-2026-081');

    const resUsername = await apiClient.login('vimal', 'ValidPass123');
    expect(resUsername.user.username).toBe('vimal');
    expect(resUsername.user.candidateId).toContain('CAN-2026-VIM');
  });

  it('SRS 8.3.3: login fails with VALIDATION_FAILED when identifier or password is missing', async () => {
    await expect(apiClient.login('', 'pass')).rejects.toMatchObject({
      code: ApiErrorCode.VALIDATION_FAILED,
      status: 'rejected',
    });

    await expect(apiClient.login('CAN-2026-081', '')).rejects.toMatchObject({
      code: ApiErrorCode.VALIDATION_FAILED,
      status: 'rejected',
    });
  });

  it('FR-ANS-009: submitAnswer requires questionAttemptId and sends idempotency key', async () => {
    const key = crypto.randomUUID();
    const res = await apiClient.submitAnswer(
      {
        questionAttemptId: 'qa_0001',
        response: 'opt_2',
      },
      key,
    );

    expect(res.status).toBe('accepted');
    expect(res.questionAttemptId).toBe('qa_0001');
    expect(res.submittedAt).toBeDefined();
  });

  it('Non-Negotiable Rule 3 & FR-ANS-009: duplicate idempotency key returns original result', async () => {
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      questionAttemptId: 'qa_0001',
      response: 'opt_2',
    };

    const firstResult = await apiClient.submitAnswer(payload, idempotencyKey);
    const duplicateResult = await apiClient.submitAnswer(payload, idempotencyKey);

    expect(duplicateResult).toEqual(firstResult);
    expect(duplicateResult.submittedAt).toBe(firstResult.submittedAt);
  });

  it('FR-UI-001 & TC09: getAssignedAssessments returns assessments list without answer keys or hidden cases', async () => {
    const list = await apiClient.getAssignedAssessments();
    expect(list.length).toBeGreaterThan(0);

    const first = list[0];
    expect(first.assignmentId).toBeDefined();
    expect(first.assessmentId).toBeDefined();
    expect(first.title).toBeDefined();
    expect(first.isEligible).toBe(true);
    expect(first.attemptsRemaining).toBe(1);

    // Strict TC09 verification: Zero answer keys or correct option flags
    const serialized = JSON.stringify(list);
    expect(serialized).not.toContain('answerKey');
    expect(serialized).not.toContain('hiddenTestCase');
    expect(serialized).not.toContain('isCorrect');
  });

  it('FR-LAB-003: checkServerHandshake validates client version handshake', async () => {
    const handshake = await apiClient.checkServerHandshake();
    expect(handshake.ok).toBe(true);
    expect(handshake.isUnsupportedClient).toBe(false);
  });

  // ==========================================
  // Phase 3 Session Runtime API Tests
  // ==========================================

  it('FR-TIME-002 & FR-UI-002: startSession initializes active exam session with first question and palette', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    expect(session.sessionId).toBeDefined();
    expect(session.overallDeadline).toBeDefined();
    expect(session.currentQuestion).toBeDefined();
    expect(session.currentQuestion.sequenceNumber).toBe(1);
    expect(session.currentQuestion.questionAttemptId).toBe('qa_0001');
    expect(session.palette.length).toBe(6);
    expect(session.palette[0].status).toBe('CURRENT');
  });

  it('FR-UI-003 & TC09: getCurrentQuestion retrieves active question without answer keys', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    const question = await apiClient.getCurrentQuestion(session.sessionId);
    expect(question.questionAttemptId).toBe('qa_0001');
    expect(question.questionText).toBeDefined();
    expect(question.options?.length).toBe(4);

    // Strict TC09 verification
    const serialized = JSON.stringify(question);
    expect(serialized).not.toContain('isCorrect');
    expect(serialized).not.toContain('answerKey');
  });

  it('FR-TIME-008 & FR-UI-004: getSessionStatus returns authoritative countdown and palette state', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    const status = await apiClient.getSessionStatus(session.sessionId);
    expect(status.sessionId).toBe(session.sessionId);
    expect(status.sessionStatus).toBe(SessionState.ACTIVE);
    expect(status.overallRemainingSeconds).toBeGreaterThan(0);
    expect(status.palette.length).toBe(6);
  });

  it('FR-ANS-009 & TC-04: submitSessionAnswer records answer idempotently and advances question', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    const idempotencyKey = crypto.randomUUID();

    const ack1 = await apiClient.submitSessionAnswer(
      session.sessionId,
      {
        questionAttemptId: 'qa_0001',
        answer: 'opt_2',
      },
      idempotencyKey,
    );

    expect(ack1.status).toBe('accepted');
    expect(ack1.questionAttemptId).toBe('qa_0001');
    expect(ack1.next?.questionAttemptId).toBe('qa_0002');

    // Duplicate request with identical idempotency-key (TC04)
    const ack2 = await apiClient.submitSessionAnswer(
      session.sessionId,
      {
        questionAttemptId: 'qa_0001',
        answer: 'opt_2',
      },
      idempotencyKey,
    );

    expect(ack2).toEqual(ack1);
  });

  it('FR-ANS-005: saveDraft saves candidate draft without altering attempt state', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    const res = await apiClient.saveDraft(session.sessionId, {
      questionAttemptId: 'qa_0001',
      draftPayload: 'draft answer text',
    });
    expect(res.success).toBe(true);
  });

  it('FR-ANS-008 & FR-UI-009: finalSubmitSession marks session as submitted', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    const result = await apiClient.finalSubmitSession(session.sessionId);
    expect(result.status).toBe('submitted');
    expect(result.sessionId).toBe(session.sessionId);
    expect(result.submittedAt).toBeDefined();

    const statusAfter = await apiClient.getSessionStatus(session.sessionId);
    expect(statusAfter.sessionStatus).toBe(SessionState.SUBMITTED);
  });
});
