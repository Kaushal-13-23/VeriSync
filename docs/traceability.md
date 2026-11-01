# VeriSync Requirements Traceability Matrix (RTM)

**Specification Baseline**: `docs/SRS/srs.md` (v1.1)  
**Authoritative Evaluator**: Developer A (Kaushal Kumar Singh)  
**Date**: 2026-11-02  
**Status**: Complete (All Must Requirements Implemented & Verified)

---

## 1. Functional Requirements Traceability (FR)

### 1.1 Authentication & Candidate Management (FR-AUTH)

| Requirement ID | Priority | Phase | Implementation Location                         | Verification Suite / Automated Test                      |  Status  |
| :------------- | :------: | :---: | :---------------------------------------------- | :------------------------------------------------------- | :------: |
| `FR-AUTH-001`  |   Must   |   1   | `apps/api/src/auth/auth.service.ts`             | `apps/api/src/auth/auth.service.spec.ts`                 | **Done** |
| `FR-AUTH-002`  |   Must   |   1   | `apps/api/src/auth/auth.service.ts`             | `apps/api/src/auth/auth.service.spec.ts`                 | **Done** |
| `FR-AUTH-003`  |   Must   |   1   | `apps/api/src/auth/password.service.ts`         | `apps/api/src/auth/auth.service.spec.ts`                 | **Done** |
| `FR-AUTH-004`  |   Must   |   6   | `apps/api/src/auth/auth.service.ts`             | `apps/api/src/auth/security-hardening.spec.ts` (`TC-17`) | **Done** |
| `FR-AUTH-005`  |   Must   |   2   | `apps/api/src/candidates/candidates.service.ts` | `apps/api/src/candidates/candidates.service.spec.ts`     | **Done** |
| `FR-AUTH-006`  |   Must   |   2   | `apps/api/src/candidates/candidates.service.ts` | `apps/api/src/candidates/candidates.service.spec.ts`     | **Done** |
| `FR-AUTH-007`  |   Must   |   1   | `apps/api/src/auth/guards/roles.guard.ts`       | `apps/api/src/auth/guards/guards.spec.ts`                | **Done** |
| `FR-AUTH-008`  |   Must   |   6   | `apps/api/src/auth/auth.service.ts`             | `apps/api/src/auth/security-hardening.spec.ts`           | **Done** |
| `FR-AUTH-009`  |   Must   |   2   | `apps/api/src/candidates/candidates.service.ts` | `apps/api/src/candidates/candidates.service.spec.ts`     | **Done** |
| `FR-AUTH-010`  |  Should  |   6   | `apps/api/src/devices/devices.service.ts`       | `apps/api/src/devices/devices.service.spec.ts` (`TC-15`) | **Done** |

### 1.2 Candidate Management (FR-CAN)

| Requirement ID | Priority | Phase | Implementation Location                           | Verification Suite / Automated Test                    |  Status  |
| :------------- | :------: | :---: | :------------------------------------------------ | :----------------------------------------------------- | :------: |
| `FR-CAN-001`   |   Must   |   2   | `apps/api/src/candidates/candidates.service.ts`   | `apps/api/src/candidates/candidates.service.spec.ts`   | **Done** |
| `FR-CAN-002`   |   Must   |   2   | `apps/api/src/candidates/candidates.service.ts`   | `apps/api/src/candidates/candidates.service.spec.ts`   | **Done** |
| `FR-CAN-003`   |  Should  |   2   | `apps/api/src/candidates/candidates.service.ts`   | `apps/api/src/candidates/candidates.service.spec.ts`   | **Done** |
| `FR-CAN-004`   |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-CAN-005`   |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-CAN-006`   |   Must   |   3   | `apps/api/src/candidates/candidates.service.ts`   | `apps/api/src/candidates/candidates.service.spec.ts`   | **Done** |
| `FR-CAN-007`   |   Must   |   2   | `prisma/schema.prisma` (`Candidate` model)        | `apps/api/src/candidates/candidates.service.spec.ts`   | **Done** |

### 1.3 Question Bank Management (FR-QB)

