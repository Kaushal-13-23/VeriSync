# VeriSync: Secure Placement Assessment Platform

[![CI](https://github.com/Kaushal-13-23/VeriSync/actions/workflows/ci.yml/badge.svg)](https://github.com/Kaushal-13-23/VeriSync/actions/workflows/ci.yml)

VeriSync is an enterprise-grade, secure placement-assessment platform designed for university recruitment drives and technical examinations.

Sources of truth:

- **Requirements**: `docs/SRS/srs.md`
- **UI Design Reference**: `docs/design/UI_Sample.jpeg`
- **Architectural Decisions**: `docs/DECISIONS.md`
- **Team Ownership Matrix**: `docs/OWNERSHIP.md`
- **Implementation Tracker**: `docs/PROGRESS.md`

---

## Non-Negotiable Engineering Rules

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

## Workspace Architecture

```
verisync/
├── apps/
│   ├── api/                  # NestJS backend API (Lead: Dev A - Kaushal)
│   ├── admin-web/            # React + Vite + Tailwind admin dashboard (Lead: Dev B - Ashlin)
│   └── candidate-desktop/    # Electron + React secure candidate client (Lead: Dev C - Vimal)
├── packages/
│   └── shared/               # Shared TS types, SRS 8.3.3 error codes, openapi.yaml (Dev A)
├── services/
│   └── code-runner/          # Docker-isolated multi-language code runner (Dev B)
├── prisma/                   # Prisma database schema & migrations (Dev A)
├── infra/                    # Docker Compose local PostgreSQL (Dev A)
├── deploy/
│   └── kiosk/                # Windows Assigned Access & kiosk scripts (Dev C)
└── docs/
    ├── SRS/                  # srs.md and INDEX.md
    ├── design/               # UI_Sample.jpeg
    ├── phases/               # Phase completion reports
    ├── DECISIONS.md          # Recorded architectural decisions & reconciliations
    ├── OWNERSHIP.md          # Team responsibility & boundary matrix
    └── PROGRESS.md           # SRS requirement checklist
```

---

## Getting Started

### Prerequisites

- **Node.js**: >= 20.x
- **pnpm**: >= 9.x / 11.x
- **Docker & Docker Compose** (for local PostgreSQL and code sandbox)

### 1. Installation

Install all dependencies across the monorepo:

```bash
pnpm install
```

### 2. Local Infrastructure (PostgreSQL)

Start local PostgreSQL database:

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3. Environment Configuration

Copy environment variable templates:

```bash
# Root environment
cp .env.example .env

# App-specific environments
cp apps/api/.env.example apps/api/.env
cp apps/admin-web/.env.example apps/admin-web/.env
cp apps/candidate-desktop/.env.example apps/candidate-desktop/.env
```

### 4. Running the Applications

#### Run the Backend API (`apps/api`)

```bash
pnpm dev:api
# API available at http://localhost:4000/api/v1
# Health endpoint: http://localhost:4000/api/v1/health
```

#### Run the Administrator Web Dashboard (`apps/admin-web`)

```bash
pnpm dev:admin
# Web app running at http://localhost:5173
```

#### Run the Candidate Desktop App (`apps/candidate-desktop`)

```bash
pnpm dev:candidate
```

---

## Quality & Verification Commands

```bash
# Run lint across all workspaces
pnpm lint

# Run TypeScript typechecks across all workspaces
pnpm typecheck

# Run unit and component test suites
pnpm test

# Build all packages and applications
pnpm build

# Check code formatting with Prettier
pnpm format:check
```
