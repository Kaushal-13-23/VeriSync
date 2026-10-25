Software Requirements Specification (SRS)
VeriSync: Secure Placement Assessment Platform
Version 1.1 (Revised Baseline) | Date: 24 October 2026 | Status: Proposed Baseline for Review
Revision 1.1 retains all requirements of v1.0 and adds system diagrams, actor and use-case specifications, sequence and state models, API payload examples, sample test cases, and a clearer requirements structure.
---

Document Control
Field Details
Project Name VeriSync: Secure Placement Assessment Platform
Document Software Requirements Specification
Version 1.1 (Revised)
Prepared For Internship Project
Intended Users Super Admins, Placement Administrators, Candidates, Technical Evaluators
Candidate Environment Installed Windows desktop application under managed kiosk restrictions
Administrator Environment Web-based dashboard
Backend Cloud-hosted application services and relational database
Primary Operating Environment Windows lab computers
Revision History
Version Date Description
1.0 24 October 2026 Initial comprehensive SRS baseline
1.1 24 October 2026 Added diagrams (context, architecture, ER, state, sequence), use-case specifications, API examples, sample test cases, requirement conventions, and an expanded glossary
Team
Role Name Signature
Author 1 Kaushal Kumar Singh
Author 2 Ashlin Siddharth
Author 3 Vimal Raj
**Faculty Coordinator ** Keren Lois Daniel
Industry Expert Mr. Samba Kareti
Requirement Conventions
Must: mandatory for the initial production release.
Should: strongly recommended; expected unless formally deferred.
Could: optional enhancement for a later release.
Requirement IDs follow the pattern `FR-<AREA>-<NNN>` (functional) and `NFR-<AREA>-<NNN>` (non-functional). Business rules use `BR-<NNN>`. Use cases use `UC-<NN>`.
Where a requirement has no explicit priority, it is Must unless it uses the word "should" or "could".
---

1. Introduction
   1.1 Purpose
   This document defines the functional, non-functional, technical, operational, and security requirements for VeriSync, a secure assessment platform for technical placement recruitment and candidate evaluation.
   It is the common reference for developers, testers, supervisors, system administrators, placement coordinators, and other stakeholders. It states what the system must do, how its major components interact, how security is enforced, and how success is verified.
   The SRS shall be used to:
   Guide architecture and implementation.
   Fix the scope of the initial release.
   Define responsibilities and permissions for each user type.
   Specify assessment creation, question management, timing, submission, and scoring.
   Specify coding and SQL assessment and automated evaluation.
   Define candidate-application lockdown requirements.
   Define data protection, audit logging, and cloud security requirements.
   Guide integration, security, and acceptance testing.
   Reduce ambiguity during development and maintenance.
   1.2 Project Overview
   VeriSync is a centralized platform for campus placement drives, technical recruitment examinations, and skill-based candidate evaluations. It has three primary components:
   Super Admin Web Dashboard: manages candidates, questions, assessments, assignments, policies, results, and configuration.
   Candidate Desktop Application (Lockdown Client): installed on lab computers; used by candidates to complete assigned assessments.
   Cloud Backend and Database: authentication, authorization, question delivery, timing, answer processing, evaluation, reporting, and audit logging.
   Candidates receive credentials from an authorized administrator. They cannot create accounts, change assignments, view answer keys, or modify examination settings.
   Supported formats: aptitude questions, technical MCQs, SQL problems, debugging exercises, and programming challenges.
   1.3 Objectives
   ID Objective
   OBJ-01 Provide a secure, centralized platform for technical placement assessments.
   OBJ-02 Ensure only authorized candidates can access their assigned assessments.
   OBJ-03 Let the Super Admin manage candidates and assessment configuration.
   OBJ-04 Enforce per-question timing and optional overall deadlines on the server.
   OBJ-05 Prevent advancing without submitting the current question, except under timeout or authorized recovery policy.
   OBJ-06 Auto-submit expired questions and completed assessments by defined rules.
   OBJ-07 Reduce cheating opportunities through kiosk restrictions, application controls, and audit logging.
   OBJ-08 Support programming assessments in multiple languages.
   OBJ-09 Automatically evaluate objective questions and eligible coding submissions.
   OBJ-10 Generate reliable scores, rankings, reports, and records.
   OBJ-11 Protect candidate information and examination content from unauthorized access.
   OBJ-12 Support secure centralized administration across many lab computers.
   1.4 Scope
   1.4.1 In Scope
   Super Admin authentication and authorization.
   Candidate account creation, modification, deactivation, and password management.
   Candidate profile management.
   Assessment creation, scheduling, assignment, and configuration.
   Question bank management and multiple question formats.
   Per-question timers and optional overall timers.
   Sequential candidate navigation, automatic answer submission, advancement, and final submission.
   Server-side scoring.
   Coding questions and isolated code execution; SQL questions and isolated SQL execution.
   Role-based placement assessment templates.
   Candidate session management.
   Lab computer registration and client-version monitoring.
   Kiosk and lockdown integration.
   Audit logging and security-event recording.
   Result management, candidate and assessment reports.
   Secure cloud deployment, backup, recovery, monitoring, and maintenance.
   1.4.2 Out of Scope (Initial Release)
   Facial recognition and biometric identification.
   AI-based proctoring and automated behavioural judgments.
   Live video surveillance.
   Automated recruitment decisions based solely on AI.
   Integration with external applicant tracking systems.
   Mobile candidate examinations.
   Fully offline assessments.
   Integration with university student information systems.
   Automated email or SMS credential delivery without an approved workflow.
   External identity-provider integration.
   Payment processing.
   The architecture shall allow future enhancements without compromising the security of the initial release.
   1.5 Intended Audience
   Project supervisors and mentors, software developers (backend, frontend, desktop), database administrators, cloud engineers, security and QA testers, placement and recruitment administrators, and authorized evaluators.
   1.6 Definitions and Abbreviations
   Term Definition
   SRS Software Requirements Specification
   RBAC Role-Based Access Control
   API Application Programming Interface
   MFA Multi-Factor Authentication
   MCQ Multiple-Choice Question
   SQL Structured Query Language
   TLS Transport Layer Security
   RPO / RTO Recovery Point Objective / Recovery Time Objective
   Kiosk Mode A managed OS environment restricting a device to approved applications or workflows
   Candidate A person assigned an assessment
   Super Admin The highest-privilege platform administrator
   Assessment A configured examination containing questions and evaluation rules
   Question Bank The centrally managed repository of questions
   Question Attempt A candidate's interaction with one question
   Auto-Submission Server-controlled submission when a deadline expires
   Audit Log A timestamped record of a relevant system or administrative event
   Hidden Test Case A coding evaluation input not disclosed to candidates
   Coding Sandbox An isolated environment for compiling and executing candidate code
   Assessment Session The server-managed record of one candidate attempt
   Lockdown Client The installed application used to take assessments under managed restrictions
   Idempotency Key A client-generated token that makes repeated identical requests safe
   Correlation ID An identifier linking all log entries produced by one request or operation
   Provisional Result A result issued before all manual evaluation is complete

---

2. Overall Description
   2.1 Product Perspective
   VeriSync is a cloud-hosted client-server system. The Super Admin uses a web browser; candidates use an installed desktop application on designated lab computers. Both communicate with the backend through authenticated, authorized APIs over HTTPS.
   The backend holds all authoritative assessment data. The candidate application displays questions, collects responses, and relays candidate actions, but it is never trusted to determine deadlines, correct answers, scores, or authorization. The coding execution service is isolated from the main backend to contain the risk of running untrusted code.
   2.2 Logical Components
   Admin Web Application
   Candidate Desktop Application
   Authentication and Session Service
   Candidate Management Service
   Assessment Management Service
   Question Delivery Service
   Timing and Submission Service
   Answer Processing Service
   Evaluation and Scoring Service
   Coding Execution Service
   Results and Reporting Service
   Audit and Monitoring Service
   Relational Database
   Private Object Storage (where required)
   Cloud Infrastructure and Deployment Services
   The database shall not be directly reachable from candidate computers. The coding execution service shall not have unrestricted access to the application database, cloud credentials, internal services, or external networks. Section 3 gives the architecture diagrams.
   2.3 User Classes
   Class Responsibilities Restrictions
   Super Admin Create and manage candidates, questions, and assessments; configure timers and marking; assign assessments; manage schedules; review results and audit logs; manage lab devices and system configuration; control account status Requires strong authentication (MFA for production); access limited to authorized personnel
   Candidate Sign in with issued credentials; view assigned assessments and instructions; start when eligible; answer and submit; view remaining time; receive timeout and submission notices; view own results only if policy permits Cannot self-register, access others' records, manage questions, view answer keys, change timing, or alter assignments
   Technical Evaluator (optional, future or separately enabled) Review subjective answers; evaluate coding submissions manually; assign marks by rubric; add comments No access to candidate account management or global configuration unless granted
   Lab Staff (operational) Run the examination session in the lab; perform documented recovery for technical failures No access to answers, keys, or scores; actions are logged
   In the initial release the Super Admin may perform all evaluation-related operations.
   2.4 Operating Environment
   Candidate environment: designated lab computers; installed Windows application; managed kiosk configuration; network connectivity to the cloud backend; supported security updates; approved application version; restricted candidate OS account.

