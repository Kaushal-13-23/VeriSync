# VeriSync Implementation Progress Checklist

This document tracks implementation status across all functional and non-functional requirements defined in `docs/SRS/srs.md`.

Status Legend:

- [ ] **Pending** (Not started)
- [/] **Partial** (In progress / partially implemented)
- [x] **Done** (Fully implemented, tested, and verified)

---

## 5. Functional Requirements

### 5.1 Authentication and Account Management (FR-AUTH)

- [ ] `FR-AUTH-001`: Secure Super Admin login with server-side credential validation (Must)
- [ ] `FR-AUTH-002`: Candidate login requiring administrator-issued credentials; no self-registration (Must)
- [ ] `FR-AUTH-003`: Passwords stored using Argon2id; no plaintext passwords in DB or logs (Must)
- [ ] `FR-AUTH-004`: Rate-limiting on login endpoints with temporary lockout on repeated failures (Must)
- [ ] `FR-AUTH-005`: Super Admin initiated candidate password reset workflow without exposing old password (Must)
- [ ] `FR-AUTH-006`: Account deactivation preventing new sessions and enforcing session revocation (Must)
- [ ] `FR-AUTH-007`: Backend session state management enforcing expiry, revocation, and RBAC authorization (Must)
- [ ] `FR-AUTH-008`: Multi-factor authentication (TOTP) support for privileged administrator accounts (Must)
- [ ] `FR-AUTH-009`: Secure temporary credential provisioning; credentials excluded from exports and logs (Must)
- [ ] `FR-AUTH-010`: Candidate session token bound to registered lab device and approved client version (Should)

### 5.2 Candidate Management (FR-CAN)

- [ ] `FR-CAN-001`: Candidate record creation with complete profile fields and account status (Must)
- [ ] `FR-CAN-002`: Profile modification and search/filter by candidate ID, name, email, institution, drive (Must)
- [ ] `FR-CAN-003`: Bulk candidate import via CSV with validated template and per-row error reporting (Should)
- [ ] `FR-CAN-004`: Candidate assignment to one or more assessments individually or by cohort/group (Must)
- [ ] `FR-CAN-005`: Removal/revocation of candidate assignments before assessment start (Must)
- [ ] `FR-CAN-006`: Candidate login and activity history logging (Must)
- [ ] `FR-CAN-007`: Enforcement of unique candidate IDs and usernames (Must)

### 5.3 Question Bank Management (FR-QB)

- [ ] `FR-QB-001`: Question creation with text, type, category, difficulty, marks, and explanation (Must)
- [ ] `FR-QB-002`: Question categorization by topic, skill, and difficulty (Must)
- [ ] `FR-QB-003`: Support for question formats: Single MCQ, Multi MCQ, True/False, Short Answer, Descriptive, Scenario (Must)
- [ ] `FR-QB-004`: Option management for objective questions with server-side protected correct answer storage (Must)
- [ ] `FR-QB-005`: Configurable question time limits (Must)
- [ ] `FR-QB-006`: Rich-text/formatted code snippets in question statements (Must)
- [ ] `FR-QB-007`: Question search and filter by keyword, topic, difficulty, and type (Must)
- [ ] `FR-QB-008`: Question editing before assignment with immutability for active sessions (Must)
- [ ] `FR-QB-009`: Question deactivation/archival preventing new usage without altering existing records (Must)
- [ ] `FR-QB-010`: Test case configuration for programming questions with sample and hidden designations (Must)

### 5.4 Assessment Management (FR-ASMT)

- [ ] `FR-ASMT-001`: Assessment creation with title, role category, instructions, schedule, duration, attempt limit (Must)
- [ ] `FR-ASMT-002`: Configuration of per-question limits, overall limits, marking rules, negative marking, randomization (Must)
- [ ] `FR-ASMT-003`: Assessment editing before candidate commencement with versioned snapshot on publish (Must)
- [ ] `FR-ASMT-004`: Validation ensuring sum of question limits or individual limits do not exceed overall duration (Must)
- [ ] `FR-ASMT-005`: Assessment status state machine: Draft, Scheduled, Active, Completed, Suspended, Archived (Must)
- [ ] `FR-ASMT-006`: Assessment scheduling with enforced start/end availability windows (Must)
- [ ] `FR-ASMT-007`: Assessment attempt limit enforcement per candidate (default: 1) (Must)
- [ ] `FR-ASMT-008`: Result visibility policy configuration (immediate, scheduled, or administrator release) (Must)

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

