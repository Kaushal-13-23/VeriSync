# VeriSync Phase 5 Report: Developer B (Ashlin Siddharth)

**Role**: Frontend & Execution Lead (Developer B)  
**Branch**: `phase-5/B-coding-sql-assessment`  
**Owned Subsystems**: `services/code-runner`, `apps/admin-web`  
**Date**: October 29, 2026  
**Status**: Completed, 100% Green Quality Gates (Build, Lint, Typecheck, 16 Code-Runner Tests, 67 Admin-Web Tests across 18 files)

---

## 1. What Was Built

In Phase 5, Developer B implemented the secure, standalone code and SQL execution microservice (`services/code-runner`) and the Question Bank authoring UI extensions in `apps/admin-web` for Coding and SQL assessment types, strictly complying with **Non-Negotiable Rule 8** (Candidate code never runs in the API process) and **Non-Negotiable Rule 2** (Candidate-facing APIs never return answer keys or hidden test cases).

---

### 1.1 Secure Code Runner Microservice (`services/code-runner`)

Built a dedicated, container-ready evaluation microservice isolated from the primary API process:

- **Pinned Language Docker Environments (`docker/`)**:
  - `c.Dockerfile`: Alpine 3.19.1 with GCC 13.2, unprivileged user `sandbox:10001:10001`.
  - `cpp.Dockerfile`: Alpine 3.19.1 with G++ 13.2 (C++20 standard), user `sandbox:10001:10001`.
  - `java.Dockerfile`: Eclipse Temurin 21 JDK on Alpine, user `sandbox:10001:10001`.
  - `python.Dockerfile`: Python 3.11.8 on Alpine Linux, user `sandbox:10001:10001`.
  - `javascript.Dockerfile`: Node.js 20.11.1 on Alpine Linux, user `sandbox:10001:10001`.
- **Hardened Container & Process Sandbox Security (`src/security/container-flags.ts`, `src/runners/process-runner.ts`)**:
  - **No Network Access**: `--network none` flag blocks all outbound/inbound network traffic (`FR-CODE-007`).
  - **Unprivileged UID/GID**: Enforces execution as UID `10001:10001` with `--user 10001:10001`.
  - **Read-Only Root Filesystem**: `--read-only` flag ensures immutable root OS filesystem.
  - **Isolated Ephemeral Workdir**: `--tmpfs /tmp:rw,noexec,nosuid,size=64m` provides an isolated, volatile scratch directory.
  - **Privilege Escalation Prevention**: `--security-opt no-new-privileges:true` and `--cap-drop ALL` drop all Linux capabilities (`NFR-SEC-008`).
  - **Cgroup Resource Caps**: Restricts CPU quota (`--cpus=1.0`), memory bounds (`--memory=256m`), and process limit (`--pids-limit 64`) to prevent fork bombs (`TC-11`).
  - **Cloud Metadata Protection**: Static routing and flags block access to AWS/GCP/Azure instance metadata IP `169.254.169.254`.
  - **Process Execution Fallback**: `ProcessSandboxRunner` executes code in an isolated subprocess with stripped environment variables (`env: {}`), wall-clock and CPU timeout monitors, SIGKILL termination on timeout, 64KB output truncation buffer, and automatic ephemeral directory scrubbing (`SRS 10.4`).
- **Internal Authentication & Secret Isolation (`src/security/auth-guard.ts`, `src/config.ts`)**:
  - Internal HTTP API protected by shared secret token (`x-code-runner-token`), preventing unauthorized invocation (`FR-CODE-013`).
  - No database connection strings, application credentials, or production secrets are ever passed to or mounted in the sandbox runner (`FR-CODE-013`).
- **Input Sanitization & Response Sanitization (`src/security/input-sanitizer.ts`)**:
  - Source code size cap enforced at 64 KB (`FR-CODE-007`).
  - Output truncation cap enforced at 64 KB to mitigate memory flooding attacks (`TC-11`).
  - Stack trace and filesystem path scrubber redacts internal server paths (e.g., `C:\...`, `/tmp/...`) from runtime stderr and compiler error outputs (`FR-CODE-009`).
  - **Confidentiality Guarantee (`TC-10`, `FR-CODE-004`, `Rule 2`)**: Hidden test case inputs, expected outputs, and actual execution outputs are never returned to callers for candidate responses; only sample test cases include actual outputs.
