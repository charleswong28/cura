# Talon — Project Management

> **Phase:** 3 (Sourcing Automation)
> **Last updated:** 2026-03-22
> **Tech design:** @docs/talon-technical-plan.md
> **Related:** @docs/crm-technical-plan.md §5 (task queue), docs/outreaching-technical-plan.md

---

## Summary

7 EPICs · 32 Stories · estimated 68 Tasks

| EPIC | Title | Stories | Status |
|------|-------|---------|--------|
| TA | Project Scaffold & Infra | 3 | In Progress |
| TB | A2A Server Core | 5 | Pending |
| TC | Browser Execution Backend | 5 | Pending |
| TD | Session Persistence | 5 | Pending |
| TE | Credential Vault Integration | 4 | Pending |
| TF | Proxy Management | 5 | Pending |
| TG | CRM Integration (NestJS side) | 5 | Pending |

---

## EPIC TA — Project Scaffold & Infra

Bootstrap the Talon Python service: directory layout, dependency management, Docker, CI.

### TA-001 — Python project scaffold

**As a** developer,
**I want** a working `pyproject.toml`-based Python project,
**so that** I can install dependencies and run Talon locally.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-001 | Create `python/apps/talon/` directory tree (`src/talon/`, `tests/`) | ✅ Done |
| TALON-002 | Write `pyproject.toml` (hatchling build, dependencies, dev extras) | ✅ Done |
| TALON-003 | Add `.env.example` with all required env vars | ⬜ Todo |
| TALON-004 | Confirm `pip install -e ".[dev]"` succeeds and tests pass | ⬜ Todo |

---

### TA-002 — Dockerfile and docker-compose integration

**As a** developer,
**I want** Talon to run via `docker compose up`,
**so that** local development matches production.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-005 | Write `Dockerfile.dev` (Python 3.12, Playwright deps, non-root user) | ✅ Done |
| TALON-006 | Add `talon` service to `infra/docker-compose.yml` | ✅ Done |
| TALON-007 | Add `TALON_*` env vars to `.env.example` at repo root | ⬜ Todo |
| TALON-008 | Confirm `docker compose up talon` starts without errors | ⬜ Todo |

---

### TA-003 — CI pipeline

**As a** developer,
**I want** linting and tests to run on every push,
**so that** regressions are caught early.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-009 | Add `ruff` lint + `mypy` typecheck to CI | ⬜ Todo |
| TALON-010 | Add `pytest` test run to CI | ⬜ Todo |
| TALON-011 | Add `playwright install --with-deps` step to CI | ⬜ Todo |

---

## EPIC TB — A2A Server Core

Implement the A2A server (`a2a-sdk` + Starlette/uvicorn) and the eight-step executor.

Reference: @docs/talon-technical-plan.md §10.

### TB-001 — Agent card and server bootstrap

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-012 | Implement `main.py` with `A2AStarletteApplication` and correct `AgentCard` | ✅ Done |
| TALON-013 | Confirm `GET /.well-known/agent.json` returns the agent card | ⬜ Todo |
| TALON-014 | Write integration test: POST `/a2a` with malformed message returns 400 | ⬜ Todo |

---

### TB-002 — Eight-step AgentExecutor

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-015 | Implement step 1–3: parse message, DB safety gate, claim task | ✅ Scaffold |
| TALON-016 | Implement step 4: S3 session download + decrypt (calls `persistence.py`) | ✅ Scaffold |
| TALON-017 | Implement step 5: credential fetch (calls `vault.py`) | ✅ Scaffold |
| TALON-018 | Implement login steps for `linkedin.com` using `BrowserUseBackend` | ⬜ Todo |
| TALON-019 | Implement `health_check` — site-specific session validation | ⬜ Todo |
| TALON-020 | Implement step 7: execute task + stream per-step SSE events | ✅ Scaffold |
| TALON-021 | Implement step 8: tar + upload profile, stream `completed` artifact | ✅ Scaffold |

---

### TB-003 — Cancel handler

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-022 | Implement `cancel()`: transitions task to `FAILED(CANCELLED)` in DB | ✅ Scaffold |

---

