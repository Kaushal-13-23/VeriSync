# VeriSync Implementation Progress Checklist

This document tracks implementation status across all functional and non-functional requirements defined in `docs/SRS/srs.md`.

Status Legend:

- [ ] **Pending** (Not started)
- [/] **Partial** (In progress / partially implemented)
- [x] **Done** (Fully implemented, tested, and verified)

---

## 5. Functional Requirements

### 5.1 Authentication and Account Management (FR-AUTH)

- [/] `FR-AUTH-001`: Secure Super Admin login with server-side credential validation (Must)
- [ ] `FR-AUTH-002`: Candidate login requiring administrator-issued credentials; no self-registration (Must)
- [ ] `FR-AUTH-003`: Passwords stored using Argon2id; no plaintext passwords in DB or logs (Must)
- [/] `FR-AUTH-004`: Rate-limiting on login endpoints with temporary lockout on repeated failures (Must)
- [x] `FR-AUTH-005`: Super Admin initiated candidate password reset workflow without exposing old password (Must)
- [x] `FR-AUTH-006`: Account deactivation preventing new sessions and enforcing session revocation (Must)
- [/] `FR-AUTH-007`: Backend session state management enforcing expiry, revocation, and RBAC authorization (Must)
- [/] `FR-AUTH-008`: Multi-factor authentication (TOTP) support for privileged administrator accounts (Must)
- [x] `FR-AUTH-009`: Secure temporary credential provisioning; credentials excluded from exports and logs (Must)
- [ ] `FR-AUTH-010`: Candidate session token bound to registered lab device and approved client version (Should)

### 5.2 Candidate Management (FR-CAN)

- [x] `FR-CAN-001`: Candidate record creation with complete profile fields and account status (Must)
- [x] `FR-CAN-002`: Profile modification and search/filter by candidate ID, name, email, institution, drive (Must)
- [x] `FR-CAN-003`: Bulk candidate import via CSV with validated template and per-row error reporting (Should)
- [x] `FR-CAN-004`: Candidate assignment to one or more assessments individually or by cohort/group (Must)
- [x] `FR-CAN-005`: Removal/revocation of candidate assignments before assessment start (Must)
- [x] `FR-CAN-006`: Candidate login and activity history logging (Must)
- [x] `FR-CAN-007`: Enforcement of unique candidate IDs and usernames (Must)

### 5.3 Question Bank Management (FR-QB)

- [x] `FR-QB-001`: Question creation with text, type, category, difficulty, marks, and explanation (Must)
- [x] `FR-QB-002`: Question categorization by topic, skill, and difficulty (Must)
- [x] `FR-QB-003`: Support for question formats: Single MCQ, Multi MCQ, True/False, Short Answer, Descriptive, Scenario (Must)
- [x] `FR-QB-004`: Option management for objective questions with server-side protected correct answer storage (Must)
- [x] `FR-QB-005`: Configurable question time limits (Must)
- [x] `FR-QB-006`: Rich-text/formatted code snippets in question statements (Must)
- [x] `FR-QB-007`: Question search and filter by keyword, topic, difficulty, and type (Must)
- [x] `FR-QB-008`: Question editing before assignment with immutability for active sessions (Must)
- [x] `FR-QB-009`: Question deactivation/archival preventing new usage without altering existing records (Must)
- [ ] `FR-QB-010`: Test case configuration for programming questions with sample and hidden designations (Must)

### 5.4 Assessment Management (FR-ASMT)

- [x] `FR-ASMT-001`: Assessment creation with title, role category, instructions, schedule, duration, attempt limit (Must)
- [x] `FR-ASMT-002`: Configuration of per-question limits, overall limits, marking rules, negative marking, randomization (Must)
- [x] `FR-ASMT-003`: Assessment editing before candidate commencement with versioned snapshot on publish (Must)
- [x] `FR-ASMT-004`: Validation ensuring sum of question limits or individual limits do not exceed overall duration (Must)
- [x] `FR-ASMT-005`: Assessment status state machine: Draft, Scheduled, Active, Completed, Suspended, Archived (Must)
- [x] `FR-ASMT-006`: Assessment scheduling with enforced start/end availability windows (Must)
- [x] `FR-ASMT-007`: Assessment attempt limit enforcement per candidate (default: 1) (Must)
- [x] `FR-ASMT-008`: Result visibility policy configuration (immediate, scheduled, or administrator release) (Must)