> **Windows 10 deployment constraint:** standard Windows 10 support ended on 14 October 2025. Before deployment the organization must verify each lab computer's edition, Extended Security Updates coverage, and security status. Migration to a supported Windows version is recommended.
> Administrator environment: supported desktop browser; internet connectivity; authorized administrator account; HTTPS access to the dashboard; MFA for privileged accounts.
> Cloud environment: managed application hosting; managed relational database; HTTPS certificates; private storage; centralized logging and monitoring; automated backups; network restrictions and access controls.
> 2.5 Assumptions
> The organization will provide suitable cloud infrastructure.
> Candidates will use institution-managed lab computers.
> Each candidate receives unique credentials.
> Internet access is available during assessments.
> Questions and marking rules are configured by authorized personnel.
> The organization will define policies for interruptions, candidate privacy, and result retention.
> The coding engine will be separately configured and secured.
> Peak simultaneous candidates will be determined before load testing.
> A supported backend runtime and database version will be used.
> Device lockdown is enforced through operating-system management in addition to application-level restrictions.
> 2.6 Constraints
> The candidate application must support the selected Windows desktop environment.
> The backend must be reachable securely over the internet.
> Assessment timing must be controlled by the server and must not depend on the candidate's local clock.
> Candidate permissions must be enforced independently of the user interface.
> Untrusted candidate code must run in an isolated environment, with no unrestricted internet access from the sandbox.
> Full-screen mode alone must not be treated as a security guarantee.
> Cloud hosting and code-execution costs must be considered in deployment planning.
> Final performance targets must be validated against the expected examination load.

---

3. System Models and Diagrams
   This section is new in v1.1. It gives the architecture, timing flow, state models, and data relationships that the functional requirements in Section 5 build on.
   3.1 System Architecture
   [embedded content: system architecture · 2 clients, 6 services, 3 back-end stores]
   Both clients talk only to the backend API over HTTPS. The database, audit service, and coding sandbox sit behind the API; the sandbox has no route to the database, cloud credentials, or application secrets.
   Component Responsibility Trust Boundary
   Candidate Desktop Application Login, question display, answer entry, timer display, code editor, reconnection handling Untrusted: any rule it enforces is re-checked by the server
   Admin Web Dashboard Candidate, question, assessment, schedule, result, and audit management Authenticated and authorized per request; MFA for privileged users
   Backend API Authentication, authorization, timing, answer acceptance, scoring, reporting Trusted authority
   Relational Database Durable system of record Reachable only from backend services with least-privilege credentials
   Audit and Monitoring Event history and operational health Write-protected from application users
   Coding Execution Sandbox Compile and run candidate code and SQL under limits Fully isolated; no production credentials
   3.2 Per-Question Timing Flow
   [embedded content: per-question timing flow · 6 steps, 1 decision]
   A question's deadline is the server-recorded start time plus its configured limit, never later than the overall assessment deadline. A submission that arrives after the deadline is rejected and the question is finalized as timed out under the configured auto-advance policy.
   3.3 Assessment Session States
   State Meaning Allowed Next States
   Not Started Assignment exists; candidate has not begun Ready, Cancelled
   Ready Eligibility and instructions acknowledged Active, Cancelled
   Active Server clock is running; one question is active Interrupted, Submitted, Expired
   Interrupted Connection or client lost; deadlines keep running Active, Expired, Cancelled
   Submitted Final submission accepted; no further edits none (terminal)
   Expired Overall deadline passed; the server finalized the attempt none (terminal)
   Cancelled Withdrawn by an authorized administrator, logged with reason none (terminal)
   The backend rejects any transition not listed. Reopening or extending an attempt is an audited administrative override (BR-012).
   3.4 Question Attempt States
   State Meaning Allowed Next States
   Pending Not yet reached in sequence Active
   Active Accepting answers until its deadline Submitted, Timed Out
   Submitted Answer accepted and acknowledged Evaluation Pending, Evaluated
   Timed Out Deadline passed; configured timeout rule applied Evaluation Pending, Evaluated
   Skipped Only where the assessment allows skipping Evaluation Pending, Evaluated
   Evaluation Pending Awaiting automatic or manual evaluation Evaluated
   Evaluated Marks awarded none (terminal)
   In sequential mode only the Active attempt accepts a new answer.
   3.5 Data Relationships
   Parent Relationship Child
   users 1 to 0..1 candidate_profiles
   candidate_profiles 1 to many assessment_assignments
   assessments 1 to many assessment_assignments
   assessments 1 to many assessment_questions
   questions 1 to many assessment_questions
   questions 1 to many question_options
   questions 1 to many test_cases
   assessment_assignments 1 to many assessment_sessions
   assessment_sessions 1 to many question_attempts
   assessment_questions 1 to many question_attempts
   question_attempts 1 to many answers
   question_attempts 1 to many coding_submissions
   assessment_sessions 1 to 0..1 results
   users 1 to many audit_logs (as actor)
   `lab_devices` is a registry table referenced by `assessment_sessions` through the reported device reference. Section 9 gives the table definitions.

---