### TB-004 — Token authentication middleware

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-023 | Add Bearer token middleware — reject requests without valid runner token | ⬜ Todo |
| TALON-024 | Write test: unauthenticated request returns 401 | ⬜ Todo |

---

### TB-005 — Error handling and structured logging

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-025 | Add structured logging (JSON) with `task_id`, `site_key`, `step` fields | ⬜ Todo |
| TALON-026 | Add error handler that maps exceptions → `TalonErrorCode` | ⬜ Todo |

---

## EPIC TC — Browser Execution Backend

Implement the `BrowserBackend` interface and the `browser-use` backend.

Reference: @docs/talon-technical-plan.md §6.

### TC-001 — BrowserBackend interface

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-027 | Finalise `BrowserBackend` ABC (`open_session`, `health_check`, `execute_task`, `close_session`) | ✅ Done |
| TALON-028 | Implement backend config registry (JSON `site_backends` → backend class) | ⬜ Todo |

---

### TC-002 — browser-use backend

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-029 | Implement `BrowserUseBackend.open_session` with `allowed_domains` enforcement | ✅ Scaffold |
| TALON-030 | Implement `NavigationBlockedError` → `FAILED(OFF_SITE_NAVIGATION)` mapping | ⬜ Todo |
| TALON-031 | Implement `BrowserUseBackend.execute_task` with per-step streaming | ✅ Scaffold |
| TALON-032 | Implement abort condition detection (matches `abort_conditions` list) | ⬜ Todo |
| TALON-033 | Write unit test: off-site navigation raises `NavigationBlockedError` | ⬜ Todo |

---

### TC-003 — Determinism rules enforcement

Reference: @docs/talon-technical-plan.md §6 Determinism rules.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-034 | Enforce Rule 2: explicit `abort_conditions` list required in payload | ⬜ Todo |
| TALON-035 | Enforce Rule 3: step verification — fail immediately if DOM state not found | ⬜ Todo |

---

### TC-004 — LinkedIn login flow

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-036 | Implement LinkedIn username/password login via `browser-use` | ⬜ Todo |
| TALON-037 | Implement TOTP 2FA from `SiteCredential.totp_secret` | ⬜ Todo |
| TALON-038 | Write integration test with mocked LinkedIn login page | ⬜ Todo |

---

### TC-005 — Health check per site

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-039 | Implement `linkedin.com` health check (navigate to feed, expect auth state) | ⬜ Todo |

---

## EPIC TD — Session Persistence

Chrome profile tarball encrypted in S3.

Reference: @docs/talon-technical-plan.md §5.2.

### TD-001 — Encryption layer

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-040 | Implement AES-256-GCM encrypt/decrypt in `persistence.py` | ✅ Done |
| TALON-041 | Write unit tests for encrypt → decrypt round-trip | ⬜ Todo |

---

### TD-002 — S3 upload / download

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-042 | Implement `download_and_extract` with `NoSuchKey` → None path | ✅ Done |
| TALON-043 | Implement `tar_and_upload` with SSE-KMS | ✅ Done |
| TALON-044 | Write unit tests with mocked S3 (moto) | ⬜ Todo |

---

### TD-003 — Session key management

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-045 | Bootstrap: create session key in Secrets Manager on first run if absent | ⬜ Todo |
| TALON-046 | Document session key rotation procedure | ⬜ Todo |

---

### TD-004 — Corrupt / missing tarball recovery

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-047 | Detect corrupt tarball (bad decrypt / bad tar) → trigger full re-login | ⬜ Todo |

---

### TD-005 — 90-day TTL

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-048 | Add S3 lifecycle rule (Terraform/CDK) for 90-day inactivity expiry on `sessions/*` | ⬜ Todo |

---

## EPIC TE — Credential Vault Integration

Just-in-time, single-use credential fetch from Secrets Manager.

Reference: @docs/talon-technical-plan.md §5.

### TE-001 — Vault fetch

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-049 | Implement `fetch_credential` with structured logging (no values logged) | ✅ Done |
| TALON-050 | Implement `CredentialNotFoundError` → `FAILED(NO_CREDENTIAL)` path | ✅ Done |
| TALON-051 | Write unit tests with mocked Secrets Manager | ⬜ Todo |

