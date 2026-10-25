# VeriSync Coding Execution Service (`services/code-runner`)

## Ownership

Owned by **Ashlin Siddharth (Dev B)**.

## Architecture & Role

The Coding Execution Service is a dedicated, isolated microservice responsible for compiling and evaluating untrusted candidate code and executing SQL queries under strict resource and security constraints.

Per **Non-Negotiable Rule 8** and **SRS Section 8.5 / 10.4**:

- Candidate code **never** runs inside the main API process.
- The execution sandbox is denied unrestricted access to the primary relational database, cloud metadata endpoints, internal network services, and production secrets.

---

## Supported Languages & Environments (FR-CODE-001)

The service will provide pinned runtime environments using dedicated Docker execution images:

- **C** (GCC, pinned version)
- **C++** (G++, C++17/20, pinned version)
- **Java** (OpenJDK, LTS pinned version)
- **Python** (Python 3.11+, pinned version)
- **JavaScript** (Node.js, LTS pinned version)

---

## Sandbox Security & Isolation (FR-CODE-007, NFR-SEC-008, SRS 10.4)

Each candidate code evaluation executes in a throwaway container or cgroup namespace enforcing:

1. **Unprivileged User**: Execution runs as non-root (UID/GID 10001).
2. **Read-Only Root Filesystem**: Entire system mount is strictly read-only (`--read-only`).
3. **Ephemeral Workdir**: Small in-memory `tmpfs` volume for source files and compiled binaries.
4. **No Network Access**: `--network none` completely disables socket creation and internet reachability.
5. **Cgroup Resource Limits**:
   - CPU throttling and core affinity.
   - Strict memory ceiling (e.g., 256MB) preventing OOM attacks.
   - Process limit (`pids-limit 64`) preventing fork bombs.
   - Disk write quotas.
6. **Timeouts**: Wall-clock and CPU time limits killing infinite loops.
7. **Security Profiles**: `seccomp` profile filtering dangerous syscalls; `no-new-privileges` enabled.
8. **Sanitization**: Output and source code size caps; automatic destruction and cleanup after every run.

---

## Internal Evaluation Protocol (SRS Section 8.5)

- Communication between `apps/api` and `services/code-runner` occurs over a secured internal HTTP interface protected by a shared secret (`CODE_RUNNER_SHARED_SECRET`).
- The payload carries only:
  - Source code
  - Language configuration
  - Resource execution limits (CPU / Memory)
  - Test case inputs and expected outputs
- The response returns structured execution results:
  - `status`: `ACCEPTED` | `WRONG_ANSWER` | `COMPILATION_ERROR` | `RUNTIME_ERROR` | `TIME_LIMIT_EXCEEDED` | `MEMORY_LIMIT_EXCEEDED` | `INTERNAL_EVALUATION_ERROR`
  - `executionTimeMs`: Execution duration
  - `memoryUsedKb`: Memory consumed
  - `compilerOutput`: Sanitized build diagnostics (truncated if excessive)
  - `sampleOutput`: Permitted output for sample test cases (candidate-visible)
- **Security Guarantee (FR-CODE-009)**: Hidden test cases and expected outputs are never returned to candidate-facing endpoints.