### 5.5 Timing, Deadline, and Session Expiry (FR-TIME)

- [ ] `FR-TIME-001`: Authoritative backend timing; client clock never trusted for deadline decisions (Must)
- [ ] `FR-TIME-002`: Server-recorded start timestamp for assessment sessions and question attempts (Must)
- [ ] `FR-TIME-003`: Authoritative question deadline computation capped by overall assessment deadline (Must)
- [ ] `FR-TIME-004`: Immediate rejection of answers arriving after the server-computed deadline (Must)
- [ ] `FR-TIME-005`: Automatic question finalization upon timeout with configured auto-advance policy (Must)
- [ ] `FR-TIME-006`: Background expiry worker handling timed-out questions and expired sessions (Must)
- [ ] `FR-TIME-007`: Overall assessment deadline precedence over remaining question time (Must)
- [ ] `FR-TIME-008`: Authoritative remaining-time synchronization API endpoint (Must)
- [ ] `FR-TIME-009`: Enforcement of sequential question progression without revisiting past questions by default (Must)
- [ ] `FR-TIME-010`: Continuous deadline progression during candidate disconnection; no deadline pauses (Must)
- [ ] `FR-TIME-011`: Audited administrative session extension/reopening overrides with mandatory reason (Must)

### 5.6 Answer Submission and Processing (FR-ANS)

- [ ] `FR-ANS-001`: Answer acceptance only for the candidate's currently active question attempt (Must)
- [ ] `FR-ANS-002`: Verification of session, question attempt state, deadline, and payload structure (Must)
- [ ] `FR-ANS-003`: Durable database persistence of accepted answers before sending acknowledgement (Must)
- [ ] `FR-ANS-004`: Invalidation of subsequent answer modifications once an answer is accepted (Must)
- [ ] `FR-ANS-005`: Local draft autosave for long-form answers without extending deadlines or submitting (Must)
- [ ] `FR-ANS-006`: Authoritative server acknowledgement; client displays success only upon receipt (Must)
- [ ] `FR-ANS-007`: Safe connection recovery without duplicating accepted submissions (Must)
- [ ] `FR-ANS-008`: Assessment completion marking with prevention of further changes (Must)
- [ ] `FR-ANS-009`: Mandatory client-generated Idempotency-Key on all submissions; duplicate keys return original result (Must)

### 5.7 Scoring and Evaluation (FR-SCORE)

- [x] `FR-SCORE-001`: Automated scoring of objective questions against the published assessment snapshot key (Must)
- [x] `FR-SCORE-002`: Configurable negative marking deduction for incorrect objective responses (Must)
- [x] `FR-SCORE-003`: Configurable partial credit for multi-select questions (Should)
- [x] `FR-SCORE-004`: Evaluation queue and scoring rubric for subjective/descriptive questions (Must)
- [x] `FR-SCORE-005`: Manual score entry and evaluator feedback comments (Must)
- [x] `FR-SCORE-006`: Configured scoring policy for timed-out or unanswered questions (Must)
- [x] `FR-SCORE-007`: Candidate and assessment-level aggregate score calculations (Must)
- [x] `FR-SCORE-008`: Provisional vs. Final result status handling (Must)
- [x] `FR-SCORE-009`: Result ranking calculation with deterministic tie-break criteria (Must)
- [x] `FR-SCORE-010`: Audited score correction workflow requiring original value, new value, reason, and actor (Must)

### 5.8 Technical Assessment and Coding Engine (FR-CODE)

