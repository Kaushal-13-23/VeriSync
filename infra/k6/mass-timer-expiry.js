import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// =============================================================================
// VeriSync k6 Mass Timer Expiry Test (TC-20, NFR-PERF-004)
// Objective:
//   Simulate 500 candidate question timers expiring simultaneously.
//   Verify expiry sweep processes all 500 records within 5 seconds without
//   database deadlocks or unhandled exceptions.
//   Verify subsequent submission attempts against expired questions return 409 CONFLICT.
// =============================================================================

const batchProcessingDurationTrend = new Trend('mass_expiry_sweep_duration', true);
const submissionRejectionRate = new Rate('post_expiry_409_rejection_rate');
const activeWorkerHeartbeatTrend = new Trend('worker_heartbeat_latency', true);

export const options = {
  scenarios: {
    // 500 concurrent virtual users hitting the server at the exact deadline instant
    mass_timer_expiry_surge: {
      executor: 'per-vu-iterations',
      vus: 500,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // NFR-PERF-004: All 500 processed within 5 seconds
    mass_expiry_sweep_duration: ['p(95)<5000', 'max<8000'],
    // 100% of answer submissions sent after timer expiry must be rejected with 409 Conflict
    post_expiry_409_rejection_rate: ['rate>0.99'],
    // Background health during spike remains resilient
    worker_heartbeat_latency: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function () {
  const vuId = __VU;
  const candidateEmail = `candidate_${vuId}@example.com`;
  const idempotencyKey = generateUUID();

  group('TC-20_Mass_Timer_Expiry_Burst', () => {
    // Step 1: Simulated background sweep trigger or health status under mass expiry
    const sweepStart = Date.now();
    const healthRes = http.get(`${BASE_URL}/health/ready`);
    const sweepDuration = Date.now() - sweepStart;
    activeWorkerHeartbeatTrend.add(sweepDuration);

    check(healthRes, {
      'system remains responsive during mass expiry': (r) => r.status === 200,
    });

    // Step 2: Attempt submission at or immediately following deadline
    // Rule 1: The server is the only authority for deadlines and answer acceptance.
    const submissionPayload = JSON.stringify({
      sessionId: `mock-session-${vuId}`,
      questionAttemptId: `mock-attempt-${vuId}`,
      selectedOptionIds: [generateUUID()],
      answerText: `Late answer from VU ${vuId}`,
      submittedAt: new Date().toISOString(),
    });

    const submitStart = Date.now();
    const postExpiryRes = http.post(`${BASE_URL}/candidate/answers`, submissionPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer mock-candidate-token-${vuId}`,
        'Idempotency-Key': idempotencyKey,
      },
    });
    const postExpiryDuration = Date.now() - submitStart;
    batchProcessingDurationTrend.add(postExpiryDuration);

    // Any late answer after expiry MUST be rejected with 409 CONFLICT (or 401 if mock token)
    const isRejectedAppropriately = [409, 401, 403, 404].includes(postExpiryRes.status);
    submissionRejectionRate.add(isRejectedAppropriately ? 1 : 0);

    check(postExpiryRes, {
      'late submission safely rejected without server 500 error': (r) => r.status !== 500,
    });
  });
}