4. Actors and Use Cases
   This section is new in v1.1. Each use case links to the functional requirements in Section 5 that implement it.
   4.1 Actors
   Actor Type Description
   Super Admin Human, primary Manages candidates, content, assessments, results, devices, and audit review
   Candidate Human, primary Takes assigned assessments in the lockdown client
   Technical Evaluator Human, secondary (optional) Manually evaluates subjective and coding answers under a rubric
   Lab Staff Human, secondary Supervises the lab and runs the documented recovery procedure
   Coding Execution Service System Compiles and runs candidate code and SQL; returns structured results
   Cloud Monitoring System Raises alerts on failures and suspicious activity
   4.2 Use Case Catalog
   ID Use Case Primary Actor Priority
   UC-01 Administrator login with MFA Super Admin Must
   UC-02 Provision candidate account Super Admin Must
   UC-03 Bulk import candidates from CSV Super Admin Should
   UC-04 Create and publish a question Super Admin Must
   UC-05 Create, version, and publish an assessment Super Admin Must
   UC-06 Assign assessment to candidates or groups Super Admin Must
   UC-07 Candidate login Candidate Must
   UC-08 Start an assessment Candidate Must
   UC-09 Answer and submit a question Candidate Must
   UC-10 Handle question timeout and auto-advance Candidate, system Must
   UC-11 Write and submit a coding solution Candidate Must for the full technical release
   UC-12 Recover from a network or client interruption Candidate, Lab Staff Must
   UC-13 Final submission Candidate Must
   UC-14 Evaluate and finalize results Super Admin, Evaluator Must
   UC-15 Correct a score with audit trail Super Admin Must
   UC-16 Review audit log Super Admin Must
   UC-17 Register and manage lab devices Super Admin Should
   UC-18 Reset password or deactivate candidate Super Admin Must
   UC-19 Export results and reports Super Admin Should
   4.3 Use Case Specifications
   UC-02: Provision Candidate Account
   Actor: Super Admin. Linked requirements: FR-AUTH-009, FR-CAN-001, FR-CAN-007, FR-AUD-001.
   Preconditions: Super Admin is authenticated with sufficient privilege.
   Main flow:
   Super Admin opens the candidate form and enters candidate ID, name, username, email, institution, qualification, graduation year, and recruitment drive.
   The system validates required fields and checks the candidate ID and username are unique.
   The system generates a temporary credential through the controlled provisioning workflow.
   The system stores the password only as a secure hash and creates the profile in Active status.
   The system writes an audit event; the temporary credential is not logged or placed in general exports.
   Alternative flows: (2a) Duplicate ID or username: the system rejects the record and shows the conflict for administrator review. (3a) The candidate must change the temporary credential at first login.
   Postcondition: An active candidate account exists and no plaintext password is stored.
   UC-05: Create, Version, and Publish an Assessment
   Actor: Super Admin. Linked requirements: FR-ASMT-001 to FR-ASMT-008, FR-QB-008, FR-QB-009.
   Preconditions: Published questions exist in the question bank.
   Main flow:
   Super Admin enters title, role category, instructions, schedule window, overall duration, attempt limit, and marking rules.
   Super Admin selects questions, orders them, sets per-question time limits, and configures randomization and result visibility.
   The system validates the configuration, including that no question deadline can exceed the overall duration.
   Super Admin publishes; the system freezes a versioned snapshot of the configuration and question versions.
   The system records the publication in the audit log.
   Alternative flows: (3a) Validation fails: the system lists errors and keeps the assessment in Draft. (4a) Edits after candidates start create a new configuration version; active attempts keep the version they began with.
   Postcondition: The assessment is Scheduled or Active with an immutable version snapshot.
   UC-08: Start an Assessment
   Actor: Candidate. Linked requirements: FR-UI-001, FR-UI-002, FR-ASMT-006, FR-TIME-002, BR-002, BR-007, BR-015.
   Preconditions: Candidate is logged in, the account is active, the assessment is assigned and inside its availability window, and attempts remain.
   Main flow:
   The client lists assigned assessments with eligibility and status.
   Candidate selects the assessment and reads the instructions, including the monitoring and lockdown policy.
   Candidate acknowledges the instructions and requests to start.
   The server verifies eligibility, attempt count, device and client version, and that no other active session exists.
   The server creates the session, sets the overall deadline, and activates the first question with its deadline.
   The client displays the question and the server-provided remaining time.
   Alternative flows: (4a) Another active session exists: start is denied (BR-007). (4b) Unsupported client version: the server rejects the start and instructs the candidate to contact lab staff.
   Postcondition: Session is Active and the first question attempt is Active.
   UC-09: Answer and Submit a Question
   Actor: Candidate. Linked requirements: FR-UI-003 to FR-UI-007, FR-ANS-001 to FR-ANS-007, FR-TIME-009.
   Preconditions: Session is Active and the question attempt is Active and before its deadline.
   Main flow:
   Candidate enters an answer; for long-form or coding questions the client autosaves drafts without extending the deadline.
   Candidate selects Submit and Next.
   The client sends the answer with an idempotency key.
   The server verifies session, question identifier, status, deadline, and answer format.
   The server stores the answer durably and then returns an acknowledgement.
   The client shows confirmation only after the acknowledgement and displays the next question.
   Alternative flows: (4a) Deadline already passed: the server rejects the answer and applies UC-10. (5a) Response lost: the client retries with the same idempotency key and the server returns the original acknowledgement without creating a duplicate.
   Postcondition: The answer is stored once and the next attempt is Active, or the final-submission path begins.
   UC-10: Handle Question Timeout and Auto-Advance
   Actor: System (server timing service). Linked requirements: FR-TIME-004 to FR-TIME-007, FR-SCORE-006.
   Trigger: The server-computed question deadline is reached with no accepted answer.
   Main flow:
   The server marks the question attempt Timed Out and rejects further changes.
   The server applies the configured marking rule for unanswered questions.
   If auto-advance is enabled, the server activates the next question with a fresh deadline.
   On the next client sync, the client shows the timeout notice and the new question.
   Alternative flows: (3a) The overall deadline is reached at the same moment: it takes precedence and the session moves to Expired (FR-TIME-007). (3b) Auto-advance is disabled: the server waits for the candidate to request the next question.
   Postcondition: The timed-out attempt is final; no late answer can reopen it.
   UC-11: Write and Submit a Coding Solution
   Actor: Candidate; Coding Execution Service. Linked requirements: FR-CODE-001 to FR-CODE-014, NFR-SEC-008.
   Preconditions: A coding question is Active and the submission limit is not exhausted.
   Main flow:
   Candidate selects a supported language and writes code in the editor, optionally running visible sample cases.
   Candidate submits; the backend validates the request and queues a job.
   The sandbox compiles and runs the code against hidden test cases under CPU, memory, process, filesystem, network, and time limits.
   The sandbox returns a structured status: Accepted, Wrong Answer, Compilation Error, Runtime Error, Time Limit Exceeded, Memory Limit Exceeded, or Internal Evaluation Error.
   The backend computes marks from the configured test-case weights and stores the source code and result.
   The candidate sees only the status and permitted sample output, never hidden inputs or expected outputs.
   Alternative flows: (4a) Infrastructure failure: the result is recorded as Internal Evaluation Error, not as a candidate failure, and the submission is re-queued or flagged for administrator review.
   Postcondition: Source code, status, and awarded marks are stored for the attempt.
   UC-12: Recover from a Network or Client Interruption
   Actor: Candidate, Lab Staff. Linked requirements: FR-TIME-010, FR-ANS-007, FR-LAB-007, BR-010, NFR-REL-004.
   Trigger: Connection loss, application crash, or lab computer restart during an Active session.
   Main flow:
   The client shows the connection status and may keep a local draft; a draft is not an accepted submission.
   The server keeps all deadlines running and may mark the session Interrupted.
   The candidate reconnects or restarts the client and logs in again.
   The server returns the authoritative session state, current question, and remaining time.
   The candidate continues; any already accepted answers stay as stored.
   Alternative flows: (3a) The failure is a lab-wide or cloud outage: Lab Staff follow the incident procedure, and an authorized administrator may pause, extend, or reschedule. Every such override is logged with reason and administrator identity (BR-012).
   Postcondition: The session resumes from authoritative state with no duplicate answers and no reset deadlines.
   UC-14: Evaluate and Finalize Results
   Actor: Super Admin, Technical Evaluator. Linked requirements: FR-SCORE-001 to FR-SCORE-009.
   Main flow:
   After final submission, the backend scores objective answers against the assessment version's answer key, applying negative marking.
   Coding and SQL results are scored from approved test-case rules.
   Pending manual items appear in an evaluation queue; evaluators award marks using the rubric and add comments.
   While any item is pending, the result is marked Provisional.
   When all items are complete, the system finalizes the result and computes ranking under the approved tie-break rules.
   Postcondition: A Final result exists that reflects the configuration used during the attempt.
   UC-15: Correct a Score with Audit Trail
   Actor: Super Admin. Linked requirements: FR-SCORE-010, BR-012, FR-AUD-001.
   Main flow:
   Super Admin opens a result, selects the question or total to correct, and enters the revised value and a mandatory reason.
   The system recalculates dependent totals and rankings.
   The system records the original value, revised value, reason, timestamp, and administrator identity.
   Postcondition: The corrected score is stored and the change is permanently traceable.

---

5. Functional Requirements
   Priorities follow the conventions in Document Control. Requirements marked (new) were added in v1.1; all others carry over from v1.0, restated in table form.
   5.1 Authentication and Account Management
   ID Requirement Priority
   FR-AUTH-001 The system shall provide a secure Super Admin login and grant access only after server-side credential validation. Must
   FR-AUTH-002 The candidate application shall require the username and password issued by an authorized administrator. Candidates shall not self-register. Must
   FR-AUTH-003 Passwords shall be stored with an appropriate hashing algorithm such as Argon2id. Plaintext passwords shall never appear in the database or logs. Must
   FR-AUTH-004 The system shall rate-limit logins and apply temporary restriction or additional verification after repeated failures, per security policy. Must
   FR-AUTH-005 The Super Admin shall be able to start a candidate password reset through an authorized workflow. The system shall never reveal an existing password. Must
   FR-AUTH-006 The Super Admin shall be able to deactivate a candidate account. A deactivated candidate cannot start a new session; existing sessions follow the configured revocation policy. Must
   FR-AUTH-007 The backend shall maintain session state and enforce expiry, revocation, and authorization. Must
   FR-AUTH-008 Privileged administrator accounts shall support multi-factor authentication. Must for production privileged access
   FR-AUTH-009 The system shall provide a secure credential provisioning workflow. Temporary credentials require a controlled first login or authorized reset, and are never exposed in general exports or audit logs. Must
   FR-AUTH-010 (new) A candidate session token shall be bound to the registered device and client version that created it, and shall be rejected from any other device. Should
   5.2 Candidate Management
   ID Requirement Priority
   FR-CAN-001 The Super Admin shall create candidate records with candidate ID, full name, username, email, phone (where required), institution, degree, graduation year, recruitment drive, and account status. Must
   FR-CAN-002 The Super Admin shall edit permitted candidate details; significant changes shall be logged. Must
   FR-CAN-003 The system should support bulk CSV import with a validated template; invalid rows are reported and never create incomplete records. Should
   FR-CAN-004 The Super Admin shall search and filter by candidate ID, name, assignment, account status, and recruitment drive. Must
   FR-CAN-005 The Super Admin shall assign one or more assessments to selected candidates. Must
   FR-CAN-006 The Super Admin shall view authorized login history, assignments, attempt and submission status, and results. Must
   FR-CAN-007 The system shall enforce unique candidate IDs and usernames; duplicates are handled through explicit validation and administrator review. Must
   5.3 Assessment Management
   ID Requirement Priority
   FR-ASMT-001 The Super Admin shall create an assessment with a unique identifier and configurable parameters. Must
   FR-ASMT-002 The system shall support configuring name, description, role, instructions, start and end time, overall duration, question selection and order, per-question limits, total marks, negative marking, maximum attempts, passing criteria, randomization, result visibility, auto-submission policy, and candidate eligibility. Must
   FR-ASMT-003 Assessments shall be editable before candidates begin. Once active, changes that affect existing candidates shall be restricted or versioned and shall never silently alter an active candidate's deadlines or marking rules. Must
   FR-ASMT-004 The Super Admin shall schedule assessments for a date and time range. Must
   FR-ASMT-005 The system shall support assigning assessments to individuals or defined candidate groups. Must
   FR-ASMT-006 The Super Admin shall configure the maximum number of attempts; the server shall enforce it. Must
   FR-ASMT-007 Assessments shall support Draft, Scheduled, Active, Completed, Suspended, and Archived statuses; only authorized administrators change status. Must
   FR-ASMT-008 The system should version assessment configuration so each attempt links to the exact configuration used. Should
   5.4 Question Bank Management
   ID Requirement Priority
   FR-QB-001 The Super Admin shall create questions with text, instructions, code snippets, and supported media. Must
   FR-QB-002 Questions shall be categorized by topic, skill, difficulty, role, and type. Must
   FR-QB-003 Supported types: single-answer MCQ, multiple-select, true/false, short answer, SQL, code-output prediction, debugging, programming problem, and scenario-based technical question. Must
   FR-QB-004 For objective questions the Super Admin shall create, edit, and order options. Correct-answer data shall be inaccessible to candidate-facing APIs. Must
   FR-QB-005 Each question shall support maximum marks and, where applicable, negative marks. Must
   FR-QB-006 Each question shall have an independently configurable time limit, and limits may differ by question type. Must
   FR-QB-007 The system shall validate required fields before a question can be published. Must
   FR-QB-008 Questions used in active or completed assessments shall not be modified destructively. The system should preserve question versions or snapshots. Must
   FR-QB-009 Where enabled, the system shall randomize eligible questions or options without changing marks, deadlines, or answer-key correctness. Must
   FR-QB-010 The system should support structured import and export in a documented format; exports containing answer keys are restricted to authorized administrators. Should
   5.5 Candidate Assessment Interface
   ID Requirement Priority
   FR-UI-001 After login the candidate shall see assigned assessments with eligibility and status. Must
   FR-UI-002 Instructions shall be displayed before the assessment begins and acknowledged before proceeding. Must
   FR-UI-003 In sequential mode the application shall show one active question at a time. Must
   FR-UI-004 The candidate shall not advance until the current question is submitted, unless the timer-expiry or administrative recovery policy applies. Must
   FR-UI-005 The interface shall not offer unrestricted question navigation in sequential mode. Must
   FR-UI-006 The interface shall display remaining time for the current question and, where enabled, the overall assessment. Must
   FR-UI-007 The application shall clearly show whether a question or the final assessment was submitted successfully. Must
   FR-UI-008 A candidate attempting to open another candidate's assessment or a restricted screen shall be denied. Must
   FR-UI-009 The application shall handle attempts to close or leave the assessment under the lockdown and recovery policy, and shall not claim to block every operating-system escape path. Must
   5.6 Timing and Automatic Submission
   ID Requirement Priority
   FR-TIME-001 The backend shall be authoritative for all question and overall deadlines. Must
   FR-TIME-002 The server shall record the start timestamp of each question attempt when it becomes active. Must
   FR-TIME-003 The server shall compute each question deadline from its recorded start time and configured limit. Must
   FR-TIME-004 On expiry the server shall reject further changes to the question and apply the configured submission policy. Must
   FR-TIME-005 In sequential assessments the system shall advance to the next question after a timeout when auto-advance is enabled. Must
   FR-TIME-006 The server shall enforce any overall deadline independently of question timers. Must

