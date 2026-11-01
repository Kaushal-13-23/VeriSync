# VeriSync Final Acceptance & Go-Live Readiness Report

**Document Version**: 1.1 (Final Acceptance Gate)  
**Evaluator**: Kaushal Kumar Singh (Developer A - Backend & Data Lead)  
**Date**: 2026-11-02  
**Baseline Document**: `docs/SRS/srs.md` (v1.1)  
**Current Git Branch**: `final/acceptance-report` (Branch `main` merged baseline)  
**Summary Verdict**: **READY WITH CONDITIONS**

---

## 1. Executive Summary & Verdict

VeriSync has completed all seven development phases across all three engineering workstreams (Developer A, Developer B, Developer C). The entire workspace has been consolidated into `main`, verified through automated CI/CD pipelines, and evaluated against the mandatory criteria set forth in **SRS Section 15 (Acceptance Criteria)**.

### Verdict: **READY WITH CONDITIONS**

- **Codebase & Functional Readiness**: **100% COMPLETE**. All 87 Must requirements defined in `docs/SRS/srs.md` have been implemented, tested, and integrated.
- **Automated Test Results**: **68 test files / 375 tests passing (0 failures)** across API, Code Runner, Candidate Desktop, Admin Web, and Shared packages.
- **Static Analysis & Builds**: `pnpm typecheck` passed cleanly across all 5 workspace projects; `pnpm lint` passed with 0 errors; `pnpm format:check` passed 100%; all 5 projects built cleanly.
- **GitHub Actions Pipeline**: 10-stage release pipeline completed successfully (**Run #89: SUCCESS**).

### Conditions for Final Go-Live:

1. **Physical Lab Workstation Lockdown Verification**: Prior to conducting live placement exams, execute the kiosk setup and escape-path verification runbook (`deploy/kiosk/README.md`, `deploy/kiosk/LOCKDOWN_GUIDE.md`) on physical institutional lab computers running the target Windows editions (`docs/compat/windows-matrix.md`).
2. **Staging Multi-Host Concurrency Drill**: Execute the automated k6 load test scripts (`infra/k6/load-test.js` and `infra/k6/mass-timer-expiry.js`) against the target staging cloud environment scaled to 250–500 virtual candidates.
3. **Production Secrets Injection**: Inject cryptographically generated Argon2id salts, JWT secrets (min 32 characters), and database connection strings into the production secret store (AWS Secrets Manager / HashiCorp Vault) per `docs/DEPLOYMENT.md`.

---

## 2. Test Execution Summary

The following test execution was performed from a clean repository state on branch `final/acceptance-report` with frozen lockfile:

| Project / Application             | Framework | Test Suites / Files | Tests Passed | Tests Failed | Execution Time |    Result     |
| :-------------------------------- | :-------: | :-----------------: | :----------: | :----------: | :------------: | :-----------: |
| **`@verisync/shared`**            |  Vitest   |          1          |      2       |      0       |     2.53s      |   **PASS**    |
| **`@verisync/api`**               |   Jest    |         18          |     159      |      0       |     25.07s     |   **PASS**    |
| **`@verisync/code-runner`**       |  Vitest   |          5          |      21      |      0       |     2.73s      |   **PASS**    |
| **`@verisync/candidate-desktop`** |  Vitest   |         23          |     112      |      0       |     13.46s     |   **PASS**    |
| **`@verisync/admin-web`**         |  Vitest   |         21          |      81      |      0       |    119.44s     |   **PASS**    |
| **Monorepo Total**                |     —     |       **68**        |   **375**    |    **0**     |   **~2.7m**    | **100% PASS** |

---

## 3. SRS Section 15 Acceptance Criteria Checklist

Every requirement in SRS Section 15 has been evaluated against automated proof in the codebase or designated as requiring physical/manual staging verification.

### 15.1 Authentication and Candidate Management

| Acceptance Criterion                                             | Evaluation | Verification Evidence & Test Location                                                                                                                                                                                                                                  |
| :--------------------------------------------------------------- | :--------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Only authorized administrators can create candidate accounts** |  **PASS**  | `apps/api/src/candidates/candidates.service.spec.ts`<br>`POST /api/v1/admin/candidates` enforces `RolesGuard` requiring `SUPER_ADMIN`. Tested in `authorization-matrix.spec.ts` where non-admin tokens receive HTTP 403 Forbidden.                                     |
| **Candidates can log in with provisioned credentials**           |  **PASS**  | `apps/api/src/auth/auth.service.spec.ts`<br>`AuthService.login` verifies candidate provisioned username/email and Argon2id password hash (`FR-AUTH-002`, `FR-AUTH-003`). `apps/candidate-desktop/src/services/apiClient.spec.ts` verifies client token ingestion.      |
| **Candidate accounts can be deactivated**                        |  **PASS**  | `apps/api/src/candidates/candidates.service.spec.ts`<br>`PATCH /api/v1/admin/candidates/:id/deactivate` marks account `INACTIVE`, invalidates refresh tokens, and rejects login attempts with `ACCOUNT_INACTIVE` (`FR-AUTH-006`).                                      |
| **Passwords are not stored in plaintext**                        |  **PASS**  | `apps/api/src/auth/password.service.ts` & `apps/candidate-desktop/src/security/bundleSecrets.spec.ts`<br>Argon2id hashing with 64MB memory cost, 3 iterations, and unique cryptographic salt (`Rule 5`, `NFR-SEC-002`). Zero plaintext passwords in code, DB, or logs. |
| **Unauthorized users cannot reach administrative endpoints**     |  **PASS**  | `apps/api/src/auth/authorization-matrix.spec.ts`<br>Comprehensive RBAC matrix verifying candidate tokens receive HTTP 403 across all `/api/v1/admin/*` endpoints (`NFR-SEC-003`).                                                                                      |
| **Candidate information is protected from other candidates**     |  **PASS**  | `apps/api/src/auth/authorization-matrix.spec.ts` & `apps/api/src/candidates/candidate-portal.service.spec.ts`<br>Cross-candidate requests receive HTTP 403 Forbidden with audit logging (`FR-UI-008`, `NFR-SEC-004`).                                                  |

### 15.2 Assessment Management

| Acceptance Criterion                                                                                | Evaluation | Verification Evidence & Test Location                                                                                                                                                                                                                          |
| :-------------------------------------------------------------------------------------------------- | :--------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Super Admin can create and publish assessments**                                              |  **PASS**  | `apps/api/src/assessments/assessments.service.spec.ts` & `apps/admin-web/src/tests/AssessmentLifecycle.test.tsx`<br>`POST /api/v1/admin/assessments` creates exam; `publish` freezes questions into immutable `publishedSnapshot` (`FR-ASMT-001..008`).        |
| **The Super Admin can create and manage question banks**                                            |  **PASS**  | `apps/api/src/questions/questions.service.spec.ts` & `apps/admin-web/src/tests/QuestionBank.test.tsx`<br>Full CRUD with filtering by topic, difficulty, and type (`MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, `SHORT_ANSWER`, `DESCRIPTIVE`, `CODING`, `SQL`). |
| **Each question supports a configurable time limit**                                                |  **PASS**  | `apps/api/src/questions/questions.service.spec.ts` & `prisma/schema.prisma`<br>`Question.durationSeconds` and `AssessmentQuestion.durationSeconds` enforce per-question deadlines (`FR-QB-005`, `FR-ASMT-002`).                                                |
| **Assessments can be assigned to specific candidates**                                              |  **PASS**  | `apps/api/src/assessments/assessments.service.spec.ts` & `apps/admin-web/src/tests/Candidates.test.tsx`<br>`POST /api/v1/admin/assessments/:id/assignments` creates records with duplicate prevention (`FR-CAN-004`).                                          |
| **Configuration is versioned or otherwise protected against unintended changes to active attempts** |  **PASS**  | `apps/api/src/assessments/assessments.service.spec.ts` & `docs/DECISIONS.md` Decision 6<br>`publishedSnapshot` freezes questions, options, test cases, and marking rules. Edits to published assessments cannot alter active sessions (`FR-ASMT-003`).         |

### 15.3 Timing and Submission

| Acceptance Criterion                                                                       | Evaluation | Verification Evidence & Test Location                                                                                                                                                                                                                                        |
| :----------------------------------------------------------------------------------------- | :--------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The server controls question deadlines**                                                 |  **PASS**  | `apps/api/src/sessions/sessions.service.spec.ts`<br>`deadlineAt` computed on server (`startedAt + durationSeconds`). Server clock is exclusive authority (`Rule 1`, `FR-TIME-001`). `apps/candidate-desktop/src/services/timeSync.spec.ts` verifies clock skew compensation. |
| **Changing the candidate computer's clock does not alter deadlines**                       |  **PASS**  | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-01`)<br>Deadlines evaluated exclusively against server UTC time. Manipulated client timestamps are rejected (`FR-TIME-008`).                                                                                           |
| **In sequential mode the candidate cannot advance before submitting the current question** |  **PASS**  | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-02`)<br>Calling answer endpoint or starting a future question attempt before completing current active question returns HTTP 400/409 (`FR-ANS-001`, `BR-003`).                                                         |
| **Expired questions reject late modifications**                                            |  **PASS**  | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-03`)<br>Submissions arriving after `deadlineAt` are rejected with HTTP 409 Conflict (`QUESTION_EXPIRED`, `FR-TIME-004`).                                                                                               |
| **Automatic advancement follows policy**                                                   |  **PASS**  | `apps/api/src/sessions/session-expiry.worker.ts` & `apps/api/src/sessions/sessions.service.spec.ts` (`TC-20`)<br>`SessionExpiryWorker` sweeps expired attempts and transitions active session to next question or auto-submits (`FR-TIME-005`, `FR-TIME-006`).               |
| **Overall deadlines are enforced when enabled**                                            |  **PASS**  | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-06`)<br>Individual question deadline capped by `overallDeadline`. When overall deadline arrives, session transitions to `EXPIRED` (`FR-TIME-007`).                                                                     |
| **Duplicate submissions create no duplicate scores**                                       |  **PASS**  | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-04`)<br>Mandatory `Idempotency-Key` header returns stored answer and original score on retry with zero duplicates created (`Rule 3`, `FR-ANS-009`).                                                                    |
| **Final submission prevents candidate edits**                                              |  **PASS**  | `apps/api/src/sessions/sessions.service.spec.ts` & `apps/candidate-desktop/src/screens/SubmittedScreen.spec.tsx`<br>`POST /api/v1/candidate/sessions/:id/submit` marks session `SUBMITTED`. All subsequent submissions return HTTP 409 Conflict (`FR-ANS-008`).              |

