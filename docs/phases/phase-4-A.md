# Phase 4 Completion Report: Scoring, Evaluation, Results, and Reporting

**Developer**: Developer A (Kaushal Kumar Singh)  
**Role**: Backend & Data Lead  
**Branch**: `phase-4/dev-a-scoring-results-reports`  
**Date**: 2026-10-29

---

## 1. What Was Built

Implemented the authoritative evaluation, scoring, results, analytics, and reporting engine in `apps/api`, `packages/shared`, and `prisma/`, strictly adhering to SRS Sections 5.10 (`FR-SCORE`), 5.11 (`FR-ADMIN`), `UC-14`, `UC-15`, `BR-011`, `BR-012`, `TC-13`, and `TC-14`:

1. **Objective Scoring Engine Against Frozen Snapshot (`apps/api/src/evaluation/evaluation.service.ts`)**:
   - **Config-Version Consistency (`BR-011`, `FR-SCORE-001`)**: Scores objective questions against the immutable `publishedSnapshot` frozen at assessment publication time. Subsequent edits or deactivations in the question bank do not alter candidate scoring.
   - **Configurable Negative Marking (`FR-SCORE-002`, `TC-13`)**: When negative marking is enabled on the assessment, incorrect answers deduct the configured negative value (`assessment.negativeMarkValue` or question `negativeMarks`).
   - **Partial Credit for Multi-Select (`FR-SCORE-003`)**: Proportional marks awarded for selecting a non-empty subset of correct options `(correctSelected / totalCorrectOptions) * maximumMarks` when no incorrect options are chosen. Choosing any incorrect option awards 0 marks (or applies negative marking).
   - **Timed-Out & Unanswered Marking Rule (`FR-SCORE-006`)**: Questions skipped or left unanswered upon timeout receive 0 marks (or configured penalty).

2. **Provisional vs. Final Result Lifecycle (`FR-SCORE-008`, `UC-14`)**:
   - Sessions containing subjective items (`SHORT_ANSWER`, `DESCRIPTIVE`, `SCENARIO`) are marked `PROVISIONAL` while awaiting manual grading.
   - Automatically transitions to `FINAL` once all subjective attempts have been evaluated by a Technical Evaluator or SuperAdmin.
   - For all-objective assessments, results immediately finalize to `FINAL` upon candidate final submission or session expiration.

3. **Deterministic Tie-Breaking Ranking Engine (`FR-SCORE-009`)**:
   - Recalculates deterministic rankings across all final results in the assessment cohort using the approved tie-breaking criteria:
     1. Total score descending.
     2. Higher precision / fewer negative mark deductions (lower deductions win).
     3. Earlier completion timestamp (`submittedAt` ascending).

4. **Manual Evaluation Queue (`apps/api/src/evaluation/evaluation.controller.ts`)**:
   - `GET /api/v1/admin/evaluation/queue`: Evaluator queue returning pending subjective question attempts with question text, maximum marks, candidate responses, and sequence (`FR-SCORE-004`).
   - `POST /api/v1/admin/evaluation/evaluate`: Evaluator awards rubric marks (validated `0 <= marks <= maxMarks`) and feedback comments (`FR-SCORE-005`). Updates attempt to `EVALUATED`, writes `MANUAL_EVALUATION` audit log, recalculates total scores, and finalizes the result if complete.

5. **Audited Score Correction Workflow (`FR-SCORE-010`, `UC-15`, `TC-14`, `BR-012`)**:
   - `POST /api/v1/admin/results/corrections`: SuperAdmin score adjustments requiring a mandatory, non-empty justification reason.
   - Persists an immutable `score_corrections` record containing `resultId`, `questionAttemptId`, `originalValue`, `revisedValue`, `reason`, and `correctedBy`.
   - Records an immutable audit event (`SCORE_CORRECTION`) and recalculates dependent totals, percentages, pass/fail status, and cohort rankings.