- [x] `FR-CODE-001`: Support for C, C++, Java, Python, JavaScript with pinned versions in execution images (Must)
- [ ] `FR-CODE-002`: Integrated code editor (Monaco) in candidate application with language selector (Must)
- [x] `FR-CODE-003`: Support for visible sample test cases and execution testing (Must)
- [x] `FR-CODE-004`: Hidden test case configuration; hidden inputs and expected outputs never sent to client (Must)
- [x] `FR-CODE-005`: Code evaluation delegated to dedicated, isolated coding execution service (Must)
- [x] `FR-CODE-006`: Enforcement of execution time and memory limits per language (Must)
- [x] `FR-CODE-007`: Code execution in isolated sandbox (no network, unprivileged user, read-only root, tmpfs) (Must)
- [x] `FR-CODE-008`: Execution status classification (Accepted, WA, CE, RE, TLE, MLE, Internal Error) (Must)
- [x] `FR-CODE-009`: Candidate response sanitization; zero disclosure of internal paths, env vars, or test data (Must)
- [x] `FR-CODE-010`: Configurable maximum code submission count per question (Should)
- [x] `FR-CODE-011`: Weighted test-case scoring calculation (Must)
- [x] `FR-CODE-012`: Distinction between infrastructure failure and candidate code error; infra errors re-queued (Must)
- [x] `FR-CODE-013`: Coding execution service denied unrestricted access to DB or production secrets (Must)
- [x] `FR-CODE-014`: Configured source code and evaluation result retention policy (Must)

### 5.9 SQL Assessment (FR-SQL)

- [x] `FR-SQL-001`: SQL question authoring with schema, seed data, reference query, and expected output (Must)
- [x] `FR-SQL-002`: SQL execution against isolated ephemeral database instances with read-only roles (Must)
- [x] `FR-SQL-003`: Blocking of dangerous SQL commands (DROP, ALTER, CREATE, TRUNCATE, admin functions) (Must)
- [x] `FR-SQL-004`: Execution limits: statement timeout, maximum returned rows, memory bounds (Must)
- [x] `FR-SQL-005`: Result set comparison against expected output (exact match or unordered match) (Must)

### 5.10 Lab Device Registry and Lockdown (FR-LAB)

- [ ] `FR-LAB-001`: Registry of authorized lab devices (device ID, hostname, IP, MAC, location, status) (Should)
- [ ] `FR-LAB-002`: Unique identifier persistence per registered lab computer (Must)
- [ ] `FR-LAB-003`: Installed client version verification on connection; rejection of outdated versions with 426 (Must)
- [ ] `FR-LAB-004`: Device status management (Active, Suspended, Blocked) (Must)
- [ ] `FR-LAB-005`: OS-level and application-level kiosk mode lockdown during active assessment (Must)
- [ ] `FR-LAB-006`: Logging and reporting of security integrity events (focus loss, shortcuts, prohibited apps) (Must)
- [ ] `FR-LAB-007`: Documented lab staff technical recovery procedure (Must)
- [ ] `FR-LAB-008`: Lockdown enforcement relying on multi-layer controls beyond full-screen display alone (Must)

### 5.11 Audit Logging and Security Monitoring (FR-AUD)

- [x] `FR-AUD-001`: Immutable audit logging for administrative actions (overrides, publishes, edits, status) (Must)
- [x] `FR-AUD-002`: Audit logging for candidate session events (start, submit, timeout, disconnect) (Must)
- [ ] `FR-AUD-003`: Logging of auth events (successes, failures, lockouts, token revocations) (Must)
- [x] `FR-AUD-004`: Standardized audit schema: event_id, timestamp (UTC), actor, event_type, entity, outcome, IP (Must)
- [ ] `FR-AUD-005`: Write-only / append-only audit log protection; DB role prevented from UPDATE/DELETE (Must)
- [x] `FR-AUD-006`: Audit log search and filter by actor, event type, date range, entity, correlation ID (Must)
- [ ] `FR-AUD-007`: Audit metadata sanitization: passwords, tokens, and secrets strictly excluded (Must)

### 5.12 Administration and Monitoring (FR-ADMIN)