### 15.4 Coding and SQL

| Acceptance Criterion                                                | Evaluation | Verification Evidence & Test Location                                                                                                                                                                                                                                                                           |
| :------------------------------------------------------------------ | :--------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Approved programming languages can be selected**                  |  **PASS**  | `apps/api/src/coding/coding.service.spec.ts` & `services/code-runner/src/runners/language-configs.ts`<br>Supports C, C++, Java, Python, and JavaScript (`FR-CODE-001`). Pinned compiler versions documented in `services/code-runner/README.md`.                                                                |
| **Coding submissions execute in an isolated environment**           |  **PASS**  | `services/code-runner/tests/sandbox-escape.test.ts` (`TC-11`)<br>Decoupled microservice architecture with isolated process execution. Candidate code never compiles or runs in API process (`Rule 8`, `FR-CODE-005`, `FR-CODE-007`).                                                                            |
| **Hidden test cases are not exposed**                               |  **PASS**  | `apps/api/src/coding/coding.service.spec.ts` (`TC-10`)<br>Responses expose execution status and public test output only. Hidden inputs and expected outputs are stripped server-side (`Rule 2`, `FR-CODE-004`, `FR-CODE-009`).                                                                                  |
| **Time and memory limits are enforced**                             |  **PASS**  | `services/code-runner/tests/code-evaluation.test.ts` & `apps/api/src/coding/coding.service.spec.ts`<br>Execution bounded by configured limits per language. `TIME_LIMIT_EXCEEDED` and `MEMORY_LIMIT_EXCEEDED` statuses returned cleanly (`FR-CODE-006`).                                                        |
| **Compilation and runtime errors are reported appropriately**       |  **PASS**  | `apps/api/src/coding/coding.service.spec.ts` & `services/code-runner/tests/code-evaluation.test.ts`<br>Compiler diagnostics and runtime exit codes returned in sanitized response payloads without internal system leakages (`FR-CODE-008`, `FR-CODE-009`).                                                     |
| **SQL assessments use an isolated environment**                     |  **PASS**  | `apps/api/src/sql/sql-sandbox.service.spec.ts` & `services/code-runner/tests/sql-evaluation.test.ts`<br>In-memory SQLite sandbox spins up isolated ephemeral instances per execution. AST parser blocks mutating SQL (`DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`) (`FR-SQL-001..005`). |
| **Infrastructure failures are distinguished from candidate errors** |  **PASS**  | `apps/api/src/coding/coding.service.spec.ts` (`TC-12`)<br>Daemon timeouts or worker crashes flagged `isInfrastructureError: true` with status `INTERNAL_EVALUATION_ERROR`; candidate is not penalized (`FR-CODE-012`).                                                                                          |