FR-TIME-007 If question and overall deadlines expire together, the overall deadline takes precedence. Must
FR-TIME-008 Changing the candidate computer's clock shall not extend or shorten any server deadline. Must
FR-TIME-009 Repeated submissions shall not produce duplicate marks or duplicate completion records. Must
FR-TIME-010 After a temporary network failure the backend shall return the authoritative state and remaining time. Disconnected time counts toward the deadline unless an authorized interruption policy provides otherwise. Must
FR-TIME-011 The system shall record question start, submission, timeout, and assessment completion timestamps. Must
5.7 Answer Submission and Storage
ID Requirement Priority
FR-ANS-001 The system shall accept answers only for the candidate's active, authorized question attempt. Must
FR-ANS-002 The backend shall verify session, question identifier, status, deadline, and answer format before accepting a submission. Must
FR-ANS-003 Accepted answers shall be stored on the server. Must
FR-ANS-004 Submitted answers are immutable unless an explicitly authorized and audited reopening workflow permits change. Must
FR-ANS-005 For long-form and coding questions the application should autosave drafts at a configurable interval, without extending the deadline or bypassing submission. Should
FR-ANS-006 The backend shall return an authoritative acknowledgement after recording a submission; the client shall show success only after receiving it. Must
FR-ANS-007 The system shall recover safely after temporary connectivity failures without duplicating accepted submissions. Must
FR-ANS-008 On completion the system shall mark the assessment submitted and prevent unauthorized changes. Must
FR-ANS-009 (new) Every answer and code submission request shall carry a client-generated idempotency key; a repeated key returns the original outcome and creates no new record. Must
5.8 Technical Assessment and Coding Engine
ID Requirement Priority
FR-CODE-001 The system shall support C, C++, Java, Python, and JavaScript. Exact language versions shall be defined and pinned before deployment. Must for the full technical release
FR-CODE-002 The candidate application shall provide a suitable code editor or approved integrated editor component. Must
FR-CODE-003 The system shall support visible sample inputs and expected outputs. Must
FR-CODE-004 The Super Admin shall configure hidden test cases. Hidden inputs, expected outputs, and scoring details shall not be disclosed to candidates. Must
FR-CODE-005 Candidate code shall be sent to a dedicated coding execution service for compilation or execution. Must
FR-CODE-006 The coding engine shall enforce configurable execution time and memory limits. Must
FR-CODE-007 Candidate code shall run in an isolated environment with restricted filesystem, network, process privileges, and resource use. Must
FR-CODE-008 The engine shall return a status: Accepted, Wrong Answer, Compilation Error, Runtime Error, Time Limit Exceeded, Memory Limit Exceeded, or Internal Evaluation Error. Must
FR-CODE-009 Candidate-visible responses shall not reveal hidden test cases, expected outputs, internal paths, environment variables, or infrastructure details. Must
FR-CODE-010 The Super Admin should be able to configure the permitted number of code submissions per question. Should
FR-CODE-011 Coding scores shall be calculated from the configured test-case and marking rules. Must
FR-CODE-012 An infrastructure failure in the evaluation service shall be distinguished from a candidate compilation or runtime failure. Must
FR-CODE-013 The execution service shall not receive unrestricted access to the primary database or production application credentials. Must
FR-CODE-014 Submitted source code and evaluation results shall be retained per the configured retention policy. Must
5.9 SQL Assessment
ID Requirement Priority
FR-SQL-001 The Super Admin shall author SQL questions with instructions, schema definitions, and evaluation rules. Must
FR-SQL-002 SQL submissions shall execute only against an isolated, controlled assessment database or sandbox. Must
FR-SQL-003 The evaluation environment shall block access to production data, external databases, operating-system resources, and other candidates' submissions. Must
FR-SQL-004 The system should compare query results with approved expected results or run predefined validation tests. Should
FR-SQL-005 The SQL evaluation service shall enforce query execution limits and restrict expensive or unsafe operations. Must
5.10 Scoring and Evaluation
ID Requirement Priority
FR-SCORE-001 The backend shall evaluate objective questions against the answer key of the assessment version. Must
FR-SCORE-002 The system shall support configurable negative marking. Must
FR-SCORE-003 The system should support partial credit for multiple-select questions, coding test cases, and manually evaluated responses. Should
FR-SCORE-004 Short-answer questions shall support manual evaluation unless a separately approved mechanism is implemented. Must
FR-SCORE-005 Marks shall be calculated according to the configured assessment and question rules. Must
FR-SCORE-006 The configured marking rule shall be applied to unanswered and timed-out questions. Must
FR-SCORE-007 Candidates shall not be able to modify scores, answer keys, marks, or evaluation status through client requests. Must
FR-SCORE-008 Final results shall be generated after all required evaluation completes; while manual evaluation is pending the result is marked provisional. Must
FR-SCORE-009 The system should support ranking by approved score and tie-breaking rules. Should
FR-SCORE-010 Score corrections shall create an audit record with original value, revised value, reason, timestamp, and administrator identity. Must
5.11 Super Admin Dashboard and Reporting
ID Requirement Priority
FR-ADMIN-001 The dashboard shall give an overview of candidates, assessments, active sessions, submissions, and results. Must
FR-ADMIN-002 The Super Admin shall monitor assessment status and identify candidates with interrupted sessions. Must
FR-ADMIN-003 The dashboard shall show authorized candidate results and assessment-level statistics. Must
FR-ADMIN-004 The system should export authorized results to CSV or Excel. Should
FR-ADMIN-005 The system should generate reports with identity, assessment details, completion status, score, and permitted evaluation details. Should
FR-ADMIN-006 The system should provide question-level statistics, including response distribution and correct-answer rates. Should
FR-ADMIN-007 The Super Admin shall search and filter audit events. Must
FR-ADMIN-008 Exports containing candidate data or answer keys shall be restricted to authorized users and logged. Must
FR-ADMIN-009 Reports shall be generated from authoritative server-side records. Must
5.12 Lab Client and Kiosk Management
ID Requirement Priority
FR-LAB-001 The system should maintain a registry of authorized lab computers. Should
FR-LAB-002 Each registered device shall have a unique application-managed identifier; security decisions shall not rely solely on a client-provided identifier. Must
FR-LAB-003 The backend shall identify the installed client version reported by the application. Must
FR-LAB-004 The system should reject or restrict unsupported client versions. Should
FR-LAB-005 The deployment shall integrate the candidate application with the selected OS kiosk or lockdown configuration. Must
FR-LAB-006 The system shall record detected application exits, focus changes, or lockdown events where technically available. Must
FR-LAB-007 Authorized lab staff shall have a documented recovery procedure for legitimate technical failures. Must
FR-LAB-008 The implementation shall not rely solely on full-screen mode or client-side JavaScript to prevent operating-system switching. Must
5.13 Audit Logging
ID Requirement Priority
FR-AUD-001 The system shall record significant administrative actions: candidate creation, assessment publication, assignment changes, question changes, account deactivation, and result correction. Must
FR-AUD-002 The system shall record session start, question activation, submission, timeout, interruption, and final completion. Must
FR-AUD-003 The system shall record login successes, relevant failures, session revocation, and administrative authentication events. Must
FR-AUD-004 Audit records shall be protected against unauthorized modification and deletion. Must
FR-AUD-005 Audit entries should include event type, timestamp, actor, affected record, outcome, and a request or correlation identifier. Should
FR-AUD-006 Passwords, tokens, secret keys, and unnecessary sensitive candidate data shall not be logged. Must
FR-AUD-007 Audit logs shall be retained per an approved retention policy. Must
5.14 System Configuration
ID Requirement Priority
FR-CONF-001 The Super Admin shall manage approved assessment and system settings through authorized controls. Must
FR-CONF-002 The backend shall validate configuration values and reject invalid or unsupported settings. Must
FR-CONF-003 Security-sensitive configuration changes shall be logged. Must
FR-CONF-004 Development, testing, and production shall use separate configurations and credentials. Must
---