| Requirement ID | Priority | Phase | Implementation Location                       | Verification Suite / Automated Test                          |  Status  |
| :------------- | :------: | :---: | :-------------------------------------------- | :----------------------------------------------------------- | :------: |
| `FR-QB-001`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-002`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-003`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-004`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts` (`TC-09`) | **Done** |
| `FR-QB-005`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-006`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-007`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-008`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-009`    |   Must   |   2   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |
| `FR-QB-010`    |   Must   |   5   | `apps/api/src/questions/questions.service.ts` | `apps/api/src/questions/questions.service.spec.ts`           | **Done** |

### 1.4 Assessment Management (FR-ASMT)

| Requirement ID | Priority | Phase | Implementation Location                           | Verification Suite / Automated Test                    |  Status  |
| :------------- | :------: | :---: | :------------------------------------------------ | :----------------------------------------------------- | :------: |
| `FR-ASMT-001`  |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-ASMT-002`  |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-ASMT-003`  |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-ASMT-004`  |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-ASMT-005`  |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-ASMT-006`  |   Must   |   2   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |
| `FR-ASMT-007`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts`       | **Done** |
| `FR-ASMT-008`  |   Must   |   4   | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts` | **Done** |

### 1.5 Candidate User Interface (FR-UI)

| Requirement ID | Priority | Phase | Implementation Location                                              | Verification Suite / Automated Test                                       |  Status  |
| :------------- | :------: | :---: | :------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------: |
| `FR-UI-001`    |   Must   |   3   | `apps/candidate-desktop/src/screens/AssignedAssessmentsScreen.tsx`   | `apps/candidate-desktop/src/App.test.tsx`                                 | **Done** |
| `FR-UI-002`    |   Must   |   3   | `apps/candidate-desktop/src/screens/InstructionsScreen.tsx`          | `apps/candidate-desktop/src/tests/e2e-phase3.spec.tsx`                    | **Done** |
| `FR-UI-003`    |   Must   |   3   | `apps/candidate-desktop/src/screens/ExamScreen.tsx`                  | `apps/candidate-desktop/src/tests/e2e-phase3.spec.tsx`                    | **Done** |
| `FR-UI-004`    |   Must   |   3   | `apps/candidate-desktop/src/components/exam/SubmitNextButton.tsx`    | `apps/candidate-desktop/src/components/exam/SubmitNextButton.spec.tsx`    | **Done** |
| `FR-UI-005`    |   Must   |   3   | `apps/candidate-desktop/src/components/exam/TimerComponent.tsx`      | `apps/candidate-desktop/src/components/exam/TimerComponent.spec.tsx`      | **Done** |
| `FR-UI-006`    |   Must   |   3   | `apps/candidate-desktop/src/components/exam/QuestionStatusPanel.tsx` | `apps/candidate-desktop/src/components/exam/QuestionStatusPanel.spec.tsx` | **Done** |
| `FR-UI-007`    |   Must   |   3   | `apps/candidate-desktop/src/screens/SubmittedScreen.tsx`             | `apps/candidate-desktop/src/screens/SubmittedScreen.spec.tsx`             | **Done** |
| `FR-UI-008`    |   Must   |   3   | `apps/candidate-desktop/src/services/apiClient.ts`                   | `apps/candidate-desktop/src/services/apiClient.spec.ts` (`TC-08`)         | **Done** |
| `FR-UI-009`    |  Should  |   4   | `apps/candidate-desktop/src/services/logger.ts`                      | `apps/candidate-desktop/src/services/logger.spec.ts`                      | **Done** |

### 1.6 Timing Engine (FR-TIME)

| Requirement ID | Priority | Phase | Implementation Location                          | Verification Suite / Automated Test                        |  Status  |
| :------------- | :------: | :---: | :----------------------------------------------- | :--------------------------------------------------------- | :------: |
| `FR-TIME-001`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts`           | **Done** |
| `FR-TIME-002`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts`           | **Done** |
| `FR-TIME-003`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts`           | **Done** |
| `FR-TIME-004`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-03`) | **Done** |
| `FR-TIME-005`  |   Must   |   3   | `apps/api/src/sessions/session-expiry.worker.ts` | `apps/api/src/sessions/sessions.service.spec.ts`           | **Done** |
| `FR-TIME-006`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts`           | **Done** |
| `FR-TIME-007`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-06`) | **Done** |
| `FR-TIME-008`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-01`) | **Done** |
| `FR-TIME-009`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-04`) | **Done** |
| `FR-TIME-010`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-07`) | **Done** |
| `FR-TIME-011`  |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`      | `apps/api/src/sessions/sessions.service.spec.ts`           | **Done** |

### 1.7 Answer Submission (FR-ANS)

| Requirement ID | Priority | Phase | Implementation Location                                | Verification Suite / Automated Test                         |  Status  |
| :------------- | :------: | :---: | :----------------------------------------------------- | :---------------------------------------------------------- | :------: |
| `FR-ANS-001`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-02`)  | **Done** |
| `FR-ANS-002`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts`            | **Done** |
| `FR-ANS-003`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts`            | **Done** |
| `FR-ANS-004`   |   Must   |   3   | `apps/candidate-desktop/src/services/draftAutosave.ts` | `apps/candidate-desktop/src/services/draftAutosave.spec.ts` | **Done** |
| `FR-ANS-005`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts`            | **Done** |
| `FR-ANS-006`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts`            | **Done** |
| `FR-ANS-007`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-05`)  | **Done** |
| `FR-ANS-008`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts`            | **Done** |
| `FR-ANS-009`   |   Must   |   3   | `apps/api/src/sessions/sessions.service.ts`            | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-04`)  | **Done** |

### 1.8 Coding Assessment (FR-CODE)

| Requirement ID | Priority | Phase | Implementation Location                                                      | Verification Suite / Automated Test                                         |  Status  |
| :------------- | :------: | :---: | :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------- | :------: |
| `FR-CODE-001`  |   Must   |   5   | `services/code-runner/src/runners/language-configs.ts`                       | `services/code-runner/tests/code-evaluation.test.ts`                        | **Done** |
| `FR-CODE-002`  |   Must   |   5   | `apps/candidate-desktop/src/components/exam/coding/MonacoCodeEditor.tsx`     | `apps/candidate-desktop/src/components/exam/coding/CodingRenderer.spec.tsx` | **Done** |
| `FR-CODE-003`  |   Must   |   5   | `apps/candidate-desktop/src/components/exam/coding/MonacoCodeEditor.tsx`     | `apps/candidate-desktop/src/components/exam/coding/CodingRenderer.spec.tsx` | **Done** |
| `FR-CODE-004`  |   Must   |   5   | `apps/api/src/coding/coding.service.ts`                                      | `apps/api/src/coding/coding.service.spec.ts`                                | **Done** |
| `FR-CODE-005`  |   Must   |   5   | `services/code-runner/src/server.ts`                                         | `services/code-runner/tests/auth.test.ts`                                   | **Done** |
| `FR-CODE-006`  |   Must   |   5   | `services/code-runner/src/runners/process-runner.ts`                         | `services/code-runner/tests/code-evaluation.test.ts`                        | **Done** |
| `FR-CODE-007`  |   Must   |   5   | `services/code-runner/src/security/container-flags.ts`                       | `services/code-runner/tests/sandbox-escape.test.ts` (`TC-11`)               | **Done** |
| `FR-CODE-008`  |   Must   |   5   | `services/code-runner/src/runners/process-runner.ts`                         | `services/code-runner/tests/code-evaluation.test.ts`                        | **Done** |
| `FR-CODE-009`  |   Must   |   5   | `apps/api/src/coding/coding.service.ts`                                      | `apps/api/src/coding/coding.service.spec.ts` (`TC-10`)                      | **Done** |
| `FR-CODE-010`  |   Must   |   5   | `apps/candidate-desktop/src/components/exam/coding/CodeExecutionConsole.tsx` | `apps/candidate-desktop/src/tests/e2e-coding-sql.spec.tsx`                  | **Done** |
| `FR-CODE-011`  |   Must   |   5   | `apps/api/src/coding/coding.service.ts`                                      | `apps/api/src/coding/coding.service.spec.ts`                                | **Done** |
| `FR-CODE-012`  |   Must   |   5   | `apps/api/src/coding/coding.service.ts`                                      | `apps/api/src/coding/coding.service.spec.ts` (`TC-12`)                      | **Done** |
| `FR-CODE-013`  |   Must   |   5   | `apps/api/src/coding/coding.service.ts`                                      | `apps/api/src/coding/coding.service.spec.ts`                                | **Done** |
| `FR-CODE-014`  |   Must   |   5   | `apps/api/src/retention/retention.service.ts`                                | `apps/api/src/retention/retention.service.spec.ts`                          | **Done** |

### 1.9 SQL Assessment (FR-SQL)

| Requirement ID | Priority | Phase | Implementation Location                       | Verification Suite / Automated Test                 |  Status  |
| :------------- | :------: | :---: | :-------------------------------------------- | :-------------------------------------------------- | :------: |
| `FR-SQL-001`   |   Must   |   5   | `services/code-runner/src/sql/sql-sandbox.ts` | `services/code-runner/tests/sql-evaluation.test.ts` | **Done** |
| `FR-SQL-002`   |   Must   |   5   | `services/code-runner/src/sql/sql-sandbox.ts` | `services/code-runner/tests/sql-evaluation.test.ts` | **Done** |
| `FR-SQL-003`   |   Must   |   5   | `services/code-runner/src/sql/sql-sandbox.ts` | `services/code-runner/tests/sql-evaluation.test.ts` | **Done** |
| `FR-SQL-004`   |   Must   |   5   | `services/code-runner/src/sql/sql-sandbox.ts` | `services/code-runner/tests/sql-evaluation.test.ts` | **Done** |
| `FR-SQL-005`   |   Must   |   5   | `services/code-runner/src/sql/sql-sandbox.ts` | `services/code-runner/tests/sql-evaluation.test.ts` | **Done** |

### 1.10 Evaluation & Scoring (FR-SCORE)

| Requirement ID | Priority | Phase | Implementation Location                         | Verification Suite / Automated Test                            |  Status  |
| :------------- | :------: | :---: | :---------------------------------------------- | :------------------------------------------------------------- | :------: |
| `FR-SCORE-001` |   Must   |   4   | `apps/api/src/evaluation/evaluation.service.ts` | `apps/api/src/evaluation/evaluation.service.spec.ts`           | **Done** |
| `FR-SCORE-002` |   Must   |   4   | `apps/api/src/evaluation/evaluation.service.ts` | `apps/api/src/evaluation/evaluation.service.spec.ts` (`TC-13`) | **Done** |
| `FR-SCORE-003` |   Must   |   4   | `apps/api/src/evaluation/evaluation.service.ts` | `apps/api/src/evaluation/evaluation.service.spec.ts`           | **Done** |
| `FR-SCORE-004` |   Must   |   4   | `apps/api/src/evaluation/evaluation.service.ts` | `apps/api/src/evaluation/evaluation.service.spec.ts`           | **Done** |
| `FR-SCORE-005` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`                 | **Done** |
| `FR-SCORE-006` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`                 | **Done** |
| `FR-SCORE-007` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`                 | **Done** |
| `FR-SCORE-008` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`                 | **Done** |
| `FR-SCORE-009` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`                 | **Done** |
| `FR-SCORE-010` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts` (`TC-14`)       | **Done** |

### 1.11 Administration & Reports (FR-ADMIN)

| Requirement ID | Priority | Phase | Implementation Location                         | Verification Suite / Automated Test                  |  Status  |
| :------------- | :------: | :---: | :---------------------------------------------- | :--------------------------------------------------- | :------: |
| `FR-ADMIN-001` |   Must   |   1   | `apps/admin-web/src/pages/Dashboard.tsx`        | `apps/admin-web/src/tests/Dashboard.test.tsx`        | **Done** |
| `FR-ADMIN-002` |   Must   |   3   | `apps/admin-web/src/pages/LiveSessions.tsx`     | `apps/admin-web/src/tests/LiveSessions.test.tsx`     | **Done** |
| `FR-ADMIN-003` |   Must   |   3   | `apps/admin-web/src/pages/SessionOverrides.tsx` | `apps/admin-web/src/tests/SessionOverrides.test.tsx` | **Done** |
| `FR-ADMIN-004` |   Must   |   4   | `apps/admin-web/src/pages/Results.tsx`          | `apps/admin-web/src/tests/Results.test.tsx`          | **Done** |
| `FR-ADMIN-005` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`       | **Done** |
| `FR-ADMIN-006` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`       | **Done** |
| `FR-ADMIN-007` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`       | **Done** |
| `FR-ADMIN-008` |   Must   |   4   | `apps/admin-web/src/pages/Reports.tsx`          | `apps/admin-web/src/tests/Reports.test.tsx`          | **Done** |
| `FR-ADMIN-009` |   Must   |   4   | `apps/api/src/results/results.service.ts`       | `apps/api/src/results/results.service.spec.ts`       | **Done** |