- **Structured Execution Status Classification (`src/types.ts`, `FR-CODE-008`)**:
  - Returns strictly standardized statuses: `ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `INTERNAL_EVALUATION_ERROR`.
  - Calculates weighted scoring across sample and hidden test cases (`FR-CODE-011`).

---

### 1.2 Ephemeral SQL Evaluation Engine (`src/sql/sql-sandbox.ts`)

- **In-Memory SQLite Sandbox**:
  - Uses native Node.js SQLite (`node:sqlite`) for zero-dependency, ephemeral database initialization.
  - Per-execution schema generation from teacher DDL and seed data.
  - Enforces read-only permissions after schema initialization (`FR-SQL-002`).
- **Destructive Command Blocker (`FR-SQL-003`)**:
  - Scans and blocks dangerous SQL keywords: `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `ATTACH`, `DETACH`, `PRAGMA`, `VACUUM`, `REINDEX`.
- **Execution Limits & Comparison Modes (`FR-SQL-004`, `FR-SQL-005`)**:
  - Row limit cap (default: 500 rows).
  - Statement timeout guard (default: 3,000 ms).
  - Comparison modes:
    - `EXACT_MATCH`: Verifies exact ordered match of row data and column sequencing.
    - `UNORDERED_MATCH`: Verifies multi-set equivalence across rows regardless of row order.

---

### 1.3 Question Bank Authoring UI in `apps/admin-web`

- **Interactive Question Type Switcher (`QuestionFormModal.tsx`)**:
  - Added dedicated tabs for `Coding Sandbox` and `SQL Query Sandbox` alongside Objective and Subjective authoring modes.
- **Coding Assessment Authoring Panel (`FR-CODE-001..010`)**:
  - Allowed Languages selector with multi-select checkboxes: C (GCC 13.2), C++ (G++ 20), Java (OpenJDK 21), Python (3.11), JavaScript (Node 20).
  - Execution Time Limit input (milliseconds, default: 2000 ms).
  - Memory Limit input (megabytes, default: 256 MB).
  - Max Submissions limit input (default: 10, configurable per `FR-CODE-010`).
  - **Sample Test Cases Editor**: Visible to candidates, with Stdin input and Expected Stdout fields.
  - **Hidden Test Cases Editor**: Protected test cases with Stdin, Expected Stdout, and individual Point Mark weights (`FR-CODE-004`, `FR-CODE-011`).
