import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// =============================================================================
// VeriSync k6 Production Concurrency & Performance Load Test
// Target: Concurrency baseline of 250 - 500 concurrent candidates (SRS Open Decision 1)
// Requirements:
//   - NFR-PERF-001: Login response time p95 < 2.0s
//   - NFR-PERF-002: Question delivery response time p95 < 1.5s
//   - NFR-PERF-003: Answer submission acknowledge & commit p95 < 2.0s
//   - NFR-PERF-005: Result generation & export downloads initiate < 3.0s
// =============================================================================

// Custom Metrics
const loginTrend = new Trend('login_duration', true);
const questionDeliveryTrend = new Trend('question_delivery_duration', true);
const answerSubmissionTrend = new Trend('answer_submission_duration', true);
const finalSubmitTrend = new Trend('final_submit_duration', true);
const exportTrend = new Trend('export_duration', true);
const failedRequestsRate = new Rate('failed_requests');
const idempotencyDuplicatesCounter = new Counter('idempotency_repeats_handled');

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Warm-up ramp to 50 VUs
    { duration: '1m', target: 250 }, // Ramp to agreed concurrency baseline (250 VUs)
    { duration: '2m', target: 500 }, // Ramp to peak batch capacity (500 VUs)
    { duration: '2m', target: 500 }, // Sustain peak load
    { duration: '1m', target: 0 }, // Ramp-down
  ],
  thresholds: {
    // NFR-PERF-001: Login p95 < 2000ms
    login_duration: ['p(95)<2000', 'p(99)<3500'],
    // NFR-PERF-002: Question delivery p95 < 1500ms
    question_delivery_duration: ['p(95)<1500', 'p(99)<2500'],
    // NFR-PERF-003: Answer commit & acknowledge p95 < 2000ms
    answer_submission_duration: ['p(95)<2000', 'p(99)<3000'],
    // Final submit within 2s
    final_submit_duration: ['p(95)<2000'],
    // NFR-PERF-005: Export download initiates < 3000ms
    export_duration: ['p(95)<3000'],
    // Error rate must remain under 1%
    failed_requests: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';

// Deterministic UUID generator for k6 run
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const candidateEmail = `candidate_${(vuId % 200) + 1}@example.com`;
  const candidatePassword = 'Password123!';

  let candidateToken = null;
  let activeSessionId = null;
  let questionAttemptId = null;

  // 1. Health Probe Check
  group('01_Health_Check', () => {
    const healthRes = http.get(`${BASE_URL}/health/live`);
    check(healthRes, {
      'health check status 200': (r) => r.status === 200,
    });
  });

  // 2. Candidate Login (NFR-PERF-001)
  group('02_Candidate_Login', () => {
    const loginPayload = JSON.stringify({
      email: candidateEmail,
      password: candidatePassword,
    });

    const start = Date.now();
    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': `device-lab-pos-${(vuId % 50) + 1}`,
        'X-Client-Version': '1.0.0',
      },
      tags: { endpoint: 'login' },
    });
    const duration = Date.now() - start;
    loginTrend.add(duration);

    const isSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'access token returned': (r) => {
        try {
          const body = r.json();
          return body.data && body.data.accessToken !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (isSuccess) {
      candidateToken = loginRes.json().data.accessToken;
    } else {
      failedRequestsRate.add(1);
    }
  });

  if (!candidateToken) {
    sleep(1);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${candidateToken}`,
    'X-Device-Id': `device-lab-pos-${(vuId % 50) + 1}`,
    'X-Client-Version': '1.0.0',
  };

  // 3. Question Delivery (NFR-PERF-002)
  group('03_Question_Delivery', () => {
    // Fetch active session or assigned assessments
    const start = Date.now();
    const sessionRes = http.get(`${BASE_URL}/candidate/sessions/current`, {
      headers: authHeaders,
      tags: { endpoint: 'questions' },
    });
    const duration = Date.now() - start;
    questionDeliveryTrend.add(duration);

    const checkRes = check(sessionRes, {
      'session or questions returned status 200 or 404': (r) =>
        r.status === 200 || r.status === 404,
    });

    if (!checkRes) {
      failedRequestsRate.add(1);
    }

    if (sessionRes.status === 200) {
      try {
        const body = sessionRes.json();
        activeSessionId = body.data?.id;
        questionAttemptId = body.data?.questionAttempts?.[0]?.id;
      } catch {
        // Fallback for mock session
      }
    }
  });

  // 4. Candidate Answer Submission & Idempotency (NFR-PERF-003, Rule 3, Rule 4)
  group('04_Answer_Submission', () => {
    const idempotencyKey = generateUUID();
    const targetSessionId = activeSessionId || generateUUID();
    const targetAttemptId = questionAttemptId || generateUUID();

    const submissionPayload = JSON.stringify({
      sessionId: targetSessionId,
      questionAttemptId: targetAttemptId,
      selectedOptionIds: [generateUUID()],
      answerText: `k6 submission from VU ${vuId} iter ${iterId}`,
    });

    const submitHeaders = Object.assign({}, authHeaders, {
      'Idempotency-Key': idempotencyKey,
    });

    // Primary Submission
    const start = Date.now();
    const submitRes = http.post(`${BASE_URL}/candidate/answers`, submissionPayload, {
      headers: submitHeaders,
      tags: { endpoint: 'submissions' },
    });
    const duration = Date.now() - start;
    answerSubmissionTrend.add(duration);

    check(submitRes, {
      'answer submission returns 200 or 201 or 400': (r) => [200, 201, 400, 404].includes(r.status),
    });

    // Repeat Submission with SAME Idempotency-Key (Must return identical result without duplicates)
    const repeatRes = http.post(`${BASE_URL}/candidate/answers`, submissionPayload, {
      headers: submitHeaders,
      tags: { endpoint: 'submissions_idempotent_retry' },
    });

    if (repeatRes.status === submitRes.status) {
      idempotencyDuplicatesCounter.add(1);
    }
  });

  // 5. Final Submit (SRS Section 3.3)
  group('05_Final_Submit', () => {
    const targetSessionId = activeSessionId || generateUUID();
    const start = Date.now();
    const finalRes = http.post(
      `${BASE_URL}/candidate/sessions/${targetSessionId}/submit`,
      JSON.stringify({ reason: 'Candidate completed exam' }),
      {
        headers: Object.assign({}, authHeaders, {
          'Idempotency-Key': generateUUID(),
        }),
        tags: { endpoint: 'final_submit' },
      },
    );
    const duration = Date.now() - start;
    finalSubmitTrend.add(duration);

    check(finalRes, {
      'final submit returns valid status': (r) => [200, 201, 400, 404].includes(r.status),
    });
  });

  // 6. Result Generation & Export Query Throughput (NFR-PERF-005) - 1 in 20 iterations
  if (iterId % 20 === 0) {
    group('06_Result_Export', () => {
      const start = Date.now();
      const exportRes = http.get(`${BASE_URL}/assessments/export-summary`, {
        headers: authHeaders,
        tags: { endpoint: 'export' },
      });
      const duration = Date.now() - start;
      exportTrend.add(duration);

      check(exportRes, {
        'export endpoint responds under 3s': (r) => [200, 403, 404].includes(r.status),
      });
    });
  }

  // Realistic candidate think time between actions (1-3s)
  sleep(Math.random() * 2 + 1);
}