- [ ] `FR-SCORE-001`: Automated scoring of objective questions against the published assessment snapshot key (Must)
- [ ] `FR-SCORE-002`: Configurable negative marking deduction for incorrect objective responses (Must)
- [ ] `FR-SCORE-003`: Configurable partial credit for multi-select questions (Should)
- [ ] `FR-SCORE-004`: Evaluation queue and scoring rubric for subjective/descriptive questions (Must)
- [ ] `FR-SCORE-005`: Manual score entry and evaluator feedback comments (Must)
- [ ] `FR-SCORE-006`: Configured scoring policy for timed-out or unanswered questions (Must)
- [ ] `FR-SCORE-007`: Candidate and assessment-level aggregate score calculations (Must)
- [ ] `FR-SCORE-008`: Provisional vs. Final result status handling (Must)
- [ ] `FR-SCORE-009`: Result ranking calculation with deterministic tie-break criteria (Must)
- [ ] `FR-SCORE-010`: Audited score correction workflow requiring original value, new value, reason, and actor (Must)

### 5.8 Technical Assessment and Coding Engine (FR-CODE)

- [ ] `FR-CODE-001`: Support for C, C++, Java, Python, JavaScript with pinned versions in execution images (Must)
- [ ] `FR-CODE-002`: Integrated code editor (Monaco) in candidate application with language selector (Must)
- [ ] `FR-CODE-003`: Support for visible sample test cases and execution testing (Must)
- [ ] `FR-CODE-004`: Hidden test case configuration; hidden inputs and expected outputs never sent to client (Must)
- [ ] `FR-CODE-005`: Code evaluation delegated to dedicated, isolated coding execution service (Must)
- [ ] `FR-CODE-006`: Enforcement of execution time and memory limits per language (Must)
- [ ] `FR-CODE-007`: Code execution in isolated sandbox (no network, unprivileged user, read-only root, tmpfs) (Must)
- [ ] `FR-CODE-008`: Execution status classification (Accepted, WA, CE, RE, TLE, MLE, Internal Error) (Must)
- [ ] `FR-CODE-009`: Candidate response sanitization; zero disclosure of internal paths, env vars, or test data (Must)
- [ ] `FR-CODE-010`: Configurable maximum code submission count per question (Should)
- [ ] `FR-CODE-011`: Weighted test-case scoring calculation (Must)
- [ ] `FR-CODE-012`: Distinction between infrastructure failure and candidate code error; infra errors re-queued (Must)
- [ ] `FR-CODE-013`: Coding execution service denied unrestricted access to DB or production secrets (Must)
- [ ] `FR-CODE-014`: Configured source code and evaluation result retention policy (Must)

### 5.9 SQL Assessment (FR-SQL)

- [ ] `FR-SQL-001`: SQL question authoring with schema, seed data, reference query, and expected output (Must)
- [ ] `FR-SQL-002`: SQL execution against isolated ephemeral database instances with read-only roles (Must)
- [ ] `FR-SQL-003`: Blocking of dangerous SQL commands (DROP, ALTER, CREATE, TRUNCATE, admin functions) (Must)
- [ ] `FR-SQL-004`: Execution limits: statement timeout, maximum returned rows, memory bounds (Must)
- [ ] `FR-SQL-005`: Result set comparison against expected output (exact match or unordered match) (Must)

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

