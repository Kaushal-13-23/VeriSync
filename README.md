# VeriSync: Secure Placement Assessment Platform

[![CI](https://github.com/Kaushal-13-23/VeriSync/actions/workflows/ci.yml/badge.svg)](https://github.com/Kaushal-13-23/VeriSync/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node->=22.13.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-11.9.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/typescript-5.4.5-blue.svg)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Release%20Candidate-v1.0.0--rc1-success.svg)](https://github.com/Kaushal-13-23/VeriSync)

VeriSync is an enterprise-grade, high-integrity technical placement assessment platform designed specifically for university recruitment drives and competitive coding examinations.

---

## 1. Project Overview

VeriSync provides a unified, secure platform for executing simultaneous placement assessments with hundreds of concurrent candidates. It features strict server-authoritative timer controls, anti-cheat lockdown, real-time proctor monitoring, automated objective and code evaluation, and tamper-evident audit logging.

### Key Capabilities

- **Server-Authoritative Timing Engine**: All deadlines are computed and enforced by the backend API in UTC; client clocks and network disconnections cannot manipulate exam duration.
- **Microservice Code Runner Sandbox**: Isolated execution container supporting C, C++, Java, Python, and JavaScript with memory, CPU, and network containment.
- **Interactive In-Memory SQL Sandbox**: Ephemeral SQLite environments executing candidate queries safely with automated output verification.
- **Kiosk Desktop Client**: Hardened Electron candidate application with full-screen lockdown, window blur detection, and device-bound token authentication.
- **Administrative Command Center**: Comprehensive React web dashboard for question bank management, live proctoring, score overrides, and audit ledger inspection.

---

## 2. System Architecture

```
                                  +---------------------------------------+
                                  |         Super Administrator /         |
                                  |         Technical Evaluator           |
                                  +---------------------------------------+
                                                      |
                                           HTTPS / TLS 1.3 (RBAC)
                                                      v
+-------------------------+               +-----------------------+
|    Candidate Desktop    |               |  Admin Web Dashboard  |
|  (Electron Kiosk App)   |               |     (React / Vite)    |
+-------------------------+               +-----------------------+
             |                                        |
     HTTPS / Device ID                        HTTPS / TOTP MFA
             |                                        |
             +--------------------+-------------------+
                                  |
                                  v
                    +---------------------------+
                    |    Backend API Gateway    |
                    |      (NestJS / Node)      |
                    +---------------------------+
                       /          |          \
                      /           |           \
                     v            v            v
            +--------------+ +-----------+ +--------------------+
            | PostgreSQL 16| |  Prisma   | | Code Runner Daemon |
            |  Relational  | |  ORM &    | |  (Microservice /   |
            |   Database   | | Audit Log | |  Docker Sandbox)  |
            +--------------+ +-----------+ +--------------------+
```

### Monorepo Structure

```
verisync/
├── apps/
│   ├── api/                  # NestJS backend API (Port 4000)
│   ├── admin-web/            # React + Vite + Tailwind admin dashboard (Port 5173)
│   └── candidate-desktop/    # Electron + React secure candidate client
├── packages/
│   └── shared/               # Shared TS types, SRS 8.3.3 error codes, openapi.yaml
├── services/
│   └── code-runner/          # Isolated multi-language code & SQL sandbox (Port 5050)
├── prisma/                   # PostgreSQL schema, migrations & seed scripts
├── infra/                    # Docker Compose stacks, k6 load tests, Prometheus
├── deploy/
│   └── kiosk/                # Windows Assigned Access & AppLocker lockdown scripts
└── docs/                     # SRS specification, architecture, runbooks, acceptance reports
```

---

## 3. Non-Negotiable Engineering Rules

1. **The server is the only authority** for deadlines, answer acceptance, scoring, and authorization. Clients are untrusted. Client clocks are never used for decisions.
2. **Candidate-facing APIs never return answer keys**, hidden test cases, or expected outputs.
3. Every answer/code submission carries an **Idempotency-Key** (`FR-ANS-009`); repeats return the original result and create no duplicates.
4. Accepted submissions are **committed durably before the acknowledgement** is sent.
5. **Passwords: Argon2id only**. No secrets, passwords, or tokens in code, logs, or audit metadata.
6. **Parameterized queries only**. Validate all input. Enforce RBAC on every protected endpoint.
7. Admin overrides, score corrections, publishes, and deactivations are **audited with reason and actor**.
8. **Candidate code never runs in the API process**.
9. **Timestamps are UTC ISO-8601**. API errors use standard codes in SRS 8.3.3 with a correlationId.

---

## 4. Prerequisites

- **Node.js**: `>= 22.13.0`
- **pnpm**: `>= 11.9.0`
- **Docker & Docker Compose**: Required for local PostgreSQL database and containerized deployments.

---

## 5. Quick Start & Setup

### 1. Install Monorepo Dependencies

```bash
pnpm install --frozen-lockfile
```

### 2. Configure Environment Variables

```bash
# Root environment
cp .env.example .env

# Application-specific environments
cp apps/api/.env.example apps/api/.env
cp apps/admin-web/.env.example apps/admin-web/.env
cp apps/candidate-desktop/.env.example apps/candidate-desktop/.env
cp services/code-runner/.env.example services/code-runner/.env
```

### 3. Start Database & Run Migrations

```bash
# Start local PostgreSQL 16 container
docker compose -f infra/docker-compose.yml up -d

# Generate Prisma Client and apply migrations
pnpm prisma:generate
pnpm validate:migrations
```

---

## 6. Running the Applications

### A. Backend API (`apps/api`)

```bash
pnpm dev:api
# API available at http://localhost:4000/api/v1
# Health probe: http://localhost:4000/api/v1/health
```

### B. Admin Web Dashboard (`apps/admin-web`)

```bash
pnpm dev:admin
# Accessible in browser at http://localhost:5173
```

### C. Code Runner Microservice (`services/code-runner`)

```bash
cd services/code-runner && pnpm dev
# Daemon listening at http://localhost:5050
```

### D. Candidate Desktop Application (`apps/candidate-desktop`)

```bash
pnpm dev:candidate
# Launches Electron kiosk client
```

---

## 7. Quality & Verification Commands

All quality gates must pass prior to committing:

```bash
# Run TypeScript static typechecking across all 5 projects
pnpm typecheck

# Run ESLint validation across all workspaces
pnpm lint

# Check code formatting with Prettier
pnpm format:check

# Run all unit and integration test suites (375 tests)
pnpm test

# Build all packages and applications for production
pnpm build
```

---

## 8. Deployment & Operational Runbooks

- **Docker Staging Stack**: `docker compose -f infra/docker-compose.staging.yml up -d`
- **Hardened Production Stack**: `docker compose -f infra/docker-compose.prod.yml up -d`
- **k6 Concurrency Benchmark**:
  ```bash
  k6 run infra/k6/load-test.js
  k6 run infra/k6/mass-timer-expiry.js
  ```
- **Disaster Recovery Drill**: `infra/backup/restore.sh`
- **Kiosk Setup Guide**: `deploy/kiosk/README.md` and `deploy/kiosk/LOCKDOWN_GUIDE.md`

---

## 9. Documentation Index

| Document                                                                                             | Description                                                    |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **[`docs/SRS/srs.md`](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md)**                               | Baseline Software Requirements Specification (v1.1)            |
| **[`docs/ARCHITECTURE.md`](file:///d:/Veri_Sync/VeriSync/docs/ARCHITECTURE.md)**                     | End-to-end system architecture, security models & data flow    |
| **[`docs/DATABASE.md`](file:///d:/Veri_Sync/VeriSync/docs/DATABASE.md)**                             | Relational data dictionary, schema constraints & index tuning  |
| **[`docs/DEPLOYMENT.md`](file:///d:/Veri_Sync/VeriSync/docs/DEPLOYMENT.md)**                         | Production infrastructure, container builds, secrets & TLS     |
| **[`docs/DECISIONS.md`](file:///d:/Veri_Sync/VeriSync/docs/DECISIONS.md)**                           | Record of 8 architectural decisions & SRS 14.3 reconciliations |
| **[`docs/OWNERSHIP.md`](file:///d:/Veri_Sync/VeriSync/docs/OWNERSHIP.md)**                           | Engineering workstream matrix (Developer A, B, and C)          |
| **[`docs/PROGRESS.md`](file:///d:/Veri_Sync/VeriSync/docs/PROGRESS.md)**                             | SRS requirement tracking and implementation checklist          |
| **[`docs/traceability.md`](file:///d:/Veri_Sync/VeriSync/docs/traceability.md)**                     | Comprehensive Requirements Traceability Matrix (FR, NFR, BR)   |
| **[`docs/ACCEPTANCE_REPORT.md`](file:///d:/Veri_Sync/VeriSync/docs/ACCEPTANCE_REPORT.md)**           | Final SRS Section 15 acceptance gate & TC01–TC20 mapping       |
| **[`docs/SuperAdmin-Manual.md`](file:///d:/Veri_Sync/VeriSync/docs/SuperAdmin-Manual.md)**           | Administrator guide for exams, questions, results & audits     |
| **[`docs/Candidate-Instructions.md`](file:///d:/Veri_Sync/VeriSync/docs/Candidate-Instructions.md)** | Guidelines for candidates taking examinations                  |
| **[`deploy/kiosk/README.md`](file:///d:/Veri_Sync/VeriSync/deploy/kiosk/README.md)**                 | Windows Assigned Access and lab workstation setup guide        |

---

## 10. Release & Tagging

After the final acceptance pull request is merged into `main`:

```bash
git checkout main
git pull origin main
git tag -a v1.0.0-rc1 -m "Release candidate 1"
git push origin v1.0.0-rc1
```
