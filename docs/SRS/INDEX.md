# VeriSync SRS Section Index

This index maps every section and major subsection of the authoritative Software Requirements Specification in [`docs/SRS/srs.md`](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md) to its exact line range. Use this reference to read only the specific sections required for any task.

---

## Master Table of Contents & Line Ranges

| Section          | Title                                                                                               | Line Range    | Key Topics Covered                                                                                   |
| :--------------- | :-------------------------------------------------------------------------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------- |
| **Header**       | [Document Control & Conventions](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L1-L36)              | `1 - 36`      | Version history (v1.1), team roles, requirement priority conventions (Must/Should/Could)             |
| **Section 1**    | [1. Introduction](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L37-L132)                           | `37 - 132`    | Purpose, product overview, objectives, in-scope/out-of-scope boundaries, definitions                 |
| &bull; 1.1       | Purpose                                                                                             | `38 - 50`     | Stakeholder baseline, guidance for development & testing                                             |
| &bull; 1.2       | Project Overview                                                                                    | `51 - 57`     | Admin web, candidate desktop, cloud backend                                                          |
| &bull; 1.3       | Objectives                                                                                          | `58 - 71`     | Cheating prevention, timing authority, modular coding evaluation                                     |
| &bull; 1.4       | Scope                                                                                               | `72 - 102`    | In-scope (1.4.1, L73-89); Out-of-scope (1.4.2, L90-102: no live video, AI proctoring, or biometrics) |
| &bull; 1.5       | Intended Audience                                                                                   | `103 - 104`   | Developers, DBAs, testers, evaluators, placement coordinators                                        |
| &bull; 1.6       | Definitions and Abbreviations                                                                       | `105 - 132`   | Terminology table: SRS, RBAC, MFA, Kiosk Mode, Idempotency Key, Correlation ID, etc.                 |
| **Section 2**    | [2. Overall Description](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L133-L189)                   | `133 - 189`   | Product perspective, logical components, user classes, operating environment                         |
| &bull; 2.1       | Product Perspective                                                                                 | `134 - 136`   | Client-server architecture, untrusted candidate clients, isolated runner                             |
| &bull; 2.2       | Logical Components                                                                                  | `137 - 153`   | 15 logical modules & security boundaries                                                             |
| &bull; 2.3       | User Classes                                                                                        | `154 - 160`   | Super Admin, Candidate, Technical Evaluator, Lab Staff                                               |
| &bull; 2.4       | Operating Environment                                                                               | `161 - 189`   | Candidate lab PCs, Windows 10/11 constraints, cloud environment, assumptions                         |
| **Section 3**    | [3. System Models and Diagrams](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L190-L244)            | `190 - 244`   | Architecture model, per-question timing flow, session & attempt state machines                       |
| &bull; 3.1       | System Architecture                                                                                 | `192 - 201`   | Component responsibilities and trust boundaries                                                      |
| &bull; 3.2       | Per-Question Timing Flow                                                                            | `202 - 204`   | Authoritative deadlines, timeout handling, auto-advance                                              |
| &bull; 3.3       | Assessment Session States                                                                           | `205 - 214`   | State table: Not Started, Ready, Active, Interrupted, Submitted, Expired, Cancelled                  |
| &bull; 3.4       | Question Attempt States                                                                             | `215 - 224`   | State table: Pending, Active, Submitted, Timed Out, Skipped, Evaluation Pending, Evaluated           |
| &bull; 3.5       | Data Relationships                                                                                  | `225 - 244`   | Relational parent-child mappings across domain entities                                              |
| **Section 4**    | [4. Actors and Use Cases](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L245-L374)                  | `245 - 374`   | Actor catalog, complete use case table (UC-01 to UC-19), detailed specifications                     |
| &bull; 4.1       | Actors                                                                                              | `247 - 254`   | Human and system actors (Super Admin, Candidate, Evaluator, Lab Staff, Runner)                       |
| &bull; 4.2       | Use Case Catalog                                                                                    | `255 - 275`   | Summary catalog of UC-01 through UC-19 with primary actors and priority                              |
| &bull; 4.3       | Use Case Specifications                                                                             | `276 - 374`   | Detailed flows: UC-02, UC-05, UC-08, UC-09, UC-10, UC-11, UC-12, UC-14, UC-15                        |
| **Section 5**    | [5. Functional Requirements](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L375-L528)               | `375 - 528`   | Exhaustive requirements specification across 14 capability areas                                     |
| &bull; 5.1       | Authentication & Accounts                                                                           | `377 - 388`   | `FR-AUTH-001` to `FR-AUTH-010` (Argon2id, lockout, session tokens, device binding)                   |
| &bull; 5.2       | Candidate Management                                                                                | `389 - 397`   | `FR-CAN-001` to `FR-CAN-007` (Profiles, CSV import, test assignments, unique IDs)                    |
| &bull; 5.3       | Assessment Management                                                                               | `398 - 407`   | `FR-ASMT-001` to `FR-ASMT-008` (Assessment lifecycle, limits, attempt count, snapshots)              |
| &bull; 5.4       | Question Bank Management                                                                            | `408 - 419`   | `FR-QB-001` to `FR-QB-010` (Types, hidden cases, immutable versions)                                 |
| &bull; 5.5       | Candidate Assessment UI                                                                             | `420 - 430`   | `FR-UI-001` to `FR-UI-009` (Sequential question view, countdown timer, instructions)                 |
| &bull; 5.6       | Timing & Automatic Submission                                                                       | `431 - 444`   | `FR-TIME-001` to `FR-TIME-011` (Server clocks, expiry worker, disconnect policy)                     |
| &bull; 5.7       | Answer Submission & Storage                                                                         | `445 - 455`   | `FR-ANS-001` to `FR-ANS-009` (Durable commits, idempotency keys, autosave)                           |
| &bull; 5.8       | Coding Assessment Engine                                                                            | `456 - 471`   | `FR-CODE-001` to `FR-CODE-014` (Supported runtimes, sandbox isolation, scoring)                      |
| &bull; 5.9       | SQL Assessment                                                                                      | `472 - 478`   | `FR-SQL-001` to `FR-SQL-005` (Ephemeral database, read-only roles, result match)                     |
| &bull; 5.10      | Scoring & Evaluation                                                                                | `479 - 490`   | `FR-SCORE-001` to `FR-SCORE-010` (Auto-marking, negative marks, rubrics, corrections)                |
| &bull; 5.11      | Dashboard & Reporting                                                                               | `491 - 501`   | `FR-ADMIN-001` to `FR-ADMIN-009` (Live session monitor, reports, exports)                            |
| &bull; 5.12      | Lab Client & Kiosk                                                                                  | `502 - 511`   | `FR-LAB-001` to `FR-LAB-008` (Device registry, version rejection, OS lockdown)                       |
| &bull; 5.13      | Audit Logging                                                                                       | `512 - 520`   | `FR-AUD-001` to `FR-AUD-007` (Append-only storage, correlation IDs, no secrets)                      |
| &bull; 5.14      | System Configuration                                                                                | `521 - 528`   | `FR-CONF-001` to `FR-CONF-004` (Approved versions, runtime config, audit)                            |
| **Section 6**    | [6. Business Rules](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L529-L548)                        | `529 - 548`   | `BR-001` to `BR-015` (Server timing, sequential rules, single session, overrides)                    |
| **Section 7**    | [7. Non-Functional Requirements](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L549-L611)           | `549 - 611`   | Performance, security, reliability, availability, usability, compatibility                           |
| &bull; 7.1       | Performance                                                                                         | `550 - 556`   | `FR-PERF-001` to `005` (Response times, question delivery p95 < 300ms)                               |
| &bull; 7.2       | Security                                                                                            | `557 - 570`   | `FR-SEC-001` to `012` (TLS 1.3, Argon2id, RBAC, container isolation)                                 |
| &bull; 7.3       | Reliability & Availability                                                                          | `571 - 578`   | `FR-REL-001` to `006` (99.5% availability target, idempotency, backup)                               |
| &bull; 7.4       | Usability, Maintainability, Privacy                                                                 | `579 - 600`   | UI accessibility, structured logging, correlation IDs, privacy policies                              |
| &bull; 7.5       | Proposed Recovery Objectives                                                                        | `601 - 611`   | RPO <= 15 minutes, RTO <= 4 hours, backup procedures                                                 |
| **Section 8**    | [8. External Interface Requirements](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L612-L705)       | `612 - 705`   | UI designs, API endpoints list, sample JSON payloads, standard error codes                           |
| &bull; 8.1 - 8.2 | Web & Desktop Client Interfaces                                                                     | `613 - 616`   | Administrator browser UI and candidate desktop application rules                                     |
| &bull; 8.3       | Backend API Endpoints                                                                               | `617 - 639`   | Authoritative REST endpoint listing (Auth, Admin, Candidate)                                         |
| &bull; 8.3.1     | Illustrative Payloads                                                                               | `640 - 676`   | JSON schemas for login, current-question, submit-answer, late rejection                              |
| &bull; 8.3.2     | API Security Requirements                                                                           | `677 - 687`   | 10 API security principles (rate limits, input validation, correlation IDs)                          |
| &bull; 8.3.3     | Standard Error Codes                                                                                | `688 - 699`   | 10 standard API error codes (`UNAUTHENTICATED`, `QUESTION_EXPIRED`, etc.)                            |
| &bull; 8.4 - 8.5 | Database & Coding Interfaces                                                                        | `700 - 705`   | Least-privilege DB connection and internal coding runner protocol                                    |
| **Section 9**    | [9. Database Requirements & Data Model](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L706-L732)    | `706 - 732`   | Proposed relational tables (9.1), data integrity rules (9.2), retention (9.3)                        |
| **Section 10**   | [10. Security Architecture & Threat Model](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L733-L769) | `733 - 769`   | Threat model, mitigations table, client lockdown, sandbox escape defense                             |
| **Section 11**   | [11. Operational Workflows](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L770-L792)                | `770 - 792`   | Assessment lifecycle, timer expiry, network interruption recovery, staff roles                       |
| **Section 12**   | [12. Cloud Deployment & Infrastructure](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L793-L815)    | `793 - 815`   | Multi-tier cloud architecture, dev/staging/prod environments, CI/CD, backups                         |
| **Section 13**   | [13. Testing Strategy](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L816-L850)                     | `816 - 850`   | Testing levels (13.1) and sample test cases `TC-01` through `TC-20` (13.2)                           |
| **Section 14**   | [14. Risks, Dependencies, Open Decisions](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L851-L883)  | `851 - 883`   | Risk register (14.1), external dependencies (14.2), 12 open decisions (14.3)                         |
| **Section 15**   | [15. Acceptance Criteria](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L884-L941)                  | `884 - 941`   | Acceptance checklists across auth, assessments, timing, coding, security, results                    |
| **Section 16**   | [16. Requirements Traceability Matrix](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L942-L980)     | `942 - 980`   | Verification mapping by requirement area (16.1) and use cases (16.2)                                 |
| **Section 17**   | [17. Recommended Implementation Plan](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L981-L993)      | `981 - 993`   | Phased implementation roadmap (Phases 1 through 7)                                                   |
| **Section 18**   | [18. Final Deliverables](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L994-L1015)                  | `994 - 1015`  | Catalog of 17 planned software, documentation, and operational deliverables                          |
| **Section 19**   | [19. Conclusion](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L1016-L1022)                         | `1016 - 1022` | Core architectural principles, server authority, and production readiness                            |
| **Section 20**   | [20. Approval and Sign-Off](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L1023-L1032)              | `1023 - 1032` | Sign-off signatories (Kaushal, Ashlin, Vimal, Coordinator, Industry Expert)                          |

---

## Quick Reference: Core Tables & Lookups

- **State Machines**:
  - Assessment Session States: [Section 3.3 (Lines 205-214)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L205-L214)
  - Question Attempt States: [Section 3.4 (Lines 215-224)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L215-L224)
- **Use Case Catalog (`UC-01` to `UC-19`)**: [Section 4.2 (Lines 255-275)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L255-L275)
- **Functional Requirements (`FR-*`)**: [Section 5 (Lines 375-528)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L375-L528)
- **Business Rules (`BR-001` to `BR-015`)**: [Section 6 (Lines 529-548)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L529-L548)
- **API Payloads & Error Codes**: [Section 8.3 (Lines 617-699)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L617-L699)
- **Database Schema Proposed Tables**: [Section 9.1 (Lines 708-725)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L708-L725)
- **Test Cases (`TC-01` to `TC-20`)**: [Section 13.2 (Lines 826-850)](file:///d:/Veri_Sync/VeriSync/docs/SRS/srs.md#L826-L850)