6. Business Rules
   ID Rule
   BR-001 Only authorized administrators may create or activate candidate accounts.
   BR-002 A candidate may access only assessments assigned to that candidate or an authorized candidate group.
   BR-003 In sequential mode the candidate must submit the current question before proceeding.
   BR-004 The backend determines assessment state, deadlines, submission acceptance, and final scores.
   BR-005 An expired question accepts no modifications; the timeout and auto-advance policy decide the next action.
   BR-006 An overall deadline takes precedence over a question deadline that expires at the same time.
   BR-007 By default one active attempt is allowed per candidate per assignment; extra simultaneous sessions are denied unless an approved policy permits them.
   BR-008 A completed assessment is not editable by the candidate.
   BR-009 Candidate-facing interfaces never receive correct answers or hidden test data, unless an explicit post-assessment disclosure policy permits it.
   BR-010 Network or client interruptions never reset deadlines or grant extra attempts.
   BR-011 Scores are calculated from the configuration associated with the candidate's attempt.
   BR-012 Any authorized reopening, deadline extension, or score change is logged with reason and administrator identity.
   BR-013 Candidate code never runs in the main application process or with unrestricted access to production infrastructure.
   BR-014 Only candidate information required for recruitment is collected and retained.
   BR-015 Candidates are told about monitoring, lockdown, and integrity policies before starting.

---

7. Non-Functional Requirements
   7.1 Performance
   ID Requirement
   NFR-PERF-001 Under the approved target load and normal network conditions, 95% of login requests should complete within 2 seconds.
   NFR-PERF-002 95% of question-delivery requests should complete within 1.5 seconds.
   NFR-PERF-003 95% of ordinary answer submissions should receive a server acknowledgement within 2 seconds. Coding execution has separate limits.
   NFR-PERF-004 The system shall be load-tested for the expected peak of concurrent candidates; the target shall be agreed before production deployment.
   NFR-PERF-005 Reports should be generated within an agreed time for the expected volume; large exports may run asynchronously.
   7.2 Security
   ID Requirement
   NFR-SEC-001 All client-to-backend communication shall use HTTPS with correctly validated TLS certificates.
   NFR-SEC-002 Passwords shall be stored using an appropriate salted password-hashing scheme.
   NFR-SEC-003 Every component and user shall receive only the permissions its function requires.
   NFR-SEC-004 The backend shall enforce authorization on every protected operation.
   NFR-SEC-005 Database passwords, cloud credentials, signing keys, and other secrets shall live in an approved secrets-management mechanism, never in source code or client binaries.
   NFR-SEC-006 The system shall use parameterized database operations and validated inputs against injection.
   NFR-SEC-007 Sessions and tokens shall have secure handling, appropriate expiry, revocation, and replay protection.
   NFR-SEC-008 The coding service shall enforce process, memory, CPU, filesystem, network, and time restrictions.
   NFR-SEC-009 Audit logs shall be protected from unauthorized alteration.
   NFR-SEC-010 The application, OS, runtime, dependencies, and infrastructure shall follow a documented patch and vulnerability-management process.
   NFR-SEC-011 Dependency scanning, authentication and authorization testing, and penetration testing appropriate to the risk shall be completed before the first live recruitment drive.
   NFR-SEC-012 The web application and APIs shall be designed and tested against applicable OWASP guidance.
   7.3 Reliability and Availability
   ID Requirement
   NFR-REL-001 Proposed initial target: 99.5% monthly availability for the production assessment service, excluding agreed maintenance windows, reviewed against budget and business needs.
   NFR-REL-002 Accepted submissions shall be committed to durable server storage before success is acknowledged.
   NFR-REL-003 Retries shall not create duplicate accepted submissions or duplicate score records.
   NFR-REL-004 The system shall recover from application restarts and temporary network interruptions without resetting authoritative deadlines.
   NFR-REL-005 Errors shall be recorded with correlation identifiers; user-facing messages shall not expose internal details.
   NFR-REL-006 The database shall be backed up regularly and restoration tested before production approval.
   7.4 Usability, Maintainability, Scalability, Privacy, Compatibility
   ID Requirement
   NFR-USE-001 The candidate interface shall give clear instructions and minimize unnecessary navigation.
   NFR-USE-002 The current question timer shall remain clearly visible.
   NFR-USE-003 The application shall clearly communicate submission, timeout, reconnection, and final completion states.
   NFR-USE-004 Common administrative operations shall sit in a structured dashboard with validation and confirmation for destructive actions.
   NFR-USE-005 The system should support keyboard accessibility, readable text, sufficient contrast, and assistive technologies where compatible with the lockdown policy.
   NFR-MNT-001 Authentication, assessment management, timing, submissions, evaluation, reporting, and code execution shall be separate modules.
   NFR-MNT-002 The codebase shall follow consistent standards, meaningful names, appropriate error handling, and automated tests.
   NFR-MNT-003 The project shall include architecture, database, API, deployment, and troubleshooting documentation.
   NFR-MNT-004 Application code and infrastructure configuration shall be kept in version control.
   NFR-MNT-005 Schema changes shall use controlled, versioned migrations.
   NFR-SCALE-001 Stateless API services shall support horizontal scaling where required.
   NFR-SCALE-002 The database and the coding execution service shall be sized and scaled independently.
   NFR-SCALE-003 The application shall be load-tested with realistic assessment and coding workloads before candidate capacity is increased.
   NFR-PRIV-001 Candidate information shall be collected only for approved recruitment and assessment purposes.
   NFR-PRIV-002 Access to candidate information shall be restricted by role and business need.
   NFR-PRIV-003 The organization shall define retention, deletion, access, and disclosure policies.
   NFR-PRIV-004 Monitoring and lockdown activity shall be described in candidate instructions and handled under institutional policy and applicable law.
   NFR-COMP-001 The candidate application shall be tested against the approved Windows version, device configuration, resolution, and kiosk policy.
   NFR-COMP-002 The administrator dashboard shall support approved versions of common desktop browsers.
   NFR-COMP-003 The system shall validate client versions and reject unsupported ones according to deployment policy.
   7.5 Proposed Recovery Objectives
   Measure Proposed Target
   Recovery Point Objective (RPO) 15 minutes or less
   Recovery Time Objective (RTO) 4 hours or less
   Database backup Daily full backup plus point-in-time recovery where available
   Restore testing Before production release and periodically thereafter

Submission durability Every acknowledged submission is durably recorded
These are design targets for approval, not guarantees. The cloud provider, database configuration, service tier, and backup strategy must support them.
---

8. External Interface Requirements
   8.1 Admin Web Interface
   The dashboard shall provide login and logout; candidate, assessment, and question-bank management; scheduling and assignment; assessment monitoring; results and reports; audit-log search; and configuration and account management. It shall show clear validation errors and confirmation prompts for destructive or security-sensitive actions.
   8.2 Candidate Desktop Interface
   The desktop application shall provide login, eligibility and instructions, assessment start, current question display, question timer, answer entry, a code editor for programming questions, Submit and Next, timeout notification, reconnection handling, and final submission confirmation. It shall not display administrative controls or unrestricted navigation.
   8.3 Backend API
   Clients use versioned APIs over HTTPS. Every protected endpoint authenticates and authorizes the caller, validates request data, enforces assessment state, and returns structured responses. Endpoint names are illustrative and may change during implementation.
   Group Method and Path Purpose
   Auth POST /api/v1/auth/login Sign in
   Auth POST /api/v1/auth/logout End session
   Auth POST /api/v1/auth/refresh Refresh token, if that architecture is chosen
   Auth POST /api/v1/auth/password-reset Reset flow
   Candidates GET, POST /api/v1/admin/candidates List, create
   Candidates GET, PATCH /api/v1/admin/candidates/{id} Read, update
   Candidates POST /api/v1/admin/candidates/import Bulk CSV import
   Assessments GET, POST /api/v1/admin/assessments List, create
   Assessments GET, PATCH /api/v1/admin/assessments/{id} Read, update
   Assessments POST /api/v1/admin/assessments/{id}/publish Publish a version
   Assessments POST /api/v1/admin/assessments/{id}/assignments Assign candidates or groups
   Candidate GET /api/v1/candidate/assessments Assigned assessments
   Candidate POST /api/v1/candidate/assessments/{id}/start Start a session
   Candidate GET /api/v1/candidate/sessions/{id}/current-question Active question and deadline
   Candidate POST /api/v1/candidate/sessions/{id}/answers Submit an answer
   Candidate POST /api/v1/candidate/sessions/{id}/code-submissions Submit code
   Candidate POST /api/v1/candidate/sessions/{id}/final-submit Final submission
   Candidate GET /api/v1/candidate/sessions/{id}/status Authoritative state and remaining time
   Results GET /api/v1/admin/results, /results/{id} Results
   Audit GET /api/v1/admin/audit-logs Audit search
   8.3.1 Illustrative Payloads (new in v1.1)
   These examples show intent only; field names may change. Note that the client never sends a deadline, and the server never sends an answer key.
   Submit an answer (request):