6. **Results & Analytics Service (`apps/api/src/results/results.service.ts`)**:
   - `GET /api/v1/admin/results`: Multi-attribute filtering (assessment, candidate ID, pass/fail status, result status, institution, score range) with pagination (`FR-ADMIN-003`).
   - `GET /api/v1/admin/results/:id`: Detailed per-question candidate breakdown displaying question text, sequence, awarded marks, candidate answer payload, evaluator feedback, and score corrections history (`FR-ADMIN-005`).
   - `GET /api/v1/admin/results/assessments/:id/statistics`: Cohort analytics (total candidates, pass rate, average score, high/low scores) and question-level performance statistics (`difficultyIndex` and `discriminationIndex`) (`FR-ADMIN-006`, `FR-ADMIN-009`).
   - `GET /api/v1/admin/results/export/csv`: Restricted and audited CSV export generating RFC 4180 compliant CSV and writing an `EXPORT_RESULTS` audit log (`FR-ADMIN-004`, `FR-ADMIN-008`).
   - `GET /api/v1/candidate/assessments/:id/result`: Candidate-facing result view respecting assessment `resultVisibility` policy (`IMMEDIATE`, `SCHEDULED`, `ADMIN_RELEASE`) while strictly preventing answer key or test case exposure (`FR-ADMIN-007`, `BR-009`, `TC-09`).

---

## 2. Endpoints Added

