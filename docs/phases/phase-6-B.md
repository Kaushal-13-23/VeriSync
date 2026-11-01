# VeriSync Phase 6 Report: Developer B (Ashlin Siddharth)

**Role**: Frontend & Execution Lead (Developer B)  
**Branch**: `phase-6/B-Lockdown-and-security-hardening`  
**Owned Subsystems**: `apps/admin-web`, `services/code-runner`, `docs/`  
**Date**: November 1, 2026  
**Status**: Completed, 100% Quality Gates (Build, Lint, Typecheck, 81 Admin-Web Unit Tests, 16 Code-Runner Tests, 4 Playwright E2E Tests)

---

## 1. Executive Summary & What Was Built

In Phase 6, Developer B executed complete lockdown management and security hardening across `apps/admin-web` and `services/code-runner`, satisfying all requirements of **FR-LAB**, **NFR-SEC**, **NFR-USE**, and **SRS Section 10**:

1. **Lab Devices Registry & Management (`UC-17`, `FR-LAB-001..005`)**:
   - Built the centralized Lab Devices dashboard (`LabDevicesView.tsx`, `LabDevicesTable.tsx`) managing computer lab workstations by Machine Identifier, MAC address, IP range, Physical Location (Room/Seat), and current operational status.
   - **Workstation Registration Flow (`RegisterDeviceModal.tsx`)**: Input validation for hostname, MAC format (`XX:XX:XX:XX:XX:XX`), IPv4 address, and physical room/desk assignments.
   - **Status Overrides with Mandatory Justification (`DeviceStatusModal.tsx`, Rule 7, `BR-012`)**: State transitions (`ACTIVE`, `MAINTENANCE`, `DEACTIVATED`, `BLOCKED`) require explicit administrative reasons (min 5 characters) and issue warnings if an active examination session is attached.
   - **Approved Client Version Enforcement (`DeviceVersionModal.tsx`, `FR-CONF-001`, `FR-LAB-003`)**: Version management enforcing approved candidate client version (baseline `v1.4.0`); automatically flags outdated workstations with amber warning chips.
   - **Heartbeat & Telemetry Tracking (`FR-LAB-004`)**: Real-time display of last-seen UTC timestamp and active session binding.

2. **Integrity Events Telemetry Stream (`SRS 10.3 / Line 762`, `FR-LAB-006`, `BR-015`)**:
   - Implemented real-time security incident inspection panel (`IntegrityEventsPanel.tsx`) integrated in both `LiveSessionsView.tsx` (as a global telemetry feed) and `SessionDetailModal.tsx` (scoped to an individual candidate attempt).
   - Ingests lockdown violation events: `BLUR` (focus loss), `SHORTCUT_ATTEMPT` (WinKey, Alt+Tab, Ctrl+Alt+Del), `PROHIBITED_PROCESS` (Discord, Slack, IDEs), and `EXIT_ATTEMPT`.
   - Captures detailed telemetry: process executable name, active window title, pressed shortcut combinations, blur duration in milliseconds, and unique correlation ID (`Rule 9`).
   - **Non-Negotiable Evidentiary Notice (`SRS 10.3 / Line 762`, `BR-015`)**: Embedded prominent advisory banner:
     > *"A single integrity event is not conclusive proof of cheating. External system notifications, OS accessibility prompts, background driver dialogs, or inadvertent keystrokes can trigger security events. Proctors must evaluate cumulative timeline patterns, verify with physical room supervisors, and document mandatory reasons before taking disciplinary action."*

3. **MFA Enforcement & Security Settings (`FR-AUTH-007`, `FR-AUTH-008`, `NFR-SEC-004`)**:
   - **3-Step MFA Setup Wizard (`MfaSetupModal.tsx`)**: Step 1 displays TOTP QR code and manual base32 secret; Step 2 displays 8 emergency recovery backup codes with one-click copy, download file option, and required acknowledgment checkbox; Step 3 requires verification with a valid 6-digit TOTP code before activating MFA on the account.
   - **Inactivity Session Timeout (`useSessionTimeout.ts`, `SessionTimeoutModal.tsx`, `FR-AUTH-007`)**: Tracks user interaction (keydown, mousemove, mousedown, touch, scroll) with a 15-minute idle threshold. At 14 minutes of inactivity, displays a 60-second warning countdown modal with "Continue Session" (refreshes heartbeat) and "Log Out Now" actions.
   - **Security Policies & Hash-Chain Verification (`SecuritySettingsView.tsx`)**: Administrative controls for session timeout, password complexity, account lockout thresholds, and approved client versions. Includes interactive **Cryptographic SHA-256 Audit Hash Chain Verification** validating that tamper-evident audit pointers ($H_i = \text{SHA256}(H_{i-1} \parallel \text{Entry}_i)$) remain unbroken with 0 corrupted records.