### 1.12 Lab Client & Lockdown (FR-LAB)

| Requirement ID | Priority | Phase | Implementation Location                                             | Verification Suite / Automated Test                           |  Status  |
| :------------- | :------: | :---: | :------------------------------------------------------------------ | :------------------------------------------------------------ | :------: |
| `FR-LAB-001`   |   Must   |   6   | `apps/api/src/devices/devices.service.ts`                           | `apps/api/src/devices/devices.service.spec.ts`                | **Done** |
| `FR-LAB-002`   |   Must   |   6   | `apps/api/src/devices/devices.service.ts`                           | `apps/api/src/devices/devices.service.spec.ts`                | **Done** |
| `FR-LAB-003`   |   Must   |   6   | `apps/api/src/devices/devices.service.ts`                           | `apps/api/src/devices/devices.service.spec.ts`                | **Done** |
| `FR-LAB-004`   |   Must   |   6   | `apps/api/src/devices/devices.service.ts`                           | `apps/api/src/devices/devices.service.spec.ts` (`TC-16`)      | **Done** |
| `FR-LAB-005`   |   Must   |   6   | `deploy/kiosk/README.md`, `apps/candidate-desktop/electron/main.ts` | `apps/candidate-desktop/src/tests/lockdown.spec.ts` (`TC-18`) | **Done** |
| `FR-LAB-006`   |   Must   |   6   | `apps/api/src/devices/devices.service.ts`                           | `apps/api/src/devices/devices.service.spec.ts`                | **Done** |
| `FR-LAB-007`   |   Must   |   6   | `apps/api/src/devices/devices.service.ts`                           | `apps/api/src/devices/devices.service.spec.ts`                | **Done** |
| `FR-LAB-008`   |   Must   |   6   | `deploy/kiosk/LOCKDOWN_GUIDE.md`                                    | `docs/kiosk/escape-tests.md`                                  | **Done** |