- [x] `FR-ADMIN-001`: Administrative dashboard with key platform metrics and operational status (Must)
- [x] `FR-ADMIN-002`: Real-time active assessment monitoring (sessions in progress, submissions, active candidates) (Must)
- [x] `FR-ADMIN-003`: Candidate profile and progress view for authorized administrators (Must)
- [x] `FR-ADMIN-004`: Assessment operational controls (pause, resume, archive) with confirmation (Must)
- [x] `FR-ADMIN-005`: Comprehensive assessment results report (scores, rankings, category breakdown) (Must)
- [x] `FR-ADMIN-006`: Export of results and candidate records in CSV and PDF formats (Must)
- [x] `FR-ADMIN-007`: Question-level performance analytics (difficulty index, discrimination, response time) (Should)
- [ ] `FR-ADMIN-008`: Assessment configuration cloning and templating (Should)
- [x] `FR-ADMIN-009`: Role-based administrative permissions enforcement (Super Admin, Evaluator) (Must)

### 5.13 Candidate User Interface (FR-UI)

- [ ] `FR-UI-001`: Post-login assigned assessments dashboard with eligibility, start window, attempts (Must)
- [ ] `FR-UI-002`: Mandatory instructions display with lockdown notice and explicit acknowledgment (Must)
- [ ] `FR-UI-003`: Single question presentation per screen in sequential examination mode (Must)
- [ ] `FR-UI-004`: Prominent server-synchronized countdown timer with low-time warning (Must)
- [ ] `FR-UI-005`: Read-only question status palette in sequential mode; Previous button hidden (Must)
- [ ] `FR-UI-006`: Explicit Submit and Next action with double-click and multiple-submission protection (Must)
- [ ] `FR-UI-007`: Visual timeout notifications and automatic transition to next question (Must)
- [ ] `FR-UI-008`: Connection status indicator notifying candidate of network interruptions (Must)
- [ ] `FR-UI-009`: Final submission confirmation screen displaying summary and completion timestamp (Must)

### 5.14 System Configuration Management (FR-CONF)

- [ ] `FR-CONF-001`: Administrative management of approved client versions and compatibility thresholds (Must)
- [ ] `FR-CONF-002`: Server-side validation of runtime configuration parameters (Must)
- [ ] `FR-CONF-003`: Audit logging of configuration changes with reason and actor (Must)
- [ ] `FR-CONF-004`: Dynamic retrieval of system operational policies by clients (Must)

---

## 6. Non-Functional Requirements

### 6.1 Security Requirements (NFR-SEC)

- [ ] `NFR-SEC-001`: Mandatory TLS 1.3/HTTPS across all external and internal API communication (Must)
- [ ] `NFR-SEC-002`: Argon2id password hashing with secure parameters; no plaintext credentials (Must)
- [ ] `NFR-SEC-003`: Least-privilege RBAC enforced across every API endpoint and database account (Must)
- [ ] `NFR-SEC-004`: Ephemeral session tokens with secure cookie/storage storage and server-side revocation (Must)
- [ ] `NFR-SEC-005`: Application bundle integrity and secret-free client builds (Must)
- [ ] `NFR-SEC-006`: OWASP API Security Top 10 hardening (CORS, CSP, security headers, rate limits) (Must)
- [ ] `NFR-SEC-007`: Strict input validation and parameterized queries preventing SQL injection (Must)
- [x] `NFR-SEC-008`: Multi-layer container isolation for coding execution service (seccomp, cgroups, tmpfs) (Must)
- [x] `NFR-SEC-009`: Complete prevention of candidate access to answer keys and hidden test inputs (Must)
- [ ] `NFR-SEC-010`: Tamper-evident audit storage with append-only access controls (Must)
- [ ] `NFR-SEC-011`: Automated security scanning in CI/CD pipeline (Must)
- [ ] `NFR-SEC-012`: Secrets managed exclusively via environment variables or secret managers (Must)

### 6.2 Performance Requirements (NFR-PERF)