```json
POST /api/v1/candidate/sessions/9f3c/answers
Idempotency-Key: 6b1e2d0a-4c8f-4e0b-9a52-0d7d3f1c8a11

{
  "questionAttemptId": "qa_0142",
  "answer": { "type": "single_choice", "optionId": "opt_3" }
}
```

Accepted (response):

```json
{
  "status": "accepted",
  "questionAttemptId": "qa_0142",
  "submittedAt": "2026-11-02T09:41:07Z",
  "next": { "questionAttemptId": "qa_0143", "deadlineAt": "2026-11-02T09:43:07Z" },
  "serverTime": "2026-11-02T09:41:07Z"
}
```

Rejected after the deadline (response):

```json
{
  "status": "rejected",
  "code": "QUESTION_EXPIRED",
  "message": "This question has timed out.",
  "correlationId": "c-7d21f8"
}
```

8.3.2 API Security Requirements
Candidate APIs return only the candidate's authorized assessment data.
Candidate requests never determine the authoritative deadline.
Administrative endpoints require appropriate privileges.
Answer keys and hidden test cases are never returned through candidate endpoints.
Requests are validated against the current assessment state.
Sensitive operations are logged.
Rate limits apply to authentication and resource-intensive operations.
Idempotency or equivalent duplicate protection applies where necessary (FR-ANS-009).
Errors never disclose secrets or internal infrastructure details.
The API enforces request-size and resource-consumption limits.
8.3.3 Standard Error Codes (new in v1.1)
Code HTTP Meaning
UNAUTHENTICATED 401 Missing or invalid session
FORBIDDEN 403 Role or ownership check failed
NOT_ELIGIBLE 403 Outside window, attempts used, or assignment revoked
INVALID_STATE 409 Transition not allowed for the current session or question state
QUESTION_EXPIRED 409 Deadline passed before the answer arrived
DUPLICATE_REQUEST 200 Idempotency key already processed; original result returned
UNSUPPORTED_CLIENT 426 Client version is not approved
RATE_LIMITED 429 Too many requests
VALIDATION_FAILED 422 Request body failed validation
INTERNAL_ERROR 500 Unexpected failure; correlation ID returned
8.4 Database Interface
The backend reaches the relational database only through a controlled data-access layer. Candidate clients never connect to it. Database access uses least-privilege service credentials, encrypted connections where applicable, and restricted network access.
8.5 Coding Execution Interface
The backend calls the coding service over a secured internal interface that carries only the source code, language configuration, test-execution parameters, and authorized evaluation identifiers. The service returns a structured result without internal infrastructure details or hidden test data.
---

9. Database Requirements and Logical Data Model
   The database keeps normalized records for identity, candidate profiles, assessments, questions, attempts, answers, coding submissions, results, and audit events. The physical schema is confirmed during database design. Relationships are shown in Section 3.5. Fields marked (new) were added in v1.1.
   9.1 Proposed Tables
   Table Purpose Key Fields
   users Login identity and access control user_id (PK), username (unique), password_hash, role, account_status (active, inactive, locked), created_at, updated_at
   candidate_profiles Recruitment information candidate_id (PK), user_id (FK), full_name, email, phone, institution, qualification, graduation_year, recruitment_reference
   assessments Assessment configuration assessment_id (PK), title, description, role_category, overall_duration, start_at, end_at, status, attempt_limit, configuration_version, created_by
   questions Question content and metadata question_id (PK), question_type, question_text, topic, difficulty, maximum_marks, negative_marks, question_version, status
   question_options Options for objective questions option_id (PK), question_id (FK), option_text, display_order. Correct-answer data is held in a protected server-side structure inaccessible to candidate APIs
   assessment_questions Questions mapped to an assessment assessment_question_id (PK), assessment_id, question_id, sequence_number, time_limit_seconds, marks_override, question_version
   assessment_assignments Candidate assignments assignment_id (PK), assessment_id, candidate_id, assignment_status (assigned, started, completed, revoked), assigned_at, assigned_by
   assessment_sessions Attempt state session_id (PK), assignment_id, attempt_number, started_at, overall_deadline, session_status (active, interrupted, submitted, expired), submitted_at, client_version, device_id (new)
   question_attempts State and timing per question question_attempt_id (PK), session_id, assessment_question_id, started_at, deadline_at, submitted_at, attempt_status (active, submitted, timed out, skipped), awarded_marks
   answers Submitted responses answer_id (PK), question_attempt_id, answer_payload, submitted_at, evaluation_status (pending, evaluated, failed), awarded_marks, idempotency_key (new, unique per session)
   coding_submissions Code and evaluation reference coding_submission_id (PK), question_attempt_id, language, source_code or protected object reference, submission_status (queued, running, completed, failed), execution_reference, awarded_marks
   test_cases Coding test cases test_case_id (PK), question_id, input_data, expected_output, visibility (sample or hidden), marks. Hidden cases are readable only by evaluation services and administrators
   results Finalized results result_id (PK), session_id, total_score, maximum_score, result_status (provisional or final), finalized_at
   audit_logs Security and administrative history audit_id (PK), actor_user_id, event_type, affected_entity, event_timestamp, outcome (success, denied, failure), correlation_id, metadata (validated, non-sensitive)
   lab_devices Authorized candidate computers device_id (PK), device_reference (application-managed unique identifier), device_status (active, inactive, blocked), approved_client_version, last_seen_at
   score_corrections (new) History of authorized score changes correction_id (PK), result_id, original_value, revised_value, reason, corrected_by, corrected_at
   9.2 Data Integrity
   The database shall enforce primary-key uniqueness, foreign-key relationships, required fields, unique usernames and candidate identifiers, valid status transitions for assessments and sessions, referential integrity for assignments and attempts, transactional persistence of accepted submissions, and indexes for candidate search, active sessions, and reports.
   9.3 Data Retention
   The organization defines retention periods before production deployment. The system shall support controlled deletion, archival, or anonymization where policy or law requires it, taking audit requirements and legal preservation obligations into account.

---

10. Security Architecture and Threat Model
    10.1 Security Objectives
    The design protects candidate credentials and personal data, unpublished questions and answer keys, hidden coding test cases, timing and submission state, answers and source code, final scores and reports, cloud infrastructure and service credentials, and audit logs and configuration.
    10.2 Threats and Mitigations
    Threat Potential Impact Required Mitigation
    Credential guessing Unauthorized candidate access Rate limiting, password hashing, account controls
    Candidate accessing another account Data disclosure or impersonation Server-side authorization and session binding
    Client-side timer manipulation Unfair extra time Server-authoritative deadlines
    Direct API manipulation Skipped questions or unauthorized submission State validation and authorization
    Answer-key extraction Assessment compromise Keep answer keys server-side
    Hidden test disclosure Coding assessment compromise Isolated evaluation and restricted responses
    Code execution attack Server compromise Isolated sandbox with restricted privileges
    SQL injection Data theft or modification Parameterized queries and input validation
    Stolen administrator credentials Platform compromise MFA, least privilege, monitoring
    Network interception Credential or data exposure HTTPS and certificate validation
    Duplicate submissions Incorrect results Idempotency keys and transactions
    Candidate application exit Interruption or cheating Managed kiosk policies and audit events
    Cloud service failure Interrupted examinations Monitoring, recovery procedures, backups
    Unauthorized report export Candidate information disclosure Role checks, restricted exports, audit logs
    Malicious dependency Supply-chain compromise Dependency pinning, scanning, controlled updates
    10.3 Candidate Application Lockdown
    The installed application runs full-screen under an approved lockdown configuration. Application-level controls cannot guarantee that a candidate cannot use a Windows shortcut, end a process, open another application, or use a separate device. The deployment therefore combines the application with operating-system controls: a dedicated candidate account and a tested kiosk or device-management policy.
    The implementation shall:
    Restrict access to unapproved applications where supported.
    Disable or restrict unauthorized navigation and system access using supported OS policies.
    Prevent candidates from modifying assessment files or application configuration.
    Protect application updates and executable integrity.
    Provide a documented administrative recovery mechanism.
    Test keyboard shortcuts, application switching, restart behaviour, and kiosk escape paths.
    Record detected incidents without treating every focus change as conclusive proof of cheating.
    10.4 Coding Sandbox Security
    The sandbox is isolated from the main infrastructure. It shall run code with unprivileged identities; restrict CPU, memory, process count, disk use, and duration; restrict filesystem access; disable unnecessary outbound and lateral network access; block cloud metadata endpoints and application secrets; use controlled language runtimes and compiler versions; clean up temporary environments; limit the size of source files, inputs, outputs, and logs; distinguish candidate errors from infrastructure failures; and never run candidate code in the backend API process.
    10.5 Pre-Release Security Testing
    Before production release the team shall test authentication and password reset, role and permission boundaries, candidate access to other candidates' records, question and answer-key exposure, timer and submission manipulation, API replay and duplicate submissions, SQL injection and input validation, sandbox escape attempts, excessive resource consumption, kiosk restrictions and OS escape paths, and backup restoration and audit integrity.