### 1.13 Audit Logging (FR-AUD)

| Requirement ID | Priority | Phase | Implementation Location                  | Verification Suite / Automated Test           |  Status  |
| :------------- | :------: | :---: | :--------------------------------------- | :-------------------------------------------- | :------: |
| `FR-AUD-001`   |   Must   |   3   | `apps/api/src/audit/audit.service.ts`    | `apps/api/src/audit/audit-chain.spec.ts`      | **Done** |
| `FR-AUD-002`   |   Must   |   3   | `apps/api/src/audit/audit.service.ts`    | `apps/api/src/audit/audit-chain.spec.ts`      | **Done** |
| `FR-AUD-003`   |   Must   |   3   | `apps/api/src/audit/audit.service.ts`    | `apps/api/src/audit/audit-chain.spec.ts`      | **Done** |
| `FR-AUD-004`   |   Must   |   3   | `apps/api/src/audit/audit.service.ts`    | `apps/api/src/audit/audit-chain.spec.ts`      | **Done** |
| `FR-AUD-005`   |   Must   |   3   | `apps/api/src/audit/audit.service.ts`    | `apps/api/src/audit/audit-chain.spec.ts`      | **Done** |
| `FR-AUD-006`   |   Must   |   3   | `apps/admin-web/src/pages/AuditLogs.tsx` | `apps/admin-web/src/tests/AuditLogs.test.tsx` | **Done** |
| `FR-AUD-007`   |   Must   |   3   | `apps/api/src/audit/audit.service.ts`    | `apps/api/src/audit/audit-chain.spec.ts`      | **Done** |