- [ ] `NFR-PERF-001`: API p95 response time under 500ms for read requests at approved load (Must)
- [ ] `NFR-PERF-002`: p95 question delivery response time under 300ms (Must)
- [ ] `NFR-PERF-003`: p95 answer submission commit and ack time under 500ms (Must)
- [ ] `NFR-PERF-004`: Background expiry worker latency under 1000ms from scheduled deadline (Must)
- [ ] `NFR-PERF-005`: Coding submission queue execution p95 latency under 10s for supported runtimes (Must)

### 6.3 Reliability & Availability (NFR-REL)

- [ ] `NFR-REL-001`: Target 99.5% availability during examination windows (Must)
- [ ] `NFR-REL-002`: Durable database transaction commits before submission acknowledgement (Must)
- [ ] `NFR-REL-003`: Idempotent API endpoints preventing duplicate records on network retries (Must)
- [ ] `NFR-REL-004`: Seamless candidate session recovery following crash or reconnection (Must)
- [ ] `NFR-REL-005`: Structured error responses with unique correlation IDs and no internal stack traces (Must)
- [ ] `NFR-REL-006`: Automated backup procedures supporting RPO <= 15 min and RTO <= 4 hours (Must)

### 6.4 Scalability Requirements (NFR-SCALE)

- [ ] `NFR-SCALE-001`: Stateless API application tier supporting horizontal scaling (Must)
- [ ] `NFR-SCALE-002`: Database connection pooling and read-scaling readiness (Must)
- [ ] `NFR-SCALE-003`: Scalable asynchronous worker queue for coding and batch evaluation (Must)

### 6.5 Usability Requirements (NFR-USE)

- [x] `NFR-USE-001`: Clear, intuitive navigation and responsive layout across desktop and web (Must)
- [ ] `NFR-USE-002`: Prominent and non-obtrusive countdown timer display (Must)
- [x] `NFR-USE-003`: Transparent, candidate-friendly error messaging for system states (Must)
- [x] `NFR-USE-004`: Confirmation dialogs for destructive or irreversible actions (Must)
- [ ] `NFR-USE-005`: Accessibility compliance (keyboard navigation, high contrast, readable typography) (Must)

### 6.6 Compatibility Requirements (NFR-COMP)

- [ ] `NFR-COMP-001`: Candidate desktop client tested and validated on Windows 10/11 lab machines (Must)
- [x] `NFR-COMP-002`: Admin web dashboard compatibility with modern Evergreen browsers (Chrome, Edge, Firefox) (Must)
- [ ] `NFR-COMP-003`: Strict version handshake rejecting unsupported client versions with HTTP 426 (Must)

### 6.7 Maintainability & Documentation (NFR-MNT)

- [x] `NFR-MNT-001`: Modular monorepo architecture with clean separation of concerns (Must)
- [x] `NFR-MNT-002`: Consistent coding standards, linting, formatting, and strict TypeScript types (Must)
- [/] `NFR-MNT-003`: Comprehensive architecture, API (OpenAPI), and deployment documentation (Must)
- [x] `NFR-MNT-004`: Automated CI testing, linting, and typecheck gates on all branches (Must)
- [ ] `NFR-MNT-005`: Structured JSON logging with trace context and correlation IDs (Must)

### 6.8 Privacy & Data Protection (NFR-PRIV)

- [ ] `NFR-PRIV-001`: Candidate personal data collected solely for evaluation and recruitment purposes (Must)
- [ ] `NFR-PRIV-002`: Role-based access control restricting candidate personal details (Must)
- [ ] `NFR-PRIV-003`: Configurable data retention and purging policies for candidate records and code (Must)
- [ ] `NFR-PRIV-004`: Clear privacy and lockdown disclosure presented before assessment commencement (Must)

---

## 7. Developer Implementation Status

### Developer B: Ashlin Siddharth (Frontend & Execution Lead)