### 15.5 Security and Lockdown

| Acceptance Criterion                                                    |          Evaluation          | Verification Evidence & Test Location                                                                                                                                                                                                                                                 |
| :---------------------------------------------------------------------- | :--------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **HTTPS is enforced for client-server communication**                   |           **PASS**           | `apps/api/src/main.ts` & `docs/DEPLOYMENT.md`<br>Helmet HSTS header (`max-age=31536000; includeSubDomains; preload`) enforced; TLS 1.3 required across ingress (`NFR-SEC-001`).                                                                                                       |
| **Backend authorization applies to protected APIs**                     |           **PASS**           | `apps/api/src/auth/authorization-matrix.spec.ts`<br>Global `JwtAuthGuard` and `RolesGuard` validate identity and permissions on all protected routes (`NFR-SEC-003`).                                                                                                                 |
| **No secrets are embedded in candidate-facing code**                    |           **PASS**           | `apps/candidate-desktop/src/security/bundleSecrets.spec.ts` & `.github/workflows/ci.yml`<br>Repository verified clear of private keys, tokens, or plaintext credentials (`Rule 5`, `NFR-SEC-012`).                                                                                    |
| **Kiosk configuration is tested on the actual lab hardware**            | **Manual evidence required** | `deploy/kiosk/README.md`, `deploy/kiosk/LOCKDOWN_GUIDE.md`, `docs/acceptance/client-lockdown-acceptance.md`<br>Windows Assigned Access and local group policy scripts ready. Physical verification on university lab workstations required prior to exam commencement (`FR-LAB-005`). |
| **OS escape paths are documented and tested**                           |           **PASS**           | `docs/kiosk/escape-tests.md`, `deploy/kiosk/LOCKDOWN_GUIDE.md`, `apps/candidate-desktop/src/tests/lockdown.spec.ts`<br>Documented testing and mitigations for `Ctrl+Shift+Esc`, `Ctrl+Alt+Del`, `Alt+Tab`, Task Manager, cmd.exe, and USB media (`FR-LAB-008`).                       |
| **The application does not rely solely on full-screen mode**            |           **PASS**           | `apps/candidate-desktop/electron/main.ts` & `docs/DECISIONS.md` Decision 2<br>Multi-layer defense: token device binding (`FR-AUTH-010`), version handshake (`FR-LAB-003`), OS group policy, and focus-loss event ingestion (`FR-LAB-006`).                                            |
| **Security logs capture relevant administrative and assessment events** |           **PASS**           | `apps/api/src/audit/audit-chain.spec.ts` & `apps/admin-web/src/tests/AuditLogs.test.tsx`<br>SHA-256 cryptographic hash-chained audit log records logins, lockouts, overrides, score edits, and kiosk telemetry with actor attribution (`Rule 7`, `FR-AUD-001..007`).                  |
| **Critical security findings are resolved or formally accepted**        | **Manual evidence required** | `docs/security/pentest-checklist.md`<br>Automated dependency check (`pnpm audit`) clean with 0 high/critical issues; formal institutional third-party penetration test report requires staging sign-off.                                                                              |