4. **Accessibility Pass (`NFR-USE-005`)**:
   - Injected **"Skip to main content"** landmark link in `AppLayout.tsx` for screen-reader and keyboard users.
   - Full keyboard accessibility: every button, modal, form input, and table row has clear `:focus-visible` styling (`ring-2 ring-blue-500 ring-offset-2`).
   - WCAG AAA contrast ratios verified across all badges, status chips, and typography.
   - Accessible labels (`aria-label`, `aria-labelledby`, `role="alert"`, `role="dialog"`, `scope="col"`) added to all new and updated components.

5. **Pre-Release Penetration Testing Checklist (`docs/security/pentest-checklist.md`, `SRS 10.5`)**:
   - Authored formal penetration testing checklist covering all 11 security areas from SRS Section 10.5.
   - Executed dynamic security tests against `services/code-runner` (sandbox escape, fork bomb, memory bounds, network isolation) and `apps/admin-web` (IDOR, XSS, session hijack, hash-chain integrity).
   - Documented discovered remediations in owned folders and filed issues for external teams.

---

## 2. Endpoints, Screens, and Modules Added

| Layer | Subsystem / File | Description | Traceability |
| :--- | :--- | :--- | :--- |
| **Admin UI** | `src/components/devices/LabDevicesView.tsx` | Lab workstations overview page with KPI metrics, filters, and device roster | `UC-17`, `FR-LAB-001..004` |
| **Admin UI** | `src/components/devices/LabDevicesTable.tsx` | Data table of registered lab devices with status badges, version chips, and actions | `FR-LAB-001`, `FR-LAB-003` |
| **Admin UI** | `src/components/devices/RegisterDeviceModal.tsx` | Modal form to register new lab workstation with MAC, IP, room, and ID validation | `UC-17`, `FR-LAB-001` |
| **Admin UI** | `src/components/devices/DeviceStatusModal.tsx` | Modal to change device operational status with mandatory justification reason | `FR-LAB-002`, `BR-012`, `Rule 7` |
| **Admin UI** | `src/components/devices/DeviceVersionModal.tsx` | Modal to update approved client version on device with audited reason | `FR-CONF-001`, `FR-LAB-003` |
| **Admin UI** | `src/components/sessions/IntegrityEventsPanel.tsx` | Real-time lockdown telemetry stream with mandatory proctoring advisory notice | `SRS 10.3 / Line 762`, `FR-LAB-006` |
| **Admin UI** | `src/components/auth/MfaSetupModal.tsx` | 3-step MFA setup wizard (QR code, 8 emergency backup codes, 6-digit TOTP validation) | `FR-AUTH-008` |
| **Admin UI** | `src/components/settings/SecuritySettingsView.tsx` | Security policy configuration & cryptographic audit hash-chain verification tool | `NFR-SEC-004`, `FR-AUTH-007` |
| **Admin UI** | `src/components/common/SessionTimeoutModal.tsx` | 60-second inactivity warning countdown modal with extend / logout actions | `FR-AUTH-007`, `NFR-SEC-004` |
| **Admin UI** | `src/hooks/useSessionTimeout.ts` | Inactivity timer hook tracking user DOM events with configurable timeout | `FR-AUTH-007` |
| **API Client**| `src/api/devices.ts` | Typed API client for lab device CRUD, status overrides, and version management | `FR-LAB-001..004` |
| **API Client**| `src/api/security.ts` | Typed API client for security policies, MFA init/confirm, and audit chain verification | `FR-AUTH-008`, `NFR-SEC-004` |
| **MSW Mocks** | `src/mocks/handlers.ts` | Mock endpoints for `/admin/devices`, `/admin/security/*`, `/sessions/integrity-events` | `SRS 10.5` |
| **Doc** | `docs/security/pentest-checklist.md` | Formal security penetration test checklist and results covering SRS 10.5 | `SRS 10.5` |
| **E2E Tests** | `e2e/devices-and-mfa.spec.ts` | Playwright E2E suite covering device management, MFA setup, audit chain, and telemetry | `UC-17`, `FR-AUTH-008`, `SRS 10.3` |