- [ ] `FR-AUD-001`: Immutable audit logging for administrative actions (overrides, publishes, edits, status) (Must)
- [ ] `FR-AUD-002`: Audit logging for candidate session events (start, submit, timeout, disconnect) (Must)
- [ ] `FR-AUD-003`: Logging of auth events (successes, failures, lockouts, token revocations) (Must)
- [ ] `FR-AUD-004`: Standardized audit schema: event_id, timestamp (UTC), actor, event_type, entity, outcome, IP (Must)
- [ ] `FR-AUD-005`: Write-only / append-only audit log protection; DB role prevented from UPDATE/DELETE (Must)
- [ ] `FR-AUD-006`: Audit log search and filter by actor, event type, date range, entity, correlation ID (Must)
- [ ] `FR-AUD-007`: Audit metadata sanitization: passwords, tokens, and secrets strictly excluded (Must)

### 5.12 Administration and Monitoring (FR-ADMIN)

- [ ] `FR-ADMIN-001`: Administrative dashboard with key platform metrics and operational status (Must)
- [ ] `FR-ADMIN-002`: Real-time active assessment monitoring (sessions in progress, submissions, active candidates) (Must)
- [ ] `FR-ADMIN-003`: Candidate profile and progress view for authorized administrators (Must)
- [ ] `FR-ADMIN-004`: Assessment operational controls (pause, resume, archive) with confirmation (Must)
- [ ] `FR-ADMIN-005`: Comprehensive assessment results report (scores, rankings, category breakdown) (Must)
- [ ] `FR-ADMIN-006`: Export of results and candidate records in CSV and PDF formats (Must)
- [ ] `FR-ADMIN-007`: Question-level performance analytics (difficulty index, discrimination, response time) (Should)
- [ ] `FR-ADMIN-008`: Assessment configuration cloning and templating (Should)
- [ ] `FR-ADMIN-009`: Role-based administrative permissions enforcement (Super Admin, Evaluator) (Must)

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
- [ ] `NFR-SEC-008`: Multi-layer container isolation for coding execution service (seccomp, cgroups, tmpfs) (Must)
- [ ] `NFR-SEC-009`: Complete prevention of candidate access to answer keys and hidden test inputs (Must)
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

- [ ] `NFR-USE-001`: Clear, intuitive navigation and responsive layout across desktop and web (Must)
- [ ] `NFR-USE-002`: Prominent and non-obtrusive countdown timer display (Must)
- [ ] `NFR-USE-003`: Transparent, candidate-friendly error messaging for system states (Must)
- [ ] `NFR-USE-004`: Confirmation dialogs for destructive or irreversible actions (Must)
- [ ] `NFR-USE-005`: Accessibility compliance (keyboard navigation, high contrast, readable typography) (Must)

### 6.6 Compatibility Requirements (NFR-COMP)

- [ ] `NFR-COMP-001`: Candidate desktop client tested and validated on Windows 10/11 lab machines (Must)
- [ ] `NFR-COMP-002`: Admin web dashboard compatibility with modern Evergreen browsers (Chrome, Edge, Firefox) (Must)
- [ ] `NFR-COMP-003`: Strict version handshake rejecting unsupported client versions with HTTP 426 (Must)

### 6.7 Maintainability & Documentation (NFR-MNT)

- [ ] `NFR-MNT-001`: Modular monorepo architecture with clean separation of concerns (Must)
- [ ] `NFR-MNT-002`: Consistent coding standards, linting, formatting, and strict TypeScript types (Must)
- [ ] `NFR-MNT-003`: Comprehensive architecture, API (OpenAPI), and deployment documentation (Must)
- [ ] `NFR-MNT-004`: Automated CI testing, linting, and typecheck gates on all branches (Must)
- [ ] `NFR-MNT-005`: Structured JSON logging with trace context and correlation IDs (Must)

### 6.8 Privacy & Data Protection (NFR-PRIV)

- [ ] `NFR-PRIV-001`: Candidate personal data collected solely for evaluation and recruitment purposes (Must)
- [ ] `NFR-PRIV-002`: Role-based access control restricting candidate personal details (Must)
- [ ] `NFR-PRIV-003`: Configurable data retention and purging policies for candidate records and code (Must)
- [ ] `NFR-PRIV-004`: Clear privacy and lockdown disclosure presented before assessment commencement (Must)
