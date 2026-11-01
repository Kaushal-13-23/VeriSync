# VeriSync Database Architecture & Schema Reference

## 1. Relational Database Overview

VeriSync utilizes **PostgreSQL 16** managed via **Prisma ORM**. The data model consists of 18 tables strictly designed around authoritative server validation, immutable cryptographic audit chains, durable answer persistence, and high-concurrency query optimization.

---

## 2. Entity Model Catalog

| #   | Table Name               | Purpose                                                                       | Primary / Unique Keys                                                   |
| :-- | :----------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| 1   | `users`                  | Accounts, credentials (Argon2id), roles (`SUPER_ADMIN`, `ADMIN`, `CANDIDATE`) | `user_id` (PK), `email` (UQ)                                            |
| 2   | `candidate_profiles`     | Candidate metadata, roll numbers, department, semester                        | `profile_id` (PK), `user_id` (UQ), `roll_number` (UQ)                   |
| 3   | `assessments`            | Exam definitions, scheduling windows, time limits, policies                   | `assessment_id` (PK)                                                    |
| 4   | `questions`              | Question content, topics, difficulty, maximum & negative marks                | `question_id` (PK)                                                      |
| 5   | `question_options`       | Objective question choices with protected server-side `is_correct`            | `option_id` (PK)                                                        |
| 6   | `test_cases`             | Public and hidden test cases for automated coding evaluation                  | `test_case_id` (PK)                                                     |
| 7   | `assessment_questions`   | Many-to-many junction ordering questions in an assessment                     | `id` (PK), `[assessment_id, question_id]` (UQ)                          |
| 8   | `assessment_assignments` | Assignment of candidates to assessments                                       | `assignment_id` (PK), `[assessment_id, candidate_id]` (UQ)              |
| 9   | `assessment_sessions`    | Candidate attempt sessions, start time, overall deadline, status              | `session_id` (PK), `[assignment_id, attempt_number]` (UQ)               |
| 10  | `question_attempts`      | Per-question timing, deadlines, marks, draft payloads                         | `question_attempt_id` (PK), `[session_id, assessment_question_id]` (UQ) |
| 11  | `answers`                | Accepted candidate answers with idempotency keys and hashes                   | `answer_id` (PK), `idempotency_key` (UQ)                                |
| 12  | `coding_submissions`     | Code text, language, status, execution metrics, tokens                        | `submission_id` (PK), `idempotency_key` (UQ)                            |
| 13  | `audit_logs`             | SHA256 cryptographic hash-chained audit events                                | `log_id` (PK)                                                           |
| 14  | `results`                | Computed final scores, ranks, percentages, publication status                 | `result_id` (PK), `session_id` (UQ)                                     |
| 15  | `lab_devices`            | Registered university computer references and approved versions               | `device_id` (PK), `device_reference` (UQ)                               |
| 16  | `score_corrections`      | Audited manual score revisions with previous & new values                     | `correction_id` (PK)                                                    |
| 17  | `revoked_tokens`         | Server-side JWT revocation registry (`jti`) for immediate logout              | `token_id` (PK), `jti` (UQ)                                             |
| 18  | `system_settings`        | Global configuration parameters and retention rules                           | `setting_id` (PK), `key` (UQ)                                           |

---

## 3. High-Concurrency Performance Indexes

To guarantee compliance with **NFR-PERF-001 through NFR-PERF-004** under peak concurrency (250–500 candidates), composite indexes are configured:

1. **`assessment_sessions`**:
   - `@@index([sessionStatus, overallDeadline])`: Powers the high-frequency session expiry worker sweep, avoiding sequential table scans.
   - `@@index([deviceId])`: Enables sub-millisecond device authorization checks on candidate login.
2. **`question_attempts`**:
   - `@@index([attemptStatus, deadlineAt])`: High-speed index scan for mass timer expiry (TC-20) processing 500 records in < 5s.
   - `@@index([sessionId, attemptStatus])`: Accelerates current active question lookups.
3. **`audit_logs`**:
   - `@@index([currentHash])`: Instant lookup for cryptographic audit chain verification.
   - `@@index([eventTimestamp])`, `@@index([actorUserId])`, `@@index([correlationId])`: Supports fast audit trail reporting and incident investigations.
4. **`lab_devices`**:
   - `@@index([deviceStatus])`: Fast filtering of active vs blocked computers.
5. **`revoked_tokens`**:
   - `@@index([expiresAt])`: Efficient index-based cleanup of expired tokens.

---

## 4. Concurrency & Integrity Guarantees

- **Transaction Isolation**: Read Committed (PostgreSQL default), with explicit database row locking (`FOR UPDATE`) when transitioning session states and committing answer submissions.
- **Durable Write Before ACK (Rule 4)**: Candidate answer submissions execute inside an explicit atomic database transaction. The HTTP 200/201 acknowledgement is transmitted _only_ after `COMMIT` succeeds on disk.
- **Idempotency (Rule 3)**: Unique constraints on `idempotency_key` in `answers` and `coding_submissions` prevent duplicate inserts under network retries.

---

## 5. Continuous Archiving & Backup Configuration

```ini
# postgresql.conf settings for RPO <= 15 minutes
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/backups/wal_archive/%f'
archive_timeout = 900 # Forces WAL segment switch every 15 minutes
max_wal_size = 10GB
checkpoint_completion_target = 0.9
```