---

## 3. Traceability Matrix

| Requirement ID | Module / File | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **`FR-LAB-001`** | `LabDevicesView.tsx`, `RegisterDeviceModal.tsx` | `LabDevices.test.tsx`, `devices-and-mfa.spec.ts` | **PASS** |
| **`FR-LAB-002`** | `DeviceStatusModal.tsx`, `devicesApi.updateDeviceStatus` | `LabDevices.test.tsx`, `devices-and-mfa.spec.ts` | **PASS** |
| **`FR-LAB-003`** | `LabDevicesTable.tsx`, `DeviceVersionModal.tsx` | `LabDevices.test.tsx`, `devices-and-mfa.spec.ts` | **PASS** |
| **`FR-LAB-004`** | `LabDevicesTable.tsx`, `LabDevicesView.tsx` | `LabDevices.test.tsx` | **PASS** |
| **`FR-LAB-005`** | `LabDevicesView.tsx`, `DeviceStatusModal.tsx` | `LabDevices.test.tsx` | **PASS** |
| **`FR-LAB-006`** | `IntegrityEventsPanel.tsx`, `sessionsApi.getIntegrityEvents` | `IntegrityEvents.test.tsx`, `devices-and-mfa.spec.ts` | **PASS** |
| **`SRS 10.3`** | `IntegrityEventsPanel.tsx` (Advisory Notice) | `IntegrityEvents.test.tsx`, `devices-and-mfa.spec.ts` | **PASS** |
| **`FR-AUTH-007`** | `useSessionTimeout.ts`, `SessionTimeoutModal.tsx` | `SecuritySettings.test.tsx` | **PASS** |
| **`FR-AUTH-008`** | `MfaSetupModal.tsx`, `securityApi.confirmMfaSetup` | `SecuritySettings.test.tsx`, `devices-and-mfa.spec.ts` | **PASS** |
| **`NFR-SEC-004`** | `SecuritySettingsView.tsx`, `securityApi.verifyAuditChain` | `SecuritySettings.test.tsx`, `devices-and-mfa.spec.ts` | **PASS** |
| **`NFR-USE-005`** | `AppLayout.tsx`, Focus Visible CSS, Contrast Ratios | Manual accessibility probe & automated component checks | **PASS** |
| **`SRS 10.5`** | `docs/security/pentest-checklist.md` | Full penetration checklist audit against code-runner & admin-web | **PASS** |
| **`BR-012` / `Rule 7`** | `DeviceStatusModal.tsx`, `DeviceVersionModal.tsx` | Mandatory reason validation test | **PASS** |
| **`Rule 8`** | `services/code-runner/` | `runner.test.ts` (16 passing container tests) | **PASS** |
| **`Rule 9`** | `LabDevicesTable.tsx`, `IntegrityEventsPanel.tsx` | ISO-8601 UTC timestamp format verification | **PASS** |

---

## 4. Test Evidence & Quality Gates

### 4.1 Unit & Integration Tests (Vitest)
- **`apps/admin-web`**:
  - `src/tests/LabDevices.test.tsx`: 6/6 passed (device rendering, registration, status change with mandatory reason, version check).
  - `src/tests/SecuritySettings.test.tsx`: 4/4 passed (security policies, MFA setup modal flow, session timeout modal, audit chain check).
  - `src/tests/IntegrityEvents.test.tsx`: 4/4 passed (telemetry table rendering, proctoring notice display, severity filter, session-scoped mode).
  - Total across all 21 test files: **81/81 passed** (100% green).