- **SQL Assessment Authoring Panel (`FR-SQL-001..005`)**:
  - Schema DDL textarea (table creation script).
  - Seed Data SQL textarea (initial `INSERT` statements).
  - Reference Solution Query textarea (teacher's SQL query producing golden dataset).
  - Result Comparison Mode selector (`EXACT_MATCH` vs `UNORDERED_MATCH`).
- **Question Table Enhancements (`QuestionTable.tsx`)**:
  - Badges displaying allowed programming languages and test case counts for coding questions.
  - Badges displaying comparison mode for SQL questions.
- **MSW Mock Handlers & Seed Data (`src/mocks/handlers.ts`)**:
  - Persists `codingConfig` and `sqlConfig` on question creation and updates.
  - Seeded two comprehensive questions: `q-107` (Two Sum Coding question with C/C++/Java/Python/JS and sample + hidden test cases) and `q-108` (Department Salary SQL question with DDL, seed data, and reference query).

---

## 2. Endpoints, Screens, and Modules Added

| Layer            | Subsystem / Path           | Description                                                                           | Traceability                                |
| :--------------- | :------------------------- | :------------------------------------------------------------------------------------ | :------------------------------------------ |
| **Microservice** | `GET /api/v1/health`       | Code runner service health and version check                                          | `SRS 10.4`                                  |
| **Microservice** | `POST /api/v1/execute`     | Executes code against sample and hidden test cases in sandbox                         | `FR-CODE-001..014`, `NFR-SEC-008`, `Rule 8` |
| **Microservice** | `POST /api/v1/execute-sql` | Executes candidate SQL against ephemeral SQLite database                              | `FR-SQL-001..005`                           |
| **Admin UI**     | `QuestionFormModal.tsx`    | Coding sandbox configuration & test cases authoring tab                               | `FR-CODE-001..010`, `FR-QB-001`             |
| **Admin UI**     | `QuestionFormModal.tsx`    | SQL sandbox DDL, seed, query, comparison mode authoring tab                           | `FR-SQL-001..005`                           |
| **Admin UI**     | `QuestionTable.tsx`        | Language tags, test case badges, comparison mode chips                                | `FR-QB-007`                                 |
| **Admin Types**  | `types/api.ts`             | `SupportedLanguage`, `SqlComparisonMode`, `CodingQuestionConfig`, `SqlQuestionConfig` | Contract parity                             |

---

## 3. SRS Requirements Covered

| SRS ID        | Requirement Title         | Implementation Details                                                                                                                        |
| :------------ | :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `FR-CODE-001` | Pinned Language Versions  | Dockerfiles for GCC 13.2, C++20, JDK 21, Python 3.11.8, Node 20.11.1                                                                          |
| `FR-CODE-003` | Visible Sample Test Cases | Authoring UI & runner support for candidate-visible sample tests                                                                              |
| `FR-CODE-004` | Hidden Test Case Secrecy  | Hidden inputs and expected outputs never returned in candidate results (`Rule 2`)                                                             |
| `FR-CODE-005` | Dedicated Runner Service  | Standalone `services/code-runner` microservice outside API process (`Rule 8`)                                                                 |
| `FR-CODE-006` | Execution Limits          | Timeout (wall/CPU) and memory limits enforced per execution                                                                                   |
| `FR-CODE-007` | Isolated Sandbox          | `--network none`, unprivileged user, `--read-only`, tmpfs, `--pids-limit`                                                                     |
| `FR-CODE-008` | Status Classification     | `ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `INTERNAL_EVALUATION_ERROR` |
| `FR-CODE-009` | Response Sanitization     | Path and stack trace scrubbing; zero disclosure of server paths or hidden inputs                                                              |
| `FR-CODE-010` | Max Submissions Limit     | Configurable submission attempt limits on coding questions                                                                                    |
| `FR-CODE-011` | Weighted Scoring          | Points-weighted calculation based on passed test cases                                                                                        |
| `FR-CODE-012` | Infra vs. Code Error      | Distinction between candidate code error and internal runner crash                                                                            |
| `FR-CODE-013` | No Secrets or DB Access   | Runner has no database access or production secrets; protected by shared token                                                                |
| `FR-SQL-001`  | SQL Authoring             | Schema DDL, seed data, reference query, and comparison mode authoring                                                                         |
| `FR-SQL-002`  | Ephemeral DB Instance     | In-memory isolated SQLite instance initialized per execution                                                                                  |
| `FR-SQL-003`  | Block Dangerous SQL       | Blocks `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `ATTACH`, `PRAGMA`                                                                              |
| `FR-SQL-004`  | SQL Limits                | Statement timeout, row limits, memory bounds                                                                                                  |
| `FR-SQL-005`  | SQL Comparison Modes      | Exact match and unordered match evaluation                                                                                                    |
| `NFR-SEC-008` | Sandbox Security          | Complete confinement flags and resource limits for containerized run                                                                          |
| `TC-10`       | Test Case Confidentiality | Unit tests verifying hidden cases are never exposed                                                                                           |
| `TC-11`       | Sandbox Escape Suite      | Security test suite covering sockets, env vars, fork bomb, huge output, infinite loop, file writes                                            |
| `TC-12`       | Resource Limits           | Wall time and memory limit enforcement tests                                                                                                  |

---

## 4. Tests Added & Verification

### 4.1 Code Runner Test Suite (`services/code-runner/tests/`)

- **`sandbox-escape.test.ts` (`TC-11` Sandbox Escape Suite - 5 tests)**:
  - `[TC-11.1]` Strips sensitive environment variables from execution context (`PATH`, `DATABASE_URL`, `AWS_SECRET_ACCESS_KEY`).
  - `[TC-11.2]` Terminates infinite loop execution via wall-clock timeout (`TIME_LIMIT_EXCEEDED`).
  - `[TC-11.3]` Caps massive stdout flooding attacks to maximum 64KB buffer.
  - `[TC-11.4]` Traps socket connection and network socket creations.
  - `[TC-11.5]` Restricts arbitrary write attempts outside sandboxed work directory.
- **`code-evaluation.test.ts` (3 tests)**:
  - `[FR-CODE-001, FR-CODE-008]` Evaluates Python candidate code against sample and hidden test cases, awarding marks.
  - `[FR-CODE-004, TC-10]` Strictly conceals hidden test case inputs and expected outputs from candidate responses.
  - `[FR-CODE-008]` Catches runtime exceptions and reports `RUNTIME_ERROR` with sanitized traceback.
- **`sql-evaluation.test.ts` (4 tests)**:
  - `[FR-SQL-001, FR-SQL-005]` Evaluates SQL candidate query against ephemeral SQLite database in EXACT_MATCH mode.
  - `[FR-SQL-005]` Evaluates SQL query in UNORDERED_MATCH mode regardless of row sequencing.
  - `[FR-SQL-001]` Correctly flags WRONG_ANSWER when query output does not match expected result.
  - `[FR-SQL-003]` Rejects destructive SQL commands (`DROP TABLE`, `ALTER TABLE`, `TRUNCATE`) with `COMPILATION_ERROR`.
- **`auth.test.ts` (4 tests)**:
  - `[FR-CODE-013]` Returns 200 OK for unauthenticated health endpoint.
  - `[FR-CODE-013]` Rejects execution requests with missing auth token (401 Unauthorized).
  - `[FR-CODE-013]` Rejects execution requests with invalid auth token (401 Unauthorized).
  - `[FR-CODE-013]` Accepts execution requests with valid token.

### 4.2 Admin Web Authoring UI Tests (`apps/admin-web/src/tests/`)

- **`CodingSqlAuthoring.test.tsx` (3 tests)**:
  - Authors new Coding question with language selection, limits, sample and hidden test cases.
  - Authors new SQL question with schema DDL, seed data, reference query, and unordered comparison mode.
  - Validates required fields for coding (languages, test cases) and SQL (DDL, seed, query).
- **All 18 Admin Web Test Suites Passing (67 tests total)**.

---

## 5. What Is Still Mocked

- In `apps/admin-web`, MSW continues to mock backend endpoints pending Dev A's database-backed evaluation queue merge.
- Candidate code submission execution queue is connected to the runner mock endpoint; live candidate desktop Monaco editor execution will integrate with Dev C in Phase 6.

---

## 6. Open Questions

- None. All requirements in `FR-CODE-001..014`, `FR-SQL-001..005`, `NFR-SEC-008`, `SRS 10.4`, `TC-10`, `TC-11`, and `TC-12` were implemented without ambiguity.

---

## 7. Exact Instructions to Run

### 7.1 Run Code Runner Test Suite & Build

```powershell
# From workspace root
pnpm --filter @verisync/code-runner test
pnpm --filter @verisync/code-runner typecheck
pnpm --filter @verisync/code-runner lint
pnpm --filter @verisync/code-runner build
```

### 7.2 Run Admin Web Test Suite & Build

```powershell
# From workspace root
pnpm --filter @verisync/admin-web test
pnpm --filter @verisync/admin-web typecheck
pnpm --filter @verisync/admin-web lint
pnpm --filter @verisync/admin-web build
```

### 7.3 Start Microservices Locally

```powershell
# Start Code Runner HTTP daemon (port 5050)
pnpm --filter @verisync/code-runner start

# Start Admin Web UI (port 5173)
pnpm --filter @verisync/admin-web dev
```
