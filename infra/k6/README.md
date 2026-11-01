# VeriSync k6 Load & Performance Testing Suite

This directory contains load and stress test suites for VeriSync conforming to **SRS Open Decision 1 (250–500 candidate concurrency)** and performance non-functional requirements (**NFR-PERF-001 through NFR-PERF-005**).

## Test Scripts

1. **`load-test.js`**:
   - Simulates end-to-end candidate exam session flows: authentication, question delivery, drafting, idempotent answer submission, and exam completion.
   - Evaluates:
     - **NFR-PERF-001**: Candidate login p95 < 2.0s
     - **NFR-PERF-002**: Question delivery p95 < 1.5s
     - **NFR-PERF-003**: Answer submission acknowledgement and durable commit p95 < 2.0s
     - **NFR-PERF-005**: Result generation and export throughput (< 3.0s download initiation)
     - Error rate < 1.0%

2. **`mass-timer-expiry.js` (TC-20, NFR-PERF-004)**:
   - Simulates 500 candidate questions expiring at the identical millisecond timestamp.
   - Verifies the database sweep processes and commits transitions (`ACTIVE` -> `EXPIRED`) within 5 seconds without lock contention or deadlocks.
   - Asserts server authority (Rule 1): post-expiry answers are strictly rejected with HTTP 409 Conflict.

## Prerequisites

- [k6 installed](https://k6.io/docs/get-started/installation/) locally, OR run via Docker: `grafana/k6:latest`.
- VeriSync backend API running on `http://localhost:3000/api/v1` (or your staging cluster URL).

## Running the Tests

### Local Execution

```bash
# Run baseline load test
k6 run infra/k6/load-test.js

# Target staging environment
k6 run -e API_URL=https://api.staging.verisync.internal/api/v1 infra/k6/load-test.js

# Run TC-20 Mass Timer Expiry stress test
k6 run infra/k6/mass-timer-expiry.js
```

### Docker Execution

```bash
docker run --rm -i \
  -e API_URL=http://host.docker.internal:3000/api/v1 \
  grafana/k6:latest run - < infra/k6/load-test.js
```

## Threshold Assertions

| Metric                       | Target / NFR   | Description                              |
| :--------------------------- | :------------- | :--------------------------------------- |
| `login_duration`             | p(95) < 2000ms | NFR-PERF-001                             |
| `question_delivery_duration` | p(95) < 1500ms | NFR-PERF-002                             |
| `answer_submission_duration` | p(95) < 2000ms | NFR-PERF-003 (Durable commit before ACK) |
| `mass_expiry_sweep_duration` | p(95) < 5000ms | NFR-PERF-004 / TC-20                     |
| `failed_requests`            | rate < 1%      | System stability under peak concurrency  |
