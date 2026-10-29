-- VeriSync Baseline Migration (SRS Section 9 Data Model)
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'CANDIDATE', 'TECHNICAL_EVALUATOR');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER', 'DESCRIPTIVE', 'SCENARIO', 'CODING', 'SQL');

-- CreateEnum
CREATE TYPE "SessionState" AS ENUM ('NOT_STARTED', 'READY', 'ACTIVE', 'INTERRUPTED', 'SUBMITTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttemptState" AS ENUM ('PENDING', 'ACTIVE', 'SUBMITTED', 'TIMED_OUT', 'SKIPPED', 'EVALUATION_PENDING', 'EVALUATED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'STARTED', 'COMPLETED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'EVALUATED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TestCaseVisibility" AS ENUM ('SAMPLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('PROVISIONAL', 'FINAL');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateTable users
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "lockout_until" TIMESTAMP(3),
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable candidate_profiles
CREATE TABLE "candidate_profiles" (
    "candidate_id" TEXT NOT NULL,
    "candidate_identifier" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "institution" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "recruitment_reference" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("candidate_id")
);

-- CreateTable assessments
CREATE TABLE "assessments" (
    "assessment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "role_category" TEXT NOT NULL,
    "overall_duration" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "attempt_limit" INTEGER NOT NULL DEFAULT 1,
    "configuration_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable questions
CREATE TABLE "questions" (
    "question_id" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "question_text" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "maximum_marks" DECIMAL(5,2) NOT NULL,
    "negative_marks" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "question_version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable question_options
CREATE TABLE "question_options" (
    "option_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("option_id")
);

-- CreateTable assessment_questions
CREATE TABLE "assessment_questions" (
    "assessment_question_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "time_limit_seconds" INTEGER,
    "marks_override" DECIMAL(5,2),
    "question_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("assessment_question_id")
);

-- CreateTable assessment_assignments
CREATE TABLE "assessment_assignments" (
    "assignment_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "assignment_status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable assessment_sessions
CREATE TABLE "assessment_sessions" (
    "session_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3),
    "overall_deadline" TIMESTAMP(3),
    "session_status" "SessionState" NOT NULL DEFAULT 'NOT_STARTED',
    "submitted_at" TIMESTAMP(3),
    "client_version" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable question_attempts
CREATE TABLE "question_attempts" (
    "question_attempt_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "assessment_question_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "attempt_status" "AttemptState" NOT NULL DEFAULT 'PENDING',
    "awarded_marks" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("question_attempt_id")
);

-- CreateTable answers
CREATE TABLE "answers" (
    "answer_id" TEXT NOT NULL,
    "question_attempt_id" TEXT NOT NULL,
    "answer_payload" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluation_status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "awarded_marks" DECIMAL(5,2),
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable coding_submissions
CREATE TABLE "coding_submissions" (
    "coding_submission_id" TEXT NOT NULL,
    "question_attempt_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "source_code" TEXT NOT NULL,
    "submission_status" "SubmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "execution_reference" TEXT,
    "awarded_marks" DECIMAL(5,2),
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_submissions_pkey" PRIMARY KEY ("coding_submission_id")
);

-- CreateTable test_cases
CREATE TABLE "test_cases" (
    "test_case_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "input_data" TEXT NOT NULL,
    "expected_output" TEXT NOT NULL,
    "visibility" "TestCaseVisibility" NOT NULL DEFAULT 'SAMPLE',
    "marks" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("test_case_id")
);

-- CreateTable results
CREATE TABLE "results" (
    "result_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "total_score" DECIMAL(6,2) NOT NULL,
    "maximum_score" DECIMAL(6,2) NOT NULL,
    "result_status" "ResultStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "finalized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("result_id")
);

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "audit_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "affected_entity" TEXT NOT NULL,
    "event_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "AuditOutcome" NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable lab_devices
CREATE TABLE "lab_devices" (
    "device_id" TEXT NOT NULL,
    "device_reference" TEXT NOT NULL,
    "device_status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "approved_client_version" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_devices_pkey" PRIMARY KEY ("device_id")
);

-- CreateTable score_corrections
CREATE TABLE "score_corrections" (
    "correction_id" TEXT NOT NULL,
    "result_id" TEXT NOT NULL,
    "original_value" DECIMAL(6,2) NOT NULL,
    "revised_value" DECIMAL(6,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "corrected_by" TEXT NOT NULL,
    "corrected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_corrections_pkey" PRIMARY KEY ("correction_id")
);

-- CreateTable revoked_tokens
CREATE TABLE "revoked_tokens" (
    "token_id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("token_id")
);

-- Create Indexes
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "candidate_profiles_candidate_identifier_key" ON "candidate_profiles"("candidate_identifier");
CREATE UNIQUE INDEX "candidate_profiles_user_id_key" ON "candidate_profiles"("user_id");
CREATE UNIQUE INDEX "candidate_profiles_email_key" ON "candidate_profiles"("email");
CREATE INDEX "candidate_profiles_candidate_identifier_idx" ON "candidate_profiles"("candidate_identifier");
CREATE INDEX "candidate_profiles_email_idx" ON "candidate_profiles"("email");
CREATE INDEX "assessments_status_idx" ON "assessments"("status");
CREATE INDEX "assessments_start_at_end_at_idx" ON "assessments"("start_at", "end_at");
CREATE INDEX "questions_topic_idx" ON "questions"("topic");
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");
CREATE INDEX "questions_question_type_idx" ON "questions"("question_type");
CREATE INDEX "question_options_question_id_idx" ON "question_options"("question_id");
CREATE UNIQUE INDEX "assessment_questions_assessment_id_sequence_number_key" ON "assessment_questions"("assessment_id", "sequence_number");
CREATE UNIQUE INDEX "assessment_questions_assessment_id_question_id_key" ON "assessment_questions"("assessment_id", "question_id");
CREATE INDEX "assessment_assignments_candidate_id_idx" ON "assessment_assignments"("candidate_id");
CREATE UNIQUE INDEX "assessment_assignments_assessment_id_candidate_id_key" ON "assessment_assignments"("assessment_id", "candidate_id");
CREATE INDEX "assessment_sessions_session_status_idx" ON "assessment_sessions"("session_status");
CREATE UNIQUE INDEX "assessment_sessions_assignment_id_attempt_number_key" ON "assessment_sessions"("assignment_id", "attempt_number");
CREATE INDEX "question_attempts_session_id_attempt_status_idx" ON "question_attempts"("session_id", "attempt_status");
CREATE UNIQUE INDEX "question_attempts_session_id_assessment_question_id_key" ON "question_attempts"("session_id", "assessment_question_id");
CREATE UNIQUE INDEX "answers_question_attempt_id_idempotency_key_key" ON "answers"("question_attempt_id", "idempotency_key");
CREATE INDEX "coding_submissions_question_attempt_id_idx" ON "coding_submissions"("question_attempt_id");
CREATE INDEX "test_cases_question_id_idx" ON "test_cases"("question_id");
CREATE UNIQUE INDEX "results_session_id_key" ON "results"("session_id");
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");
CREATE INDEX "audit_logs_event_timestamp_idx" ON "audit_logs"("event_timestamp");
CREATE UNIQUE INDEX "lab_devices_device_reference_key" ON "lab_devices"("device_reference");
CREATE INDEX "score_corrections_result_id_idx" ON "score_corrections"("result_id");
CREATE UNIQUE INDEX "revoked_tokens_jti_key" ON "revoked_tokens"("jti");
CREATE INDEX "revoked_tokens_user_id_idx" ON "revoked_tokens"("user_id");
CREATE INDEX "revoked_tokens_expires_at_idx" ON "revoked_tokens"("expires_at");

-- Add Foreign Key Constraints
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("candidate_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assessment_assignments"("assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "lab_devices"("device_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "assessment_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_assessment_question_id_fkey" FOREIGN KEY ("assessment_question_id") REFERENCES "assessment_questions"("assessment_question_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_attempt_id_fkey" FOREIGN KEY ("question_attempt_id") REFERENCES "question_attempts"("question_attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_submissions_question_attempt_id_fkey" FOREIGN KEY ("question_attempt_id") REFERENCES "question_attempts"("question_attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "results" ADD CONSTRAINT "results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "assessment_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "score_corrections" ADD CONSTRAINT "score_corrections_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "results"("result_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "score_corrections" ADD CONSTRAINT "score_corrections_corrected_by_fkey" FOREIGN KEY ("corrected_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revoked_tokens" ADD CONSTRAINT "revoked_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