- **Ownership**: `apps/admin-web` (and `services/code-runner` in Phase 3/5).
- **Branch**: `phase-5/B-coding-sql-assessment`
- **Phase 1 Completion Status**:
  - [x] `FR-ADMIN-001`: Admin dashboard key metrics, stat cards, live activity, completion chart, and upcoming tests (Done)
  - [x] `FR-ADMIN-009`: Role-based navigation permissions (`SUPER_ADMIN` vs `TECHNICAL_EVALUATOR`) (Done)
  - [x] `NFR-USE-001`: Navy sidebar and responsive layout matching `UI_Sample.jpeg` (Done)
  - [x] `NFR-USE-003`: Transparent toast error messaging with correlation IDs (Done)
  - [x] `NFR-COMP-002`: Evergreen browser compatibility (Chrome, Edge, Firefox) (Done)
  - [/] `FR-AUTH-001`: Super Admin login screen and client validation (Partial - client complete, awaiting Dev A API merge)
  - [/] `FR-AUTH-004`: Rate-limiting error toast handling (Partial - client complete)
  - [/] `FR-AUTH-007`: Token refresh interceptor and session store (Partial - client complete)
  - [/] `FR-AUTH-008`: 6-digit TOTP MFA verification screen (Partial - client complete)
  - [/] `FR-ADMIN-002`: Active candidate counter and monitoring overview (Partial - client complete)
  - [/] `FR-ADMIN-003`: Completion donut chart breakdown (Partial - client complete)

- **Phase 2 Completion Status**:
  - [x] `FR-CAN-001`: Candidate record creation with complete profile fields and account status (Done)
  - [x] `FR-CAN-002`: Profile modification and search/filter by candidate ID, name, email, institution, drive (Done)
  - [x] `FR-CAN-003`: Bulk candidate import via CSV with validated template and per-row error reporting (Done)
  - [x] `FR-CAN-004`: Candidate assignment to one or more assessments individually or by cohort/group (Done)
  - [x] `FR-CAN-005`: Removal/revocation of candidate assignments before assessment start and account deactivation (Done)
  - [x] `FR-CAN-006`: Candidate login and activity history logging inspection in slide-out drawer (Done)
  - [x] `FR-CAN-007`: Enforcement of unique candidate IDs and usernames in UI/forms (Done)
  - [x] `FR-QB-001`: Question creation with text, type, category, difficulty, marks, and explanation (Done)
  - [x] `FR-QB-002`: Question categorization by topic, skill, and difficulty (Done)
  - [x] `FR-QB-003`: Support for question formats: Single MCQ, Multi MCQ, True/False, Short Answer, Descriptive, Scenario (Done)
  - [x] `FR-QB-004`: Option management for objective questions with server-side protected correct answer storage (Done)
  - [x] `FR-QB-005`: Configurable question time limits in seconds (Done)
  - [x] `FR-QB-006`: Rich-text/formatted code snippets in question statements (Done)
  - [x] `FR-QB-007`: Question search and filter by keyword, topic, difficulty, and type (Done)
  - [x] `FR-QB-008`: Question editing before assignment with immutability for active sessions (Done)
  - [x] `FR-QB-009`: Question deactivation/archival preventing new usage without altering existing records (Done)
  - [x] `FR-ASMT-001`: Assessment creation with title, role category, instructions, schedule, duration, attempt limit (Done)
  - [x] `FR-ASMT-002`: Configuration of per-question limits, overall limits, marking rules, negative marking, randomization (Done)
  - [x] `FR-ASMT-003`: Assessment editing before candidate commencement with versioned snapshot on publish (Done)
  - [x] `FR-ASMT-004`: Validation ensuring sum of question limits do not exceed overall duration (Done)
  - [x] `FR-ASMT-005`: Assessment status state machine: Draft, Scheduled, Active, Completed, Suspended, Archived (Done)
  - [x] `FR-ASMT-006`: Assessment scheduling with enforced start/end availability windows (Done)
  - [x] `FR-ASMT-007`: Assessment attempt limit enforcement per candidate (default: 1) (Done)
  - [x] `FR-ASMT-008`: Result visibility policy configuration (immediate, scheduled, or administrator release) (Done)
  - [x] `FR-AUTH-005`: Super Admin candidate password reset with temporary credential generation (Done)
  - [x] `FR-AUTH-006`: Account deactivation preventing new sessions and enforcing session revocation (Done)
  - [x] `FR-AUTH-009`: Secure temporary credential provisioning; credentials excluded from exports and logs (Done)
  - [x] `NFR-USE-004`: Confirmation dialogs for destructive or irreversible actions (Must) (Done)