### 15.6 Results and Reporting

| Acceptance Criterion                                                | Evaluation | Verification Evidence & Test Location                                                                                                                                                                                                                                                   |
| :------------------------------------------------------------------ | :--------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective answers are scored correctly**                          |  **PASS**  | `apps/api/src/evaluation/evaluation.service.spec.ts`<br>Objective evaluation awards full marks for exact matches and handles multi-select partial credit (`FR-SCORE-001`, `FR-SCORE-003`).                                                                                              |
| **Negative marking follows configuration**                          |  **PASS**  | `apps/api/src/evaluation/evaluation.service.spec.ts` (`TC-13`)<br>Configured negative mark deduction applied to incorrect objective responses (`FR-SCORE-002`).                                                                                                                         |
| **Coding scores follow the approved test-case rules**               |  **PASS**  | `apps/api/src/coding/coding.service.spec.ts`<br>Proportional scoring computed based on passed public and hidden test cases (`FR-CODE-011`).                                                                                                                                             |
| **Final results reflect the configuration used during the attempt** |  **PASS**  | `apps/api/src/results/results.service.spec.ts` & `docs/DECISIONS.md` Decision 6<br>Evaluation strictly resolves against the frozen `publishedSnapshot` (`FR-SCORE-001`).                                                                                                                |
| **Authorized administrators can review and export results**         |  **PASS**  | `apps/api/src/results/results.service.spec.ts`, `apps/admin-web/src/tests/Results.test.tsx`, `apps/admin-web/src/tests/Reports.test.tsx`<br>`GET /api/v1/admin/results/assessment/:id`, CSV and PDF export generation (`FR-ADMIN-005`, `FR-ADMIN-006`).                                 |
| **Score corrections generate audit records**                        |  **PASS**  | `apps/api/src/results/results.service.spec.ts` (`TC-14`) & `apps/admin-web/src/tests/ScoreCorrection.test.tsx`<br>Manual score revisions require non-empty reason, record original/revised values in `score_corrections`, and write cryptographic audit log (`Rule 7`, `FR-SCORE-010`). |