---

11. Operational Workflows
    11.1 Assessment Lifecycle
    Draft, Validated, Published, Scheduled or Available, Active Attempt, Submitted, Evaluated, Finalized, Archived. Not every assessment passes through every optional status. Session and question-attempt states are in Sections 3.3 and 3.4.
    11.2 Overall Assessment Timing
    When an overall duration is configured, the backend computes the overall deadline when the assessment begins. A question deadline never exceeds the overall deadline. The server prevents extra time through application refresh, system clock changes, or reconnection.
    11.3 Network Interruption Workflow
    The application shows a clear connection status.
    The application may preserve a local draft; a draft is never an accepted submission.
    The server deadline continues to apply.
    On reconnection the client fetches the authoritative session state.
    Already accepted submissions are not duplicated.
    Expired questions do not reopen automatically.
    Any administrator-authorized extension or reopening is logged.
    The assessment policy shall define what happens during a prolonged cloud outage: pausing through an authorized incident procedure, cancelling affected attempts, or rescheduling candidates.
    11.4 Incident Handling Roles (new in v1.1)
    Situation First Responder Decision Maker Required Record
    One candidate's computer fails Lab Staff Lab Staff, with Super Admin approval for any time adjustment Audit event and reason
    Lab-wide network loss Lab Staff Super Admin Incident note, affected sessions, any extension
    Cloud service outage Super Admin Placement Coordinator Incident timeline, pause or reschedule decision
    Suspected integrity event Lab Staff Placement Coordinator Audit events; no automatic penalty from a single focus-change event

---

12. Cloud Deployment and Infrastructure
    12.1 Deployment Architecture
    Production includes publicly reachable HTTPS endpoints for approved clients, private application services where supported, restricted database access, managed secret storage, centralized logging and monitoring, protected backups, an isolated coding execution environment, and separate development, test, and production environments. The cloud provider is chosen on organizational policy, cost, available expertise, regional requirements, and service compatibility.
    12.2 Environment Separation
    Development, staging, and production use separate credentials and secrets, databases or isolated instances, storage locations, API configurations, and access permissions. Production candidate data is never copied to development without approved protection and handling procedures.
    12.3 Release Pipeline
    Source-code review.
    Automated unit and integration tests.
    Dependency and vulnerability scanning.
    Database migration validation.
    Staging deployment.
    Regression testing.
    Approval for production release.
    Production deployment.
    Health checks and monitoring.
    Rollback readiness.
    12.4 Monitoring and Alerting
    The system monitors API availability and latency, authentication failures, active sessions, submission failures, database health, coding queue length and failures, storage capacity, resource use, backup success, and security-relevant events. Alerts cover critical service failures and suspicious activity.
    12.5 Backup and Restoration
    Automated backups and a documented restoration process are required. Backups are protected from unauthorized access and deletion. Restoration testing verifies that assignments, accepted answers, assessment state, and results recover to the agreed recovery point.

---

13. Testing Strategy
    13.1 Test Levels
    Level Scope
    Unit Authentication and permission checks, timer calculations, state transitions, question validation, scoring, negative marking, auto-submission, duplicate prevention, coding result interpretation
    Integration Dashboard and candidate client to backend, backend to database, timing and submission, coding service, result generation, audit events, recovery after interruption
    System Complete candidate and administrator workflows from account creation through finalization and reporting
    Security Authentication and sessions, authorization bypass, API manipulation, sensitive data exposure, SQL injection, rate limiting, sandbox isolation, kiosk restrictions, audit integrity
    Performance Simultaneous logins, question delivery, concurrent submissions, mass timer expiry, concurrent coding submissions, final submission, result generation, report exports
    Recovery Application closure, lab computer restart, temporary network loss, backend restart, coding outage, database restoration, expired-session recovery, retry after an ambiguous submission response
    User acceptance The placement team verifies the recruitment workflow, assessment rules, and candidate experience against Section 15
    13.2 Sample Test Cases (new in v1.1)
    ID Scenario Steps Expected Result Requirement
    TC-01 Clock manipulation Start a question, move the lab computer's clock forward or back, then submit The server deadline is unchanged; acceptance depends only on server time FR-TIME-008
    TC-02 Skip a question by API Call the answers endpoint for a future question attempt Rejected with INVALID_STATE; no record created FR-ANS-001, BR-003
    TC-03 Late submission Wait past the deadline and submit Rejected with QUESTION_EXPIRED; attempt is Timed Out FR-TIME-004
    TC-04 Duplicate submit Send the same answer twice with one idempotency key One stored answer, one score; both calls return the same outcome FR-ANS-009, FR-TIME-009
    TC-05 Lost acknowledgement Drop the response, retry after reconnecting Original acknowledgement returned; no duplicate FR-ANS-007
    TC-06 Simultaneous deadlines Configure a question to end exactly at the overall deadline Session becomes Expired; overall deadline wins FR-TIME-007
    TC-07 Disconnect during question Cut the network for part of a question, reconnect Remaining time reflects the disconnected period; deadline not reset FR-TIME-010, BR-010
    TC-08 Cross-candidate access Candidate A requests Candidate B's session 403 FORBIDDEN; audit event recorded FR-UI-008, NFR-SEC-004
    TC-09 Answer-key exposure Inspect every candidate API response for a published MCQ No correct-answer field anywhere BR-009, FR-QB-004
    TC-10 Hidden test leak Submit failing code and inspect the response Only status and permitted output; no hidden input or expected output FR-CODE-009
    TC-11 Sandbox escape Run code that opens network sockets, reads environment variables, or forks repeatedly Blocked or terminated; no secret or network access FR-CODE-007, NFR-SEC-008
    TC-12 Infrastructure failure Stop the coding service during evaluation Status Internal Evaluation Error; candidate is not penalized FR-CODE-012
    TC-13 Negative marking Submit a wrong answer on a question with negative marks Score reduced by the configured value FR-SCORE-002
    TC-14 Score correction Correct a score as Super Admin Audit record holds original, revised, reason, time, admin FR-SCORE-010
    TC-15 Second session Log in on a second computer while a session is Active Start denied BR-007
    TC-16 Unsupported client Start with a retired client version UNSUPPORTED_CLIENT; start refused FR-LAB-004
    TC-17 Brute-force login Submit repeated wrong passwords Rate limiting or temporary lockout engages; events logged FR-AUTH-004
    TC-18 Kiosk escape Try Alt+Tab, Task Manager, and restart during an assessment Blocked by OS policy where configured; remaining paths documented and audited FR-LAB-005 to FR-LAB-008
    TC-19 Backup restore Restore the latest backup into staging Assignments, accepted answers, and results are recovered to the recovery point NFR-REL-006
    TC-20 Mass timer expiry Expire many question timers at the same moment under load All advance correctly within performance targets NFR-PERF-004

---

14. Risks, Dependencies, and Open Decisions
    14.1 Project Risks
    Risk Impact Mitigation
    Unsupported or unpatched Windows installation Higher security exposure Verify update coverage or upgrade
    Incomplete kiosk lockdown Candidates reach unapproved applications Test OS-level controls and escape paths
    Internet outage Assessment interruption Define recovery and incident policies
    Coding sandbox vulnerability Possible infrastructure compromise Isolated execution and security testing
    Poor timer implementation Unfair timing Enforce deadlines on the server
    Hidden test exposure Integrity compromise Keep test data in restricted evaluation services
    Incorrect score calculation Recruitment decisions affected Automated scoring tests and audited corrections
    Excessive cloud cost Budget overrun Load testing, resource limits, cost monitoring
    Insufficient test capacity Slow or unavailable assessments Set a concurrency target and load-test it
    Data exposure Privacy and reputational harm Least privilege, encryption, logging, retention controls
    14.2 Dependencies
    Approved cloud infrastructure; a supported backend runtime and relational database; a Windows desktop application framework; a secure coding execution solution; an approved kiosk configuration; valid TLS certificates; secure credential and secret management; institutional approval for candidate data handling; and defined assessment and marking policies.
    14.3 Open Decisions
    No. Decision Needed Before
    1 Expected maximum number of concurrent candidates Capacity sizing and load tests
    2 Cloud provider and hosting region Infrastructure setup
    3 Exact Windows editions and update status in the lab Client build and kiosk design
    4 Whether candidates may resume after a technical interruption Recovery policy
    5 Assessment and question-level time limits Content configuration
    6 Coding language versions and execution limits Sandbox build
    7 Candidate data and audit-log retention periods Production deployment
    8 Whether candidates can see results Results module
    9 Whether manual evaluation is needed in the first release Evaluator role scope
    10 Whether MFA and administrator network restrictions are mandatory Admin hardening
    11 Whether integration with existing placement or student systems is needed Scope confirmation
    12 Whether offline assessment is needed in a future release Architecture review
    These shall be documented and approved before production deployment.

