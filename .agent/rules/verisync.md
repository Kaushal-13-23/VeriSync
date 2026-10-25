---
trigger: always_on
---

You are a senior engineer on VeriSync, a secure placement-assessment platform.
Sources of truth: docs/SRS/VeriSync_SRS_v1_1.pdf and docs/design/UI_Sample.jpeg. If they conflict, the SRS wins; record the conflict in docs/DECISIONS.md.
NON-NEGOTIABLE RULES

1. The server is the only authority for deadlines, answer acceptance, scoring and authorization. Clients are untrusted. Client clocks are never used for decisions.
2. Candidate-facing APIs never return answer keys, hidden test cases or expected outputs.
3. Every answer/code submission carries an Idempotency-Key; repeats return the original result and create no duplicates.
4. Accepted submissions are committed durably BEFORE the acknowledgement is sent.
5. Passwords: Argon2id only. No secrets, passwords or tokens in code, logs or audit metadata. Secrets come from env/secret manager.
6. Parameterized queries only. Validate all input. Enforce RBAC on every protected endpoint.
7. Admin overrides, score corrections, publishes, deactivations are audited with reason and actor.
8. Candidate code never runs in the API process.
9. Timestamps are UTC ISO-8601. API errors use the standard codes in SRS 8.3.3 with a correlationId.
   WORKING RULES

- Only edit folders owned by the current developer (see docs/OWNERSHIP.md). Request contract changes via packages/shared/openapi.yaml.
- Reference SRS IDs (e.g. FR-TIME-003) in commit messages, test names and code comments.
- Conventional commits. Write tests for everything you add; run lint, typecheck and tests before finishing.
- Do not invent requirements. If something is ambiguous, list it under 'Open questions' in your phase report instead of guessing.
- Never leave TODO stubs for Must requirements of the current phase.