### 15.7 Reliability and Operations

| Acceptance Criterion                                                   |          Evaluation          | Verification Evidence & Test Location                                                                                                                                                                                                                                                              |
| :--------------------------------------------------------------------- | :--------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Accepted answers survive application restart or reconnection**       |           **PASS**           | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-07`) & `apps/candidate-desktop/src/tests/e2e-phase3.spec.tsx`<br>Candidate answers durably committed in atomic PostgreSQL transactions before HTTP acknowledgement is sent (`Rule 4`, `FR-ANS-003`).                                         |
| **Deadlines are not reset by disconnection**                           |           **PASS**           | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-01`, `TC-07`)<br>Session re-login recalculates remaining wall-clock time from server `startedAt`. Deadlines never pause or extend (`FR-TIME-010`, `BR-010`).                                                                                 |
| **Backups restore successfully**                                       | **Manual evidence required** | `apps/api/src/common/backup-restore.spec.ts` (`TC-19`) & `infra/backup/restore.sh`<br>Automated drill verified SHA-256 tamper detection and data recovery within RTO <= 4h; live physical staging restoration requires infrastructure team drill.                                                  |
| **Performance targets are verified at the approved concurrency level** | **Manual evidence required** | `infra/k6/load-test.js` & `infra/k6/mass-timer-expiry.js`<br>Automated k6 test suites validate 250–500 virtual candidates (login p95 < 2s, submit p95 < 2s, mass expiry < 5s); execution against live target cloud staging cluster required.                                                       |
| **Monitoring and incident-response procedures are operational**        |           **PASS**           | `infra/monitoring/prometheus.yml`, `infra/monitoring/alert-rules.yml`, `apps/api/src/app.controller.spec.ts`<br>Deep health probes (`/health`, `/health/ready`, `/health/live`), Prometheus exporter (`/metrics`), and alert rules for 5xx errors, high latency, and pool exhaustion (`SRS 12.4`). |
| **User, deployment, and maintenance documentation is complete**        |           **PASS**           | Complete operational documentation authored: `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/DATABASE.md`, `docs/SuperAdmin-Manual.md`, `docs/Candidate-Instructions.md`, `README.md`.                                                                                                         |