- **Phase 3 Completion Status**:
  - [x] `FR-ADMIN-001`: Live sessions monitoring with real-time candidate session telemetry cards (Done)
  - [x] `FR-ADMIN-002`: Real-time session monitoring table with auto-refresh polling (Off, 10s, 30s, 60s) and manual refresh (Done)
  - [x] `FR-ADMIN-004`: Assessment operational lifecycle controls (Suspend, Resume, Archive) with confirmation dialogs (Done)
  - [x] `FR-ADMIN-005`: Assessment status state transitions (`SUSPENDED`, `ACTIVE`, `ARCHIVED`) with mandatory reason input (Done)
  - [x] `FR-ADMIN-007`: Operational audit logs search and multi-parameter filtering with correlation ID lookup (Done)
  - [x] `FR-ADMIN-008`: Incident log view for technical evaluators and lab supervisors (SRS 11.4) (Done)
  - [x] `FR-TIME-001`: Server-authoritative timer countdown with visual low-time warning when < 5 mins (Done)
  - [x] `FR-TIME-002`: Real-time session state telemetry tracking (`ACTIVE`, `INTERRUPTED`, `PAUSED`, `SUBMITTED`, `EXPIRED`) (Done)
  - [x] `FR-TIME-011`: Server-authoritative administrative session overrides (`EXTEND`, `REOPEN`, `PAUSE`, `RESUME`, `CANCEL`) (Done)
  - [x] `BR-012`: Mandatory justification reason enforcement on every administrative override dialog (Done)
  - [x] `FR-CAN-006`: Candidate detail drawer attempt and submission telemetry tracking (Done)
  - [x] `FR-AUD-001`: Immutable audit logging for administrative actions (overrides, publishes, edits, status) (Done)
  - [x] `FR-AUD-002`: Candidate session lifecycle audit event tracking (Done)
  - [x] `FR-AUD-004`: Standardized audit schema: timestamp (UTC), actor, event_type, entity, outcome, correlation ID, IP (Done)
  - [x] `FR-AUD-006`: Multi-dimensional audit log search, filter, and CSV export (Done)
  - [x] `Rule 1`: Untrusted client clocks; server-authoritative timer display (Done)
  - [x] `Rule 7`: Mandatory justification reason and actor attribution for overrides, score changes, publishes, status transitions (Done)
  - [x] `Rule 9`: UTC ISO-8601 timestamps and correlation ID traceability across all responses and logs (Done)

- **Phase 4 Completion Status**:
  - [x] `FR-SCORE-001`: Automated scoring of objective questions against published assessment snapshot key (Done)
  - [x] `FR-SCORE-002`: Configurable negative marking deduction for incorrect objective responses (Done)
  - [x] `FR-SCORE-003`: Configurable partial credit for multi-select questions (Done)
  - [x] `FR-SCORE-004`: Evaluation queue and scoring rubric for subjective/descriptive questions (`UC-14`) (Done)
  - [x] `FR-SCORE-005`: Manual score entry and evaluator feedback comments (`UC-14`) (Done)
  - [x] `FR-SCORE-006`: Configured scoring policy for timed-out or unanswered questions (Done)
  - [x] `FR-SCORE-007`: Candidate and assessment-level aggregate score calculations (Done)
  - [x] `FR-SCORE-008`: Provisional vs. Final result status handling with pending subjective count (Done)
  - [x] `FR-SCORE-009`: Result ranking calculation with deterministic tie-break criteria (Score ↓, Time ↑, ID ↑) (Done)
  - [x] `FR-SCORE-010`: Audited score correction workflow requiring original value, new value, reason, actor (`UC-15`) (Done)
  - [x] `FR-ADMIN-001`: Admin dashboard overview metrics and operational status cards with real data (Done)
  - [x] `FR-ADMIN-003`: Candidate profile, score breakdown, and completion rate breakdown chart (Done)
  - [x] `FR-ADMIN-005`: Comprehensive assessment results report (scores, rankings, category breakdown) (Done)
  - [x] `FR-ADMIN-006`: Export of results in CSV format with ISO-8601 UTC timestamps (Done)
  - [x] `FR-ADMIN-007`: Question-level performance analytics (difficulty index, discrimination index, option distribution) (Done)
  - [x] `FR-ADMIN-009`: Role-based permissions enforcement (`SUPER_ADMIN` score correction vs. `TECHNICAL_EVALUATOR` queue) (Done)
  - [x] `BR-012`: Mandatory justification reason required for every administrative override and score adjustment (Done)
  - [x] `Rule 7`: All score adjustments, overrides, and status transitions audited with reason and actor (Done)
  - [x] `Rule 9`: UTC ISO-8601 timestamps and correlation ID traceability across all responses and logs (Done)