---

15. Acceptance Criteria
    The system is production-ready only when the mandatory criteria below are met.
    15.1 Authentication and Candidate Management
    [ ] Only authorized administrators can create candidate accounts.
    [ ] Candidates can log in with provisioned credentials.
    [ ] Candidate accounts can be deactivated.
    [ ] Passwords are not stored in plaintext.
    [ ] Unauthorized users cannot reach administrative endpoints.
    [ ] Candidate information is protected from other candidates.
    15.2 Assessment Management
    [ ] The Super Admin can create and publish assessments.
    [ ] The Super Admin can create and manage question banks.
    [ ] Each question supports a configurable time limit.
    [ ] Assessments can be assigned to specific candidates.
    [ ] Configuration is versioned or otherwise protected against unintended changes to active attempts.
    15.3 Timing and Submission
    [ ] The server controls question deadlines.
    [ ] Changing the candidate computer's clock does not alter deadlines.
    [ ] In sequential mode the candidate cannot advance before submitting the current question.
    [ ] Expired questions reject late modifications.
    [ ] Automatic advancement follows policy.
    [ ] Overall deadlines are enforced when enabled.
    [ ] Duplicate submissions create no duplicate scores.
    [ ] Final submission prevents candidate edits.
    15.4 Coding and SQL
    [ ] Approved programming languages can be selected.
    [ ] Coding submissions execute in an isolated environment.
    [ ] Hidden test cases are not exposed.
    [ ] Time and memory limits are enforced.
    [ ] Compilation and runtime errors are reported appropriately.
    [ ] SQL assessments use an isolated environment.
    [ ] Infrastructure failures are distinguished from candidate errors.
    15.5 Security and Lockdown
    [ ] HTTPS is enforced for client-server communication.
    [ ] Backend authorization applies to protected APIs.
    [ ] No secrets are embedded in candidate-facing code.
    [ ] Kiosk configuration is tested on the actual lab hardware.
    [ ] OS escape paths are documented and tested.
    [ ] The application does not rely solely on full-screen mode.
    [ ] Security logs capture relevant administrative and assessment events.
    [ ] Critical security findings are resolved or formally accepted.
    15.6 Results and Reporting
    [ ] Objective answers are scored correctly.
    [ ] Negative marking follows configuration.
    [ ] Coding scores follow the approved test-case rules.
    [ ] Final results reflect the configuration used during the attempt.
    [ ] Authorized administrators can review and export results.
    [ ] Score corrections generate audit records.
    15.7 Reliability and Operations
    [ ] Accepted answers survive application restart or reconnection.
    [ ] Deadlines are not reset by disconnection.
    [ ] Backups restore successfully.
    [ ] Performance targets are verified at the approved concurrency level.
    [ ] Monitoring and incident-response procedures are operational.
    [ ] User, deployment, and maintenance documentation is complete.

---

16. Requirements Traceability Matrix
    16.1 By Requirement Area
    Requirement Area Requirement IDs Verification Method
    Authentication FR-AUTH-001 to FR-AUTH-010 Functional and security tests
    Candidate management FR-CAN-001 to FR-CAN-007 Functional tests
    Assessment management FR-ASMT-001 to FR-ASMT-008 Functional and integration tests
    Question bank FR-QB-001 to FR-QB-010 Functional tests
    Candidate interface FR-UI-001 to FR-UI-009 UI and workflow tests
    Timing FR-TIME-001 to FR-TIME-011 Timer and boundary tests
    Answer submission FR-ANS-001 to FR-ANS-009 Integration and recovery tests
    Coding assessment FR-CODE-001 to FR-CODE-014 Functional and sandbox security tests
    SQL assessment FR-SQL-001 to FR-SQL-005 Functional and isolation tests
    Evaluation FR-SCORE-001 to FR-SCORE-010 Scoring and regression tests
    Administration and reports FR-ADMIN-001 to FR-ADMIN-009 Functional and permission tests
    Lab client FR-LAB-001 to FR-LAB-008 Device and kiosk testing
    Audit logging FR-AUD-001 to FR-AUD-007 Audit and security tests
    Configuration FR-CONF-001 to FR-CONF-004 Functional and review
    Performance NFR-PERF-001 to NFR-PERF-005 Load testing
    Security NFR-SEC-001 to NFR-SEC-012 Security testing
    Reliability NFR-REL-001 to NFR-REL-006 Recovery and availability testing
    Usability NFR-USE-001 to NFR-USE-005 User acceptance testing
    Maintainability NFR-MNT-001 to NFR-MNT-005 Code and documentation review
    Scalability NFR-SCALE-001 to NFR-SCALE-003 Architecture review and load testing
    Privacy NFR-PRIV-001 to NFR-PRIV-004 Policy and access-control review
    Compatibility NFR-COMP-001 to NFR-COMP-003 Environment compatibility testing
    16.2 Use Cases to Requirements (new in v1.1)
    Use Case Main Requirements Test Cases
    UC-02 Provision candidate FR-AUTH-009, FR-CAN-001, FR-CAN-007 Functional
    UC-05 Publish assessment FR-ASMT-001 to FR-ASMT-008 Functional
    UC-08 Start assessment FR-UI-001, FR-UI-002, FR-ASMT-006, BR-007 TC-15, TC-16
    UC-09 Submit answer FR-ANS-001 to FR-ANS-009, FR-UI-004 TC-02, TC-04, TC-05
    UC-10 Timeout FR-TIME-004 to FR-TIME-007 TC-03, TC-06
    UC-11 Coding submission FR-CODE-001 to FR-CODE-014 TC-10, TC-11, TC-12
    UC-12 Recovery FR-TIME-010, BR-010, NFR-REL-004 TC-07, TC-19
    UC-14 Finalize results FR-SCORE-001 to FR-SCORE-009 TC-13
    UC-15 Score correction FR-SCORE-010, BR-012 TC-14

---

17. Recommended Implementation Plan
    Implement in controlled phases.
    Phase Focus Deliverables
1. Foundation Approvals, design, platform base Approved SRS; architecture and threat model; database schema; cloud environment; authentication and role-based authorization; Super Admin dashboard foundation
1. Candidate and assessment management Content and assignment Candidate account and profile management; question bank; assessment creation, assignment, scheduling, configuration, and versioning
1. Candidate desktop application Taking an assessment Windows client; candidate login; assigned assessment screen; sequential questions; server-controlled timer; Submit and Next; auto-submission; session recovery; application logging
1. Evaluation and reporting Results Objective evaluation; negative marking; result generation; candidate reports; statistics; exports; audit-log review
1. Coding and SQL Technical assessment Code editor; language support; isolated execution service; hidden test cases; resource limits; SQL sandbox; coding scoring; status reporting
1. Lockdown and hardening Security Managed Windows kiosk configuration; candidate account restrictions; device registration; escape-path testing; penetration testing; dependency scanning; security logging; incident procedures
1. Production readiness Go-live Load testing; backup and restore testing; monitoring and alerts; deployment documentation; administrator guide; candidate instructions; user acceptance testing; production approval

---

18. Final Deliverables
    No. Deliverable
    1 Software Requirements Specification
    2 System Architecture Document
    3 Database Design and ER Diagram
    4 API Specification
    5 Super Admin Web Dashboard
    6 Candidate Desktop Application
    7 Backend API and Assessment Services
    8 Coding Execution Service
    9 SQL Assessment Environment
    10 Audit and Reporting Module
    11 Windows Kiosk Deployment Configuration
    12 Automated Unit and Integration Tests
    13 Security and Performance Test Reports
    14 Deployment and Recovery Documentation
    15 Super Admin User Manual
    16 Candidate User Instructions
    17 Source Code and Build Instructions

---

19. Conclusion
    VeriSync is intended to be a secure, centralized, and extensible platform for technical placement recruitment. It combines administrator-controlled candidate management, configurable assessments, independent question timers, automatic submission, coding evaluation, reporting, and managed lab restrictions.
    The central principle is that the candidate application is never trusted to enforce critical assessment rules. The backend controls identity, authorization, deadlines, answer acceptance, evaluation, and results, and operating-system kiosk restrictions complement application controls.
    Production readiness is determined by verified acceptance criteria, security testing, performance testing, recovery testing, and formal stakeholder approval.

---

20. Approval and Sign-Off
    Approval confirms that the listed requirements form an agreed baseline for implementation. Subsequent changes shall be documented and reviewed.
    Role Name Signature
    Author 1 Kaushal Kumar Singh
    Author 2 Ashlin Siddharth
    Author 3 Vimal Raj
    **Faculty Coordinator ** Keren Lois Daniel
    Industry Expert Mr. Samba Kareti
    End of Document