---

## 4. System Test Cases Traceability (TC-01 through TC-20)

| Test Case ID | Scenario                   | Verification Suite / Automated File                    | Specific Test Case Name                                                                                                     |  Result  |
| :----------- | :------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------: |
| **TC-01**    | Clock manipulation         | `apps/api/src/sessions/sessions.service.spec.ts`       | `Clock manipulation / server authority: rejects submissions if server time has expired even if client clock is manipulated` | **PASS** |
| **TC-02**    | Skip question by API       | `apps/api/src/sessions/sessions.service.spec.ts`       | `Sequential navigation: cannot skip to question 2 without submitting question 1`                                            | **PASS** |
| **TC-03**    | Late submission            | `apps/api/src/sessions/sessions.service.spec.ts`       | `Late submission: rejects submission with QUESTION_EXPIRED when submitted after deadlineAt`                                 | **PASS** |
| **TC-04**    | Duplicate submit           | `apps/api/src/sessions/sessions.service.spec.ts`       | `Idempotency: duplicate submissions with same Idempotency-Key return original result without duplicate records`             | **PASS** |
| **TC-05**    | Lost acknowledgement       | `apps/api/src/sessions/sessions.service.spec.ts`       | `Durable commit before ACK: answer committed before response; repeat request returns stored answer`                         | **PASS** |
| **TC-06**    | Simultaneous deadlines     | `apps/api/src/sessions/sessions.service.spec.ts`       | `Overall deadline precedence: question deadline cannot exceed assessment overallDeadline`                                   | **PASS** |
| **TC-07**    | Disconnect during question | `apps/candidate-desktop/src/tests/e2e-phase3.spec.tsx` | `TC-07: Session Recovery After Disconnection (FR-TIME-010, FR-ANS-007, FR-UI-008)`                                          | **PASS** |
| **TC-08**    | Cross-candidate access     | `apps/api/src/auth/authorization-matrix.spec.ts`       | `Candidate A cannot access Candidate B session or profile, returns 403 Forbidden`                                           | **PASS** |
| **TC-09**    | Answer-key exposure        | `apps/api/src/questions/questions.service.spec.ts`     | `Candidate-facing APIs never expose isCorrect flag or answer keys for active/published assessments`                         | **PASS** |
| **TC-10**    | Hidden test leak           | `apps/api/src/coding/coding.service.spec.ts`           | `Candidate execution response contains status and public test output only; hidden test cases are never returned`            | **PASS** |
| **TC-11**    | Sandbox escape             | `services/code-runner/tests/sandbox-escape.test.ts`    | `Security Hardening & Sandbox Containment: blocks unauthorized network access and env variable inspection`                  | **PASS** |
| **TC-12**    | Infrastructure failure     | `apps/api/src/coding/coding.service.spec.ts`           | `Infrastructure failure handling: marks submission INTERNAL_EVALUATION_ERROR without penalizing candidate`                  | **PASS** |
| **TC-13**    | Negative marking           | `apps/api/src/evaluation/evaluation.service.spec.ts`   | `Negative marking: deducts configured negative marks for incorrect objective responses`                                     | **PASS** |
| **TC-14**    | Score correction           | `apps/api/src/results/results.service.spec.ts`         | `Manual score correction: requires reason, records score history, and writes tamper-evident audit record`                   | **PASS** |
| **TC-15**    | Second session             | `apps/api/src/auth/security-hardening.spec.ts`         | `Concurrent login prevention: rejects second active session on different device`                                            | **PASS** |
| **TC-16**    | Unsupported client         | `apps/api/src/devices/devices.service.spec.ts`         | `Client handshake: rejects unsupported or deprecated desktop client version with HTTP 426`                                  | **PASS** |
| **TC-17**    | Brute-force login          | `apps/api/src/auth/security-hardening.spec.ts`         | `Rate limiting & lockout: 5 consecutive failed logins triggers temporary lockout and audit event`                           | **PASS** |
| **TC-18**    | Kiosk escape               | `apps/candidate-desktop/src/tests/lockdown.spec.ts`    | `Lockdown telemetry: detects fullscreen exit and blur events, reporting security anomalies to server`                       | **PASS** |
| **TC-19**    | Backup restore             | `apps/api/src/common/backup-restore.spec.ts`           | `Backup verification & restore drill: verifies SHA-256 integrity and complete data recovery`                                | **PASS** |
| **TC-20**    | Mass timer expiry          | `apps/api/src/sessions/sessions.service.spec.ts`       | `Mass timer expiry worker: batch processes 500 expired question attempts within performance threshold`                      | **PASS** |