- **Phase 5 Completion Status**:
  - [x] `FR-CODE-001`: Multi-language execution support (C, C++, Java, Python, JavaScript) with pinned Docker images (Done)
  - [x] `FR-CODE-003`: Visible sample test case execution testing and candidate output review (Done)
  - [x] `FR-CODE-004`: Hidden test case configuration; hidden inputs and expected outputs strictly concealed (Done)
  - [x] `FR-CODE-005`: Isolated coding execution microservice (`services/code-runner`) separate from API process (Done)
  - [x] `FR-CODE-006`: Configurable execution time limit and memory limit enforcement per language (Done)
  - [x] `FR-CODE-007`: Hardened sandbox (unprivileged user 10001:10001, read-only root, small tmpfs, no network) (Done)
  - [x] `FR-CODE-008`: Standardized execution status classification (`ACCEPTED`, `WA`, `CE`, `RE`, `TLE`, `MLE`, `INTERNAL_ERROR`) (Done)
  - [x] `FR-CODE-009`: Response sanitization; internal paths, environment variables, and hidden test data scrubbed (Done)
  - [x] `FR-CODE-010`: Configurable maximum code submission count per coding question in authoring modal (Done)
  - [x] `FR-CODE-011`: Weighted test-case scoring calculation per passed test case marks (Done)
  - [x] `FR-CODE-012`: Distinction between internal runner infrastructure errors and candidate code errors (Done)
  - [x] `FR-CODE-013`: Coding execution service denied DB/secret access; protected by internal token auth (Done)
  - [x] `FR-CODE-014`: Source code and structured evaluation result persistence schema (Done)
  - [x] `FR-SQL-001`: SQL question authoring with schema DDL, seed data, reference query, and expected output (Done)
  - [x] `FR-SQL-002`: Ephemeral in-memory SQLite sandbox initialized per execution with read-only sandbox (Done)
  - [x] `FR-SQL-003`: Destructive SQL command blocking (`DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `ATTACH`, `PRAGMA`) (Done)
  - [x] `FR-SQL-004`: SQL execution limits: statement timeout, maximum returned rows, memory bounds (Done)
  - [x] `FR-SQL-005`: SQL result set comparison against expected output (`EXACT_MATCH` vs `UNORDERED_MATCH`) (Done)
  - [x] `NFR-SEC-008`: Sandboxing, memory bounds, CPU bounds, output truncation, cloud metadata blocking (Done)
  - [x] `NFR-SEC-009`: Complete prevention of candidate access to answer keys and hidden test inputs (Done)
  - [x] `TC-10`: Hidden test case confidentiality verification (Done)
  - [x] `TC-11`: Sandbox escape suite (sockets, env vars, fork bomb, huge output, infinite loop, file writes) (Done)
  - [x] `TC-12`: Resource limit enforcement (Done)
  - [x] `Rule 8`: Candidate code never runs in API process (Done)
  - [x] `Rule 2`: Candidate-facing APIs never return answer keys or hidden test cases (Done)