- **`services/code-runner`**:
  - `src/__tests__/runner.test.ts`: **16/16 passed** (Docker sandbox flags, process runner, security probes, resource bounds, SQL runner).

### 4.2 End-to-End Tests (Playwright)
- Total E2E tests: **4/4 passed** in `apps/admin-web`:
  1. `[UC-17, FR-LAB-001..004] manages lab workstations registry, registration, and status overrides` (4.6s) - **PASS**
  2. `[FR-AUTH-008, NFR-SEC-004] explores security settings, MFA setup flow, and cryptographic audit hash chain` (4.1s) - **PASS**
  3. `[FR-LAB-006, SRS 10.3] reviews live session integrity events with non-conclusive evidentiary advisory` (3.6s) - **PASS**
  4. `[FR-AUTH-001, FR-AUTH-008, FR-ADMIN-001] complete login with TOTP MFA and explore dashboard overview` (5.5s) - **PASS**

### 4.3 Static Code Analysis
- `tsc --noEmit` (`apps/admin-web`): **0 errors**.
- `eslint` (`apps/admin-web`): **0 errors, 0 warnings**.

---

## 5. What Is Still Mocked

- In `apps/admin-web`, MSW v2 mock handlers ([src/mocks/handlers.ts](file:///c:/VeriSync/VeriSync/apps/admin-web/src/mocks/handlers.ts)) mock backend REST endpoints:
  - `GET/POST /api/v1/admin/devices`, `PATCH /api/v1/admin/devices/:id/status`, and `PATCH /api/v1/admin/devices/:id/version` pending Dev A's PostgreSQL device tables migration.
  - `GET /api/v1/admin/sessions/integrity-events` and `POST /api/v1/candidate/lockdown-events` pending live websocket pub/sub ingestion from Dev C's candidate desktop lockdown runner.
  - `GET/PATCH /api/v1/admin/security/policies`, `POST /api/v1/admin/auth/mfa/setup-init`, `POST /api/v1/admin/auth/mfa/setup-confirm`, and `GET /api/v1/admin/security/verify-audit-chain` pending backend Redis rate-limiting and server-side TOTP validation engine.

---

## 6. Open Questions & Blockers for Other Developers

In accordance with VeriSync Working Rules, ambiguous or cross-boundary items are recorded here without guessing:

1. **Open Question (Dev A - API Team)**:
   - Does `/api/v1/admin/devices` require automatic WebSocket push notifications for device heartbeats in addition to HTTP polling, or is the current 30-second interval polling sufficient for lab management?
2. **External Issue Filed (Dev C - Desktop Team)**:
   - *Issue #SEC-02*: While `IntegrityEventsPanel` ingests and surfaces `BLUR` and `SHORTCUT_ATTEMPT` events, application-level Electron event listeners cannot intercept `Ctrl+Alt+Del` or `Win+L` in Windows without OS-level Assigned Access Kiosk configuration. Dev C must document lab machine group policy setup in `deploy/kiosk-setup.md`.
3. **External Issue Filed (Dev A - API Team)**:
   - *Issue #SEC-03*: Server-side database tables for audit records must include `previous_hash` and `record_hash` columns with a PostgreSQL constraint or trigger to preserve SHA-256 Merkle chain immutability durably before acknowledgement (`Rule 4`, `NFR-SEC-004`).

---

## 7. Exact Instructions to Run

### 7.1 Run Quality Gates & Unit Tests

```powershell
# From workspace root
pnpm.cmd --filter @verisync/admin-web typecheck
pnpm.cmd --filter @verisync/admin-web lint
pnpm.cmd --filter @verisync/admin-web test
pnpm.cmd --filter @verisync/code-runner test
```

### 7.2 Run Playwright E2E Security & Device Tests

```powershell
# From workspace root
pnpm.cmd --filter @verisync/admin-web test:e2e
```

### 7.3 Start Admin Web Portal Locally

```powershell
# Start Admin Web UI dev server (port 5173)
pnpm.cmd --filter @verisync/admin-web dev
```
Navigate to `http://localhost:5173` in a browser. Select the **Lab Devices** navigation tab to test workstation registration and status overrides, or navigate to **Live Sessions -> Integrity Events Stream** to review lockdown event telemetry.