| Method | Path                                                 | Role / Access                        | Purpose                                                                                                    |
| :----- | :--------------------------------------------------- | :----------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/admin/evaluation/queue`                     | `SUPER_ADMIN`, `TECHNICAL_EVALUATOR` | Manual evaluation queue for subjective questions (FR-SCORE-004, UC-14)                                     |
| `POST` | `/api/v1/admin/evaluation/evaluate`                  | `SUPER_ADMIN`, `TECHNICAL_EVALUATOR` | Grade attempt with rubric marks and comments, transition to FINAL if complete (FR-SCORE-005, FR-SCORE-008) |
| `GET`  | `/api/v1/admin/results`                              | `SUPER_ADMIN`, `TECHNICAL_EVALUATOR` | Filterable results listing with pagination and cohort metrics (FR-ADMIN-003)                               |
| `GET`  | `/api/v1/admin/results/:id`                          | `SUPER_ADMIN`, `TECHNICAL_EVALUATOR` | Detailed candidate result breakdown per question with evaluator notes (FR-ADMIN-005)                       |
| `POST` | `/api/v1/admin/results/corrections`                  | `SUPER_ADMIN`                        | Audited score correction with mandatory reason, recalculating totals & ranks (FR-SCORE-010, UC-15, TC-14)  |
| `GET`  | `/api/v1/admin/results/export/csv`                   | `SUPER_ADMIN`                        | Restricted & audited CSV results export (FR-ADMIN-004, FR-ADMIN-008)                                       |
| `GET`  | `/api/v1/admin/results/assessments/:id/statistics`   | `SUPER_ADMIN`, `TECHNICAL_EVALUATOR` | Assessment cohort statistics and question difficulty/discrimination analytics (FR-ADMIN-006, 009)          |
| `GET`  | `/api/v1/candidate/assessments/:assessmentId/result` | `CANDIDATE`                          | Candidate-facing result view governed by assessment resultVisibility policy (FR-ADMIN-007, TC-09)          |

---

## 3. SRS Requirements Covered

- `FR-SCORE-001`: Automated scoring of objective questions against the published assessment snapshot key.
- `FR-SCORE-002`: Configurable negative marking deduction for incorrect objective responses (`TC-13`).
- `FR-SCORE-003`: Configurable partial credit for multi-select questions.
- `FR-SCORE-004`: Manual evaluation queue and scoring rubric for subjective/descriptive questions (`UC-14`).
- `FR-SCORE-005`: Manual score entry, rubric marks, and evaluator feedback comments.
- `FR-SCORE-006`: Configured scoring policy for timed-out or unanswered questions.
- `FR-SCORE-007`: Candidate and assessment-level aggregate score calculations.
- `FR-SCORE-008`: Provisional vs. Final result status handling.
- `FR-SCORE-009`: Result ranking calculation with deterministic tie-break criteria.
- `FR-SCORE-010`: Audited score correction workflow requiring original value, new value, reason, and actor (`UC-15`, `TC-14`).
- `FR-ADMIN-003`: Candidate results listing with multi-criteria filtering and pagination.
- `FR-ADMIN-004`: Export of results to CSV format.
- `FR-ADMIN-005`: Detailed result breakdown per question with candidate responses and awarded marks.
- `FR-ADMIN-006`: Question-level performance analytics (`difficultyIndex` and `discriminationIndex`).
- `FR-ADMIN-007`: Candidate result visibility governed by assessment policy (`IMMEDIATE`, `SCHEDULED`, `ADMIN_RELEASE`).
- `FR-ADMIN-008`: Auditing of candidate data exports.
- `FR-ADMIN-009`: Role-based administrative permissions enforcement (`SUPER_ADMIN`, `TECHNICAL_EVALUATOR`).
- `BR-011`: Scores calculated from the configuration associated with the candidate's attempt (snapshot consistency).
- `BR-012`: Authorized score changes logged with reason and administrator identity.
- `TC-13`: Negative marking test verified with deduction on incorrect options.
- `TC-14`: Score correction test verified with audit trail and recalculated totals and ranks.

---

## 4. Automated Tests Added

1. **`apps/api/src/evaluation/evaluation.service.spec.ts`**:
   - `TC-13`: Negative marking deductions for incorrect objective options.
   - `TC-14`: Audited score corrections verifying `score_corrections` table records, audit log generation, and recalculated ranks.
   - Scoring regression suite with fixed fixtures:
     - Single choice (`MCQ_SINGLE`): correct -> full marks; incorrect -> negative deduction.
     - Multi-select partial credit (`MCQ_MULTIPLE`): full marks for all correct; proportional credit for subset of correct; zero/negative for selecting wrong options.
     - True/False (`TRUE_FALSE`): correct and incorrect evaluation against snapshot.
     - Subjective grading (`SHORT_ANSWER`): pending attempts marked `PROVISIONAL`; manual grading transitions session to `FINAL`.
     - Unanswered / timed-out questions: 0 marks awarded.
     - Deterministic tie-breaking ranking: verified order by score desc, fewer deductions, earlier `submittedAt`.
     - `BR-011`: Verification that scoring evaluates against frozen `publishedSnapshot` even if question bank definitions change.

2. **`apps/api/src/results/results.service.spec.ts`**:
   - Filterable results listing with pagination and score ranges.
   - Detailed question breakdown with candidate response and evaluator comments.
   - Assessment and question statistics computing difficulty index, discrimination index, and cohort pass rates.
   - CSV export generation and audit event verification.
   - Candidate result visibility under `IMMEDIATE`, `SCHEDULED`, and `ADMIN_RELEASE` policies with zero answer key leakage (`TC-09`).

---

## 5. What Is Still Mocked

- **Coding Sandbox Execution (`services/code-runner`)**: Dedicated code execution environment is owned by Developer C (scheduled for Phase 5). When coding questions are submitted without a pre-graded execution run, their attempt state remains `EVALUATION_PENDING` until evaluated or pre-graded by test cases.

---

## 6. Open Questions

- None. All requirements in SRS 5.10, 5.11, UC-14, UC-15, and UI Screen 6 have been fully implemented without ambiguities.

---

## 7. Instructions to Run and Verify

1. **Regenerate Prisma Client**:

   ```bash
   pnpm prisma:generate
   ```

2. **Run Linter & Typecheck**:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm format:check
   ```

3. **Run Full Test Suite**:
   ```bash
   pnpm --filter @verisync/api test
   ```
   _Expected outcome: 10 test suites passed, 78 tests passed, 0 failures._
