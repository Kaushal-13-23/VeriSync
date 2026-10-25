# VeriSync Codebase Ownership & Team Responsibilities

This document defines folder ownership and development boundaries across the VeriSync engineering team as agreed in the project baseline.

## Ownership Matrix

| Developer                       | Role                           | Owned Directories (Never edit others' folders)                         |
| :------------------------------ | :----------------------------- | :--------------------------------------------------------------------- |
| **Kaushal Kumar Singh (Dev A)** | Backend and Data Lead          | `apps/api`<br>`packages/shared`<br>`prisma/`<br>`infra/`<br>`.github/` |
| **Ashlin Siddharth (Dev B)**    | Admin Web and Code Runner      | `apps/admin-web`<br>`services/code-runner`                             |
| **Vimal Raj (Dev C)**           | Candidate Desktop and Lockdown | `apps/candidate-desktop`<br>`deploy/kiosk`                             |

---

## Working Rules & Boundary Enforcement

1. **Strict Directory Ownership**: Developers must only edit files within their designated owned directories. Never modify code in directories owned by other developers.
2. **API Contract Changes**:
   - All REST API contract updates and data schemas must originate in `packages/shared/openapi.yaml`.
   - Contract changes are proposed exclusively through Dev A (Kaushal Kumar Singh) via a targeted PR.
   - Once merged into `main`, Dev B (Ashlin) and Dev C (Vimal) pull changes and regenerate their respective API clients. This prevents API schema drifts and merge conflicts.
3. **SRS Requirement Traceability**:
   - Every commit message, test name, and code comment implementing functionality must explicitly reference the corresponding SRS Requirement ID (e.g., `FR-AUTH-003`, `FR-TIME-001`, `FR-ANS-009`, `BR-003`, `NFR-SEC-002`).
4. **Conventional Commits**:
   - All commits must strictly follow Conventional Commits format (`feat(...)`, `fix(...)`, `test(...)`, `chore(...)`, `docs(...)`).
5. **Quality Gates**:
   - Before completing any phase, each developer must run full linting (`pnpm lint`), type checking (`pnpm typecheck`), and automated tests (`pnpm test`) across their owned directories.
6. **No Speculative Implementation**:
   - Strictly follow `docs/SRS/srs.md`. Unspecified or ambiguous items must be logged under "Open Questions" in phase reports rather than guessed.