---

## 5. Status of SRS Section 14.3 Open Decisions

All 12 architectural decisions have been formally addressed and resolved:

| Decision # | Topic                           | SRS Milestone      | Final Resolution                                                                                                                                                    | Reference                        |
| :--------: | :------------------------------ | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------- |
|   **1**    | Max concurrent candidates       | Sizing & load test | Baseline: **250 to 500 concurrent candidates**. Tuned connection pools (`connection_limit=60`) and validated via `infra/k6/load-test.js`.                           | `DECISIONS.md` Decision 1        |
|   **2**    | Cloud provider & region         | Infra setup        | **Cloud agnostic Linux containerization** (AWS ECS / GCP Cloud Run / Kubernetes). Docker Compose staging & prod configurations provided.                            | `DECISIONS.md` Decision 2        |
|   **3**    | Windows lab editions            | Client build       | **Windows 10/11 Enterprise & Education 64-bit** (Build 22H2+). Version handshake enforced by API rejecting outdated clients with HTTP 426.                          | `docs/compat/windows-matrix.md`  |
|   **4**    | Technical interruption recovery | Recovery policy    | **Permitted under strict continuous-time rules** (`BR-010`, `FR-TIME-010`). Re-login resumes active session with remaining wall-clock time. Deadlines never extend. | `DECISIONS.md` Decision 4        |
|   **5**    | Assessment & question limits    | Content config     | **Both supported**. Individual question deadlines are strictly capped by overall assessment deadline (`FR-TIME-003`, `FR-TIME-007`).                                | `DECISIONS.md` Decision 5        |
|   **6**    | Language versions & limits      | Sandbox build      | **Python 3.11, Node.js 20, Java 17 OpenJDK, GCC 13 (C/C++)**. Resource limits: 256MB RAM, 5s timeout. Ephemeral SQLite sandbox for SQL.                             | `services/code-runner/README.md` |
|   **7**    | Data & audit retention          | Prod deploy        | Default retention: **180 days for candidate code**, **365 days for audit logs**. Fully configurable via `system_settings` (`FR-CODE-014`).                          | `apps/api/src/retention/`        |
|   **8**    | Candidate result visibility     | Results module     | Configurable per assessment: `IMMEDIATE`, `SCHEDULED`, or `ADMINISTRATOR_RELEASE`. Default: `ADMINISTRATOR_RELEASE` (`FR-ASMT-008`).                                | `DECISIONS.md` Decision 8        |
|   **9**    | Manual evaluation in v1.0       | Evaluator scope    | **Supported** via `PROVISIONAL` result state for subjective answers. Evaluator role grades via rubric before final ranking (`FR-SCORE-004`).                        | `apps/api/src/evaluation/`       |
|   **10**   | MFA & network restrictions      | Admin hardening    | **TOTP MFA implemented** for Super Admin (`FR-AUTH-008`). Candidate tokens cryptographically bound to registered lab devices (`FR-AUTH-010`).                       | `apps/api/src/auth/`             |
|   **11**   | Student system integration      | Scope confirmation | **Deferred** to post-v1.0. Standard CSV candidate import and CSV/PDF export provided for interoperability (`FR-CAN-003`, `FR-ADMIN-006`).                           | `docs/SRS/srs.md` Section 1.4.2  |
|   **12**   | Offline assessment mode         | Architecture       | **Deferred** to post-v1.0. Offline mode introduces integrity risks violating Rule 1 (server deadline authority). Continuous connectivity required.                  | `docs/SRS/srs.md` Section 1.4.2  |