---

### TE-002 — Credential discard

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-052 | Confirm credential reference is set to `None` in `finally` block after session close | ✅ Done |
| TALON-053 | Write test confirming credential is not accessible after `agent.execute()` completes | ⬜ Todo |

---

### TE-003 — TOTP support

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-054 | Implement TOTP code generation from `totp_secret` (pyotp) | ⬜ Todo |

---

### TE-004 — Credential rotation

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-055 | Document credential rotation procedure for recruiters | ⬜ Todo |

---

## EPIC TF — Proxy Management

Home proxy via Cura Proxy Agent (Tauri + frp), fallback to dedicated residential IP.

Reference: @docs/talon-technical-plan.md §5.3.

### TF-001 — Proxy config lookup

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-056 | Implement `_get_proxy(user_id)` — fetch from CRM proxy agent config | ⬜ Todo |
| TALON-057 | Fall back to `null` (no proxy) when agent is OFFLINE | ⬜ Todo |
| TALON-058 | Write unit test for proxy config lookup | ⬜ Todo |

---

### TF-002 — Fallback proxy

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-059 | Implement fallback: read `recruiter.proxy_endpoint` from CRM when home agent OFFLINE | ⬜ Todo |

---

### TF-003 — Cura Proxy Agent (Tauri desktop app)

> Phase 3 deliverable. macOS first; Windows/Ubuntu in Phase 4.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-060 | Bootstrap Tauri 2.0 project in `native/apps/cura-proxy-agent/` | ⬜ Todo |
| TALON-061 | Implement OAuth2 PKCE login flow (webview → CRM) | ⬜ Todo |
| TALON-062 | Bundle frpc binary; implement frpc subprocess management | ⬜ Todo |
| TALON-063 | Implement `POST /api/proxy-agents/register` call and port assignment | ⬜ Todo |
| TALON-064 | Implement 30s heartbeat to `PATCH /api/proxy-agents/{id}/heartbeat` | ⬜ Todo |
| TALON-065 | Install macOS LaunchAgent plist on onboarding | ⬜ Todo |

---

## EPIC TG — CRM Integration (NestJS)

`TalonDispatchService` in NestJS: A2A client, SSE forwarding, DB updates.

Reference: @docs/talon-technical-plan.md §10.5.

### TG-001 — TalonTask DB model

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-066 | Add `TalonTask`, `TalonCredential`, `TalonAuditLog`, `ProxyAgent` Prisma models | ⬜ Todo |
| TALON-067 | Write and run migration | ⬜ Todo |

---

### TG-002 — REST endpoints for runner

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-068 | `GET /talon/tasks/:id` — runner fetch (runner token scoped) | ⬜ Todo |
| TALON-069 | `PATCH /talon/tasks/:id/status` — runner status update | ⬜ Todo |

---

### TG-003 — Approval endpoints

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-070 | `POST /talon/tasks/:id/approve` — Approver role only | ⬜ Todo |
| TALON-071 | `POST /talon/tasks/:id/reject` — Approver role only | ⬜ Todo |

---

### TG-004 — TalonDispatchService

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-072 | Implement Prisma middleware trigger on `READY` transition | ⬜ Todo |
| TALON-073 | Implement A2A `message/stream` request to Talon server | ⬜ Todo |
| TALON-074 | Forward SSE `working` events to Soketi (CRM dashboard) | ⬜ Todo |
| TALON-075 | On `completed` / `failed`: update `TalonTask` + parent `CoworkTask` in DB | ⬜ Todo |

---

### TG-005 — Proxy agent API

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| TALON-076 | `POST /api/proxy-agents/register` — create agent, assign relay port | ⬜ Todo |
| TALON-077 | `PATCH /api/proxy-agents/:id/heartbeat` — update `lastSeenAt` | ⬜ Todo |
| TALON-078 | Background job: mark agents `OFFLINE` after 2-min heartbeat gap | ⬜ Todo |

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ Done | Implemented and passing |
| 🔨 In Progress | Currently being worked on |
| ⬜ Todo | Not started |
| 🚫 Blocked | Waiting on dependency |