### 1.14 Configuration & Retention (FR-CONF)

| Requirement ID | Priority | Phase | Implementation Location                       | Verification Suite / Automated Test                |  Status  |
| :------------- | :------: | :---: | :-------------------------------------------- | :------------------------------------------------- | :------: |
| `FR-CONF-001`  |   Must   |   7   | `apps/api/src/retention/retention.service.ts` | `apps/api/src/retention/retention.service.spec.ts` | **Done** |
| `FR-CONF-002`  |   Must   |   7   | `apps/api/src/retention/retention.service.ts` | `apps/api/src/retention/retention.service.spec.ts` | **Done** |
| `FR-CONF-003`  |   Must   |   7   | `apps/api/src/retention/retention.service.ts` | `apps/api/src/retention/retention.service.spec.ts` | **Done** |
| `FR-CONF-004`  |   Must   |   7   | `apps/api/src/retention/retention.service.ts` | `apps/api/src/retention/retention.service.spec.ts` | **Done** |

---

## 2. Non-Functional Requirements Traceability (NFR)

| Requirement ID  | Category                               | Phase | Implementation Location                                         | Verification Evidence                                         |  Status  |
| :-------------- | :------------------------------------- | :---: | :-------------------------------------------------------------- | :------------------------------------------------------------ | :------: |
| `NFR-PERF-001`  | Performance (Login Latency)            |   7   | `apps/api/src/auth/auth.service.ts`                             | `infra/k6/load-test.js` (p95 < 2s at 500 VUs)                 | **Done** |
| `NFR-PERF-002`  | Performance (Question Fetch)           |   7   | `apps/api/src/sessions/sessions.service.ts`                     | `infra/k6/load-test.js` (p95 < 1.5s at 500 VUs)               | **Done** |
| `NFR-PERF-003`  | Performance (Answer Submit ACK)        |   7   | `apps/api/src/sessions/sessions.service.ts`                     | `infra/k6/load-test.js` (p95 < 2s at 500 VUs)                 | **Done** |
| `NFR-PERF-004`  | Performance (Mass Expiry)              |   7   | `apps/api/src/sessions/session-expiry.worker.ts`                | `infra/k6/mass-timer-expiry.js` (500 items < 5s)              | **Done** |
| `NFR-PERF-005`  | Performance (Admin Dashboard)          |   7   | `apps/admin-web/src/pages/Dashboard.tsx`                        | `apps/admin-web/src/tests/Dashboard.test.tsx` (p95 < 3s)      | **Done** |
| `NFR-SEC-001`   | Security (TLS 1.3 / HSTS)              |   6   | `apps/api/src/main.ts`                                          | Helmet configuration & `docs/DEPLOYMENT.md`                   | **Done** |
| `NFR-SEC-002`   | Security (Argon2id Hashing)            |   1   | `apps/api/src/auth/password.service.ts`                         | `apps/api/src/auth/auth.service.spec.ts`                      | **Done** |
| `NFR-SEC-003`   | Security (Role-Based Access)           |   1   | `apps/api/src/auth/guards/roles.guard.ts`                       | `apps/api/src/auth/authorization-matrix.spec.ts`              | **Done** |
| `NFR-SEC-004`   | Security (Session Hijack Defense)      |   6   | `apps/api/src/devices/devices.service.ts`                       | `apps/api/src/devices/devices.service.spec.ts` (`TC-08`)      | **Done** |
| `NFR-SEC-005`   | Security (No Secrets in Code/Logs)     |   1   | Monorepo root                                                   | `.github/workflows/ci.yml` secret scanning step               | **Done** |
| `NFR-SEC-006`   | Security (Rate Limiting)               |   6   | `apps/api/src/auth/auth.service.ts`                             | `apps/api/src/auth/security-hardening.spec.ts` (`TC-17`)      | **Done** |
| `NFR-SEC-007`   | Security (Parameterized SQL)           |   1   | `apps/api/src/common/prisma.service.ts`                         | Prisma client parameterized queries across repo               | **Done** |
| `NFR-SEC-008`   | Security (Sandbox Containment)         |   5   | `services/code-runner/src/security/`                            | `services/code-runner/tests/sandbox-escape.test.ts` (`TC-11`) | **Done** |
| `NFR-SEC-009`   | Security (Audit Log Tamper-Proof)      |   3   | `apps/api/src/audit/audit.service.ts`                           | `apps/api/src/audit/audit-chain.spec.ts`                      | **Done** |
| `NFR-SEC-010`   | Security (Secret Rotation)             |   7   | `docs/DEPLOYMENT.md`                                            | Documented vault secret rotation procedures                   | **Done** |
| `NFR-SEC-011`   | Security (Dependency Scanning)         |   7   | `.github/workflows/ci.yml`                                      | `pnpm audit --audit-level=high` (0 vulnerabilities)           | **Done** |
| `NFR-SEC-012`   | Security (No Secrets in Desktop)       |   4   | `apps/candidate-desktop/`                                       | `apps/candidate-desktop/src/security/bundleSecrets.spec.ts`   | **Done** |
| `NFR-REL-001`   | Reliability (99.5% Assessment SLA)     |   7   | `infra/docker-compose.prod.yml`                                 | High-availability multi-replica architecture                  | **Done** |
| `NFR-REL-002`   | Reliability (Database Atomic Tx)       |   3   | `apps/api/src/sessions/sessions.service.ts`                     | `apps/api/src/sessions/sessions.service.spec.ts`              | **Done** |
| `NFR-REL-003`   | Reliability (Continuous Clock Sync)    |   3   | `apps/candidate-desktop/src/services/timeSync.ts`               | `apps/candidate-desktop/src/services/timeSync.spec.ts`        | **Done** |
| `NFR-REL-004`   | Reliability (Crash Recovery)           |   3   | `apps/api/src/sessions/sessions.service.ts`                     | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-07`)    | **Done** |
| `NFR-REL-005`   | Reliability (Sanitized 500 Responses)  |   1   | `apps/api/src/common/all-exceptions.filter.ts`                  | `packages/shared/tests/errors.spec.ts`                        | **Done** |
| `NFR-REL-006`   | Reliability (RPO 15m / RTO 4h DR)      |   7   | `infra/backup/restore.sh`                                       | `apps/api/src/common/backup-restore.spec.ts` (`TC-19`)        | **Done** |
| `NFR-SCALE-001` | Scalability (Connection Pooling)       |   7   | `prisma/schema.prisma`                                          | DB pool configuration (`connection_limit=60`)                 | **Done** |
| `NFR-SCALE-002` | Scalability (Stateless APIs)           |   7   | `apps/api/src/`                                                 | Stateless JWT session architecture                            | **Done** |
| `NFR-SCALE-003` | Scalability (Queue Scaling)            |   5   | `services/code-runner/src/concurrency/`                         | `services/code-runner/tests/concurrency-load.test.ts`         | **Done** |
| `NFR-COMP-001`  | Compatibility (Windows 10/11)          |   6   | `deploy/kiosk/`                                                 | `docs/compat/windows-matrix.md`                               | **Done** |
| `NFR-COMP-002`  | Compatibility (Modern Browsers)        |   1   | `apps/admin-web/vite.config.ts`                                 | Chrome, Edge, Firefox, Safari ES2022 target                   | **Done** |
| `NFR-COMP-003`  | Compatibility (PostgreSQL 15+)         |   1   | `infra/docker-compose.yml`                                      | PostgreSQL 16 Alpine container baseline                       | **Done** |
| `NFR-COMP-004`  | Compatibility (Display Res 1280x720)   |   2   | `apps/candidate-desktop/electron/main.ts`                       | Responsive UI min resolution check                            | **Done** |
| `NFR-USE-001`   | Usability (Zero-Friction Candidate)    |   2   | `apps/candidate-desktop/src/`                                   | Instructions screen, keyboard shortcuts, clean UX             | **Done** |
| `NFR-USE-002`   | Usability (Clear Countdown Timer)      |   3   | `apps/candidate-desktop/src/components/exam/TimerComponent.tsx` | Warning visual states (< 60s, < 10s)                          | **Done** |
| `NFR-USE-003`   | Usability (Human-Readable Errors)      |   1   | `apps/candidate-desktop/src/services/errorHandler.ts`           | Friendly error banner without stack leaks                     | **Done** |
| `NFR-USE-004`   | Usability (Admin Search & Filter)      |   2   | `apps/admin-web/src/pages/`                                     | Search inputs, status filters, pagination                     | **Done** |
| `NFR-USE-005`   | Usability (WCAG 2.1 AA Contrast)       |   2   | `apps/candidate-desktop/src/`                                   | Color contrast validation and aria attributes                 | **Done** |
| `NFR-MNT-001`   | Maintainability (Modular Monorepo)     |   0   | Root workspace (`pnpm-workspace.yaml`)                          | Strict modular separation of concerns                         | **Done** |
| `NFR-MNT-002`   | Maintainability (Strict TypeScript)    |   0   | `tsconfig.json` across packages                                 | Strict typechecking enabled with 0 errors                     | **Done** |
| `NFR-MNT-003`   | Maintainability (API Contract OpenAPI) |   0   | `packages/shared/openapi.yaml`                                  | OpenAPI 3.0 specification baseline                            | **Done** |
| `NFR-MNT-004`   | Maintainability (Prisma Migrations)    |   1   | `prisma/migrations/`                                            | Declarative forward migrations with drift checks              | **Done** |

---

## 3. Business Rules Traceability (BR)

| Business Rule | Description                                       | Implementation Location                           | Verification Suite / Automated Test                          |  Status  |
| :------------ | :------------------------------------------------ | :------------------------------------------------ | :----------------------------------------------------------- | :------: |
| `BR-001`      | Single active question per candidate attempt      | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts`             | **Done** |
| `BR-002`      | Strict sequential question navigation             | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-02`)   | **Done** |
| `BR-003`      | Question attempt cannot be skipped                | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-02`)   | **Done** |
| `BR-004`      | Expired question timer freezes modification       | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-03`)   | **Done** |
| `BR-005`      | Server deadline precedence over client clock      | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-01`)   | **Done** |
| `BR-006`      | Overall assessment deadline caps question timer   | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-06`)   | **Done** |
| `BR-007`      | Single active session per candidate account       | `apps/api/src/auth/auth.service.ts`               | `apps/api/src/auth/security-hardening.spec.ts` (`TC-15`)     | **Done** |
| `BR-008`      | Single assessment attempt per candidate           | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts`             | **Done** |
| `BR-009`      | Answer keys concealed from candidate responses    | `apps/api/src/questions/questions.service.ts`     | `apps/api/src/questions/questions.service.spec.ts` (`TC-09`) | **Done** |
| `BR-010`      | Disconnection does not pause or extend deadline   | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-07`)   | **Done** |
| `BR-011`      | Auto-evaluation of all objective responses        | `apps/api/src/evaluation/evaluation.service.ts`   | `apps/api/src/evaluation/evaluation.service.spec.ts`         | **Done** |
| `BR-012`      | Mandatory reason and audit record for score edits | `apps/api/src/results/results.service.ts`         | `apps/api/src/results/results.service.spec.ts` (`TC-14`)     | **Done** |
| `BR-013`      | Published assessment questions frozen             | `apps/api/src/assessments/assessments.service.ts` | `apps/api/src/assessments/assessments.service.spec.ts`       | **Done** |
| `BR-014`      | Candidate answers committed durably before ACK    | `apps/api/src/sessions/sessions.service.ts`       | `apps/api/src/sessions/sessions.service.spec.ts` (`TC-05`)   | **Done** |
| `BR-015`      | Desktop client version validated on handshake     | `apps/api/src/devices/devices.service.ts`         | `apps/api/src/devices/devices.service.spec.ts` (`TC-16`)     | **Done** |

---

## 4. Unimplemented Must Requirements

- **Total Must Requirements Defined in SRS**: 87
- **Total Must Requirements Implemented**: 87 (100%)
- **Unimplemented Must Requirements**: **0 (None)**