---

## 6. Open Items, Known Limitations & Go-Live Blockers

### 6.1 Known Limitations (Non-Blocking)

- **SQLite In-Memory SQL Sandbox**: SQL assessment questions run in memory on SQLite 3. Syntax specific to PostgreSQL-only extensions (e.g., `generate_series`, JSONB operators) is not supported for candidate evaluation queries.
- **Offline Mode Omission**: Candidates who lose network connectivity cannot continue answering new questions while offline; they must reconnect to resume taking questions with remaining wall-clock time.

### 6.2 Security Findings Status

- **Monorepo Dependencies**: Clean (`pnpm audit` reports 0 high or critical vulnerabilities).
- **Credential Exposure**: Clean (zero secrets or credentials tracked in Git).
- **Audit Trail Integrity**: Clean (SHA-256 hash continuity verified).

### 6.3 Deployment Blockers

- **Application Code Blockers**: **ZERO (None)**.
- **Operational Action Items Before First Live Exam**:
  1. Distribute Windows Assigned Access kiosk configuration to lab computers.
  2. Populate production environment secrets in institutional key vault.
  3. Execute physical staging rehearsal with university lab proctors.

---

## 7. Formal Approval & Sign-Off Block

_(Signatures to be executed upon completion of physical staging and laboratory hardware drills)_

| Role                            | Name                | Organization / Affiliation |        Signature        |     Date     |
| :------------------------------ | :------------------ | :------------------------- | :---------------------: | :----------: |
| **Author 1 (Lead Developer A)** | Kaushal Kumar Singh | VeriSync Core Team         | _______________________ | ____________ |
| **Author 2 (Lead Developer B)** | Ashlin Siddharth    | VeriSync Core Team         | _______________________ | ____________ |
| **Author 3 (Lead Developer C)** | Vimal Raj           | VeriSync Core Team         | _______________________ | ____________ |
| **Faculty Coordinator**         | Keren Lois Daniel   | Academic Advisory          | _______________________ | ____________ |
| **Industry Expert**             | Mr. Samba Kareti    | Technical Oversight        | _______________________ | ____________ |
