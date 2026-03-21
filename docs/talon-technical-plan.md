# Talon — Deterministic Browser Task Executor

> **Status:** Design
> **Phase:** 3 (Sourcing Automation)
> **Last updated:** 2026-03-21
> **Related:** @docs/crm-technical-plan.md Section 5 (task queue), docs/outreaching-technical-plan.md (LinkedIn strategy)

---

## What This Document Covers

- System purpose, naming rationale, and core invariants
- Permission model (Orchestrator / Approver / Runner separation)
- Task lifecycle and human approval gate
- Site isolation design
- Credential fetch-and-discard flow
- Swappable `BrowserBackend` interface — browser-use (default) vs page-agent (alternative), security analysis of each
- Determinism strategy (scoped task prompts, abort conditions, step verification)
- A2A integration design — Talon as A2A Server, CRM as A2A Client, SSE streaming, agent card
- Data model (TalonTask, TalonCredential, TalonAuditLog)
- Key design decisions with alternatives considered

## What This Document Does NOT Cover

- Which tasks to run on LinkedIn and why → see docs/outreaching-technical-plan.md
- Task queue scheduling and stale detection → see @docs/crm-technical-plan.md Section 5
- CRM match scoring and outreach prioritisation → see docs/outreaching-technical-plan.md Section 3

---

## 1. Name & Purpose

**Talon** is Cura's deterministic browser task executor. The name is a deliberate refinement of "claw" — a talon grips with precision and purpose. Unlike a blunt instrument, a talon acts exactly where directed and nowhere else.

Talon's job:
1. Fetch a credential for a specific site
2. Open a browser session scoped to that site only
3. Execute a pre-approved, human-reviewed task list
4. Report results back to the CRM
5. Discard the session and credential reference

That is the complete scope. Talon does not discover tasks, does not decide what to do next, does not open a session without a credential, and does not act outside an approved task manifest.

### Core Invariants

| Invariant | Enforcement |
|-----------|-------------|
| **No task, no action** | Runner process exits cleanly if task queue returns empty |
| **No credential, no session** | Session open is blocked; task moves to `FAILED(NO_CREDENTIAL)` |
| **One site per session** | `allowed_domains` set at browser session creation; off-site navigation throws |
| **Human approval required** | `PENDING_APPROVAL → READY` transition requires Approver-role JWT; no system path exists |
| **Roles never overlap** | Orchestrator token has no runner API access; runner token has no task-write access |

---

## 2. Permission Model

Three roles. Zero overlap. Enforced at the API gateway level — not by convention.

```
┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│    Orchestrator     │      │  Approver (human) │      │       Runner        │
│                     │      │                   │      │                     │
│  • Create tasks     │─────▶│  • Review tasks   │─────▶│  • Claim READY task │
│  • Assign tasks     │      │  • Approve/reject │      │  • Fetch credential │
│  • Monitor status   │      │                   │      │  • Open browser     │
│  • Read audit logs  │      │  (no API token —  │      │  • Execute steps    │
│                     │      │   UI action only) │      │  • Report result    │
│  ✗ Execute browser  │      │                   │      │                     │
│  ✗ Approve own tasks│      │  ✗ Create tasks   │      │  ✗ Create tasks     │
│  ✗ Access vault     │      │  ✗ Execute browser│      │  ✗ Modify tasks     │
└─────────────────────┘      └──────────────────┘      │  ✗ Approve tasks    │
                                                        │  ✗ Make decisions   │
                                                        └─────────────────────┘
```

### Why this separation matters

A compromised Runner can only execute tasks that a human has already approved. It cannot create new tasks to execute. It cannot approve tasks it finds in the queue. Its blast radius is bounded to already-approved work.

A compromised Orchestrator can create tasks but cannot execute them — they sit in `PENDING_APPROVAL` until a human reviews them. The human is the last gate before real-world browser actions.

### Token scopes

| Token | Allowed endpoints | Denied endpoints |
|-------|------------------|-----------------|
| `orchestrator` | `POST /tasks`, `GET /tasks/*`, `GET /sessions/*`, `GET /audit-logs/*` | `/runner/*`, `/credentials/*` |
| `runner` | `GET /tasks/next`, `POST /tasks/:id/claim`, `POST /tasks/:id/complete`, `POST /tasks/:id/fail`, `GET /credentials/fetch` (scoped, one-time) | `/tasks` (create), `/tasks/:id/approve`, `/audit-logs/*` |
| Approver | CRM UI only (no direct API token) | — |

---

## 3. Task Lifecycle

```
DRAFT
  │  Orchestrator creates task with payload + declared steps
  ▼
PENDING_APPROVAL
  │  Presented to human in CRM dashboard
  ├── (rejected) ──▶ REJECTED  [terminal]
  ▼
READY
  │  Approver confirms; task enters execution queue
  ▼
CLAIMED
  │  Runner atomically claims task (SELECT ... FOR UPDATE)
  ▼
IN_PROGRESS
  │  Browser session open; steps executing
  ├── (step fails, retryCount < maxRetries) ──▶ READY  [re-queued]
  ├── (step fails, retryCount >= maxRetries) ──▶ FAILED  [terminal]
  ▼
COMPLETED  [terminal]
```

### State transition rules

- Only the Approver endpoint can transition `PENDING_APPROVAL → READY`
- Only the Runner claim endpoint can transition `READY → CLAIMED`
- Transitions are enforced by DB-level check constraints — no application logic can skip them
- `REJECTED`, `COMPLETED`, and `FAILED` (at max retries) are terminal — no re-queue possible without a new human approval

---

## 4. Site Isolation

A Talon session is bound to exactly one `siteKey`. This is the domain of the target site (e.g., `linkedin.com`, `seek.com.au`).

### Why one site per session

If a session could navigate freely, a task approved for LinkedIn could — by accident or compromise — interact with a banking site, an email client, or any other authenticated service the recruiter has open. Site isolation makes the scope of each session auditable and bounded.

### Enforcement

```python
session = BrowserSession(
    allowed_domains=[task.site_key],  # e.g. ["linkedin.com"]
    # Subdomains included: www.linkedin.com, mail.linkedin.com
    # Cross-domain navigation raises NavigationBlockedError → task fails
)
```

Tasks with different `siteKey` values never share a session:

```
Task A: siteKey="linkedin.com"  ─┐
Task B: siteKey="linkedin.com"  ─┤── Session 1 (linkedin.com)
                                  │
Task C: siteKey="seek.com.au"  ──── Session 2 (seek.com.au)
```

Sessions for the same `siteKey` are run sequentially within a batch — never concurrently — to respect site rate limits and prevent double-login conflicts.

---

## 5. Credential Flow

Credentials are fetched **just-in-time** and never held in memory after the session closes.

```
Runner claims task for siteKey "linkedin.com"
  │
  ▼
Fetch credential
  GET /credentials/fetch?siteKey=linkedin.com&userId=...&taskId=...
  (short-lived, single-use token scoped to this taskId)
  │
  ├── Not found → abort → task: FAILED(NO_CREDENTIAL)
  ▼
Open browser session (allowed_domains=[siteKey])
  │
  ▼
Execute login steps (username, password, 2FA if present)
  │
  ├── Login fails → abort → task: FAILED(SESSION_INVALID)
  ▼
Health check: verify session is active
  │
  ├── Health check fails → abort → task: FAILED(SESSION_INVALID)
  ▼
Execute approved tasks (in order)
  │
  ▼
Close browser session
Credential reference discarded from runner memory
```

### Credential vault design

The vault is a separate service, not embedded in the runner or the CRM API.

- Credentials are stored AES-256-GCM encrypted at rest
- The runner receives a **single-use fetch token** per task — it can only retrieve the credential for the specific `siteKey` + `userId` combination, and only once
- The vault logs every fetch event (taskId, siteKey, timestamp) — no credential value is logged
- No runner can enumerate or list credentials

---

## 6. Browser Execution Backend

Talon abstracts the browser execution layer behind a `BrowserBackend` interface. This makes the underlying execution library swappable per site without changing Talon's task lifecycle, permission model, or determinism rules.

### 6.1 BrowserBackend interface

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class TaskResult:
    success: bool
    abort_condition_met: bool
    output: dict
    error: str | None

class BrowserBackend(ABC):
    @abstractmethod
    async def open_session(
        self,
        site_key: str,
        allowed_domains: list[str],
        credential: Credential,
    ) -> Session: ...

    @abstractmethod
    async def health_check(self, session: Session) -> bool: ...

    @abstractmethod
    async def execute_task(
        self,
        session: Session,
        task: TalonTask,
    ) -> TaskResult: ...

    @abstractmethod
    async def close_session(self, session: Session) -> None: ...
```

No code outside the backend implementations may call browser APIs directly. The runner speaks only to the interface.

### 6.2 Backend selection

Backends are configured per `siteKey` in Talon's runtime config. The default is `browser-use`.

```json
{
  "site_backends": {
    "linkedin.com": "browser-use",
    "seek.com.au":  "browser-use"
  },
  "default_backend": "browser-use"
}
```

Swapping a backend for a site requires a config change only — no task, runner, or API code changes.

### 6.3 backend: browser-use (default)

[browser-use](https://github.com/browser-use/browser-use) is a Python library that wraps Playwright with an LLM agent. It controls the browser via Chrome DevTools Protocol (CDP) from an external Python process.

```python
from browser_use import Agent, BrowserSession

class BrowserUseBackend(BrowserBackend):
    async def open_session(self, site_key, allowed_domains, credential):
        session = BrowserSession(
            allowed_domains=allowed_domains,   # site isolation enforced here
            headless=False,
            session_id=credential.session_id,  # resume existing session if alive
        )
        await session.start()
        return session

    async def execute_task(self, session, task):
        agent = Agent(
            task=task.payload.prompt,
            browser_session=session,
            max_steps=task.payload.max_steps,  # hard cap, default 10
        )
        result = await agent.run()
        return TaskResult(success=result.is_done, ...)
```

**Characteristics:**
- External process, Python — does not touch the page source
- Uses CDP (Chrome DevTools Protocol) — same mechanism as Playwright
- LLM adapts to DOM changes without code updates
- Does not require JavaScript injection into the target page

### 6.4 backend: page-agent (alternative)

[page-agent](https://github.com/alibaba/page-agent) by Alibaba is a JavaScript in-page DOM agent. Unlike browser-use, it lives **inside** the web page. It parses the DOM directly (no screenshots, no OCR, text-only) and executes actions through JavaScript. Its DOM processing components are derived from browser-use (MIT licence).

```typescript
// PageAgentBackend would inject the page-agent script into the loaded page
// and communicate via CDP's Runtime.evaluate to pass tasks and receive results

class PageAgentBackend(BrowserBackend):
    async def execute_task(self, session, task):
        result = await session.cdp.evaluate("""
            window.__talonAgent.run({
                prompt: {{ task.payload.prompt }},
                allowedDomains: {{ allowed_domains }},
                maxSteps: {{ task.payload.max_steps }}
            })
        """)
        return TaskResult(...)
```

**Characteristics:**
- In-page JavaScript injection — the agent runs as a script tag inside the target page
- DOM-native (no screenshots needed) — potentially faster and cheaper per step
- Multi-tab support via optional Chrome extension
- Derived from browser-use DOM components; conceptually compatible with Talon's determinism rules

#### Security assessment: page-agent

**Classified as: HIGH SUPPLY CHAIN RISK. Do not use as default.**

| Risk vector | Assessment |
|-------------|------------|
| **Origin** | Published by Alibaba Group (Chinese company). Enterprise data governance policies in many jurisdictions restrict Chinese-origin dependencies in production automation pipelines. |
| **In-page access** | The script runs inside the target page. It has full DOM read access — including visible form fields, session cookies stored in `document.cookie`, and any data rendered on screen. A compromised version could silently exfiltrate credentials or session tokens. |
| **Supply chain** | npm package updates are not cryptographically signed. A malicious minor-version update could add data exfiltration to the in-page script. |
| **Audit difficulty** | In-page JS execution is harder to observe and audit than an external Python process. Browser devtools are the only window into its behaviour. |
| **browser-use derivation** | The DOM processing layer is MIT-licensed and derived from browser-use — meaning a custom, audited fork is technically feasible. |

**If page-agent is ever adopted for a specific site:**
- Pin to an exact version (`page-agent@1.5.4`, not `^1.5.4`)
- Audit the full diff before any version upgrade
- Consider vendoring the source into the Cura repo rather than installing from npm
- Never use for sites where credentials are typed (login pages) — restrict to post-login, authenticated sessions only
- Treat the decision as a per-site opt-in requiring explicit security review

**Current recommendation:** `browser-use` is the default for all sites. `page-agent` is registered in this document as a known alternative for future evaluation, not for immediate use.

### 6.5 Backend comparison

| Aspect | browser-use (default) | page-agent (alternative) |
|--------|-----------------------|--------------------------|
| **Architecture** | External Python process → CDP | In-page JavaScript injection |
| **DOM access** | Via CDP (external) | Direct JS access to full DOM |
| **Screenshots needed** | Optional (LLM can use) | No — text-only DOM |
| **Selector rot** | Not a problem (LLM adapts) | Not a problem (LLM adapts) |
| **Maintenance burden** | Low | Low |
| **Origin** | Open-source, grpc (Austria) | Alibaba (China) |
| **Supply chain risk** | Low | High (see Section 6.4) |
| **Credential exposure** | No in-page access | Full in-page DOM read |
| **Auditability** | External process logs | CDP Runtime.evaluate — harder |
| **Production status** | Mature, widely used | Newer (March 2026) |
| **Swap effort** | — | Config change only (adapter ready) |

### 6.6 Determinism rules (apply to all backends)

The following four rules apply regardless of which backend executes a task.

**Rule 1 — Atomic tasks.** One task = one action. No multi-step chaining within a single task. Sequences are multiple tasks, each approved individually.

```
WRONG: "Find the best candidates and send them connection requests"
RIGHT: "Navigate to https://linkedin.com/in/johndoe and send a connection request
        with the note: 'Hi John, ...'. Stop after the request is sent."
```

**Rule 2 — Declared abort conditions.** The task payload includes explicit conditions under which to stop without error, rather than improvising.

```json
{
  "prompt": "Send a connection request to https://linkedin.com/in/johndoe...",
  "abort_conditions": [
    "already_connected",
    "pending_invitation_exists",
    "profile_not_found"
  ]
}
```

**Rule 3 — Step verification.** After each declared step, the runner checks for an expected DOM state (e.g., confirmation message). If not found, the task fails immediately — no improvisation or retry loop.

**Rule 4 — No exploration.** Task prompts never use open-ended language ("find", "explore", "check if"). They specify exact URLs, exact actions, and exact stop conditions.

---

## 7. No-Task, No-Error Guarantee

A runner with no approved tasks does nothing. This is the idle-safe property.

```python
task = await get_next_task(site_key="linkedin.com", runner_id=runner_id)

if task is None:
    log("No tasks available. Exiting cleanly.")
    return  # no browser session opened, no credentials fetched
```

The chain of consequences:

```
No READY tasks
  → No task claimed
    → No browser session opened
      → No credential fetched
        → No browser action taken
          → No external side effects
```

This is not a convention — it is the architecture. The runner cannot act without a task because every action is gated by a task claim.

---

## 8. Data Model

```prisma
model TalonTask {
  id              String          @id @default(ulid())
  tenantId        String
  userId          String          // which recruiter's session to use
  siteKey         String          // e.g. "linkedin.com"
  status          TalonTaskStatus
  payload         Json            // { prompt, max_steps, abort_conditions }
  approvedBy      String?         // userId of human approver
  approvedAt      DateTime?
  runnerId        String?
  sessionId       String?
  result          Json?
  errorCode       TalonErrorCode?
  errorMessage    String?
  retryCount      Int             @default(0)
  maxRetries      Int             @default(1)
  createdAt       DateTime        @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  parentTaskId    String?         // for task sequences
  coworkTaskId    String?         // link back to CRM CoworkTask

  @@index([tenantId, status, siteKey])
  @@index([tenantId, userId, status])
}

enum TalonTaskStatus {
  DRAFT
  PENDING_APPROVAL
  REJECTED
  READY
  CLAIMED
  IN_PROGRESS
  COMPLETED
  FAILED
}

enum TalonErrorCode {
  NO_CREDENTIAL
  SESSION_INVALID
  STEP_FAILED
  OFF_SITE_NAVIGATION
  TIMEOUT
  MAX_STEPS_EXCEEDED
  ABORT_CONDITION_MET   // expected stop, not an error
}

model TalonCredential {
  id               String   @id @default(ulid())
  tenantId         String
  userId           String
  siteKey          String
  encryptedPayload Json     // AES-256-GCM; decrypted by vault service only
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([tenantId, userId, siteKey])
}

model TalonAuditLog {
  id        String   @id @default(ulid())
  taskId    String
  tenantId  String
  runnerId  String
  event     TalonAuditEvent
  siteKey   String
  metadata  Json     // url, action_type — never PII values, always IDs
  timestamp DateTime @default(now())

  @@index([taskId])
  @@index([tenantId, timestamp])
}

enum TalonAuditEvent {
  CREDENTIAL_FETCH_REQUESTED
  CREDENTIAL_FETCH_DENIED
  SESSION_OPENED
  SESSION_CLOSED
  STEP_COMPLETED
  STEP_FAILED
  OFF_SITE_BLOCKED
  TASK_CLAIMED
  TASK_COMPLETED
  TASK_FAILED
}
```

---

## 9. Key Design Decisions

### 9.1 Name: Talon (not Claw, Operator, or Pilot)

**Decision:** Talon

**Rationale:**
- Preserves the intent of the original "claw" concept (direct, purposeful grip)
- Implies precision and control — a talon acts exactly where directed
- Memorable single word, no conflicts with existing tools in the ecosystem

**Alternatives considered:** Operator (too generic), Pilot (implies autonomy/navigation), Grip (too abstract), Warden (sounds defensive rather than active).

---

### 9.2 Swappable BrowserBackend with browser-use as default

**Decision:** `BrowserBackend` interface with `BrowserUseBackend` as default. Backends are swappable per `siteKey` via config.

**Rationale:**
- LinkedIn, Seek, and other target sites update their UI frequently — CSS selectors break silently; an LLM-driven backend avoids selector rot
- browser-use is mature, external-process architecture, low supply chain risk
- page-agent (Alibaba) is a credible alternative but carries high supply chain risk as an in-page JavaScript injection from a Chinese-origin dependency — see Section 6.4
- The adapter pattern means we can evaluate and adopt new backends (or swap away from a compromised one) without touching the task lifecycle, permission model, or API

**Trade-offs accepted:** browser-use's LLM core is non-deterministic by nature. Mitigated by scoped task prompts, abort conditions, and step verification (Section 6.6). The LLM executes within a bounded instruction set, not open-ended exploration.

**Alternatives rejected:**
- Raw Playwright with hardcoded selectors — high maintenance, requires code changes on every LinkedIn UI update. Rejected.
- page-agent as default — high supply chain risk (in-page JS, Alibaba origin). Available as opt-in per site after explicit security review. Not the default.

---

### 9.3 Human-only approval gate — no auto-approve path

**Decision:** `PENDING_APPROVAL → READY` requires a human Approver action. No system account holds the Approver role.

**Rationale:**
- Browser actions have external, irreversible effects: sent messages, connection requests, InMails
- Automated approval creates a path from task creation to execution with no human checkpoint
- One compromised Orchestrator + one auto-approve rule = unlimited unreviewed browser actions

**Alternative rejected:** Auto-approve low-risk read-only tasks (e.g., `SCAN_INBOX`). Even read-only tasks operate inside a recruiter's live authenticated session. Human oversight at this layer is the correct trade-off.

---

### 9.4 Orchestrator/Runner role separation enforced at API layer

**Decision:** Separate API tokens with disjoint permission sets. Enforced by API gateway — not application code.

**Rationale:**
- Application-level permission checks can be bypassed by bugs or misconfiguration
- API gateway enforcement means a runner token physically cannot reach task-create endpoints
- Limits blast radius: compromised runner ≠ compromised task queue

**Alternative rejected:** Single `automation` service account with full access. Too broad. Violates principle of least privilege. Rejected.

---

### 9.5 Credential vault as separate service

**Decision:** Credentials stored in a dedicated vault service, not in the CRM database.

**Rationale:**
- CRM database is multi-tenant; a tenant isolation bug would expose other tenants' credentials
- Vault has its own audit log, separate from the CRM audit trail
- Single-use fetch tokens mean a stolen token cannot be reused

**Alternative rejected:** Store encrypted credentials in the CRM's PostgreSQL database with Prisma encryption. Simpler to build, but the CRM DB is a higher-attack-surface target. Rejected.

---

### 9.6 One site per session (strict isolation)

**Decision:** `allowed_domains` set at browser session creation to exactly `[task.site_key]`.

**Rationale:**
- A task approved for LinkedIn must not be able to reach Gmail, a banking site, or any other authenticated context
- Cross-site navigation cannot happen accidentally (configuration error) or maliciously (prompt injection in task payload)
- Audit logs are meaningful: every entry maps to exactly one site

**Alternative rejected:** Allow-all navigation with post-hoc logging. Logged harm is still harm. An accidental Gmail interaction that sent an email is not recoverable by knowing it happened. Rejected.

---

## 10. A2A Integration — Cura Agent ↔ Talon

Talon is an **A2A Server**. The Cura CRM orchestrator is an **A2A Client**. When a `TalonTask` reaches `READY` status (after human approval), the CRM dispatches it to Talon via an A2A message. Talon streams execution progress back over SSE.

**Protocol note:** ACP (IBM Research) merged with Google's A2A under the Linux Foundation in September 2025. The canonical standard going forward is **A2A** (`a2a-protocol.org`). SDK: `a2a-sdk` on PyPI (Python), available for TypeScript too.

### 10.1 Why A2A over a custom REST transport

| Aspect | Custom REST polling (original) | A2A (adopted) |
|--------|-------------------------------|--------------|
| Task latency | Up to 30 min (poll interval) | Seconds (push on READY) |
| Progress visibility | Only on DB write at end | Real-time SSE stream |
| Agent discovery | Hardcoded config | Agent card at well-known URL |
| Interoperability | None — Cura-only | Any A2A client can orchestrate Talon |
| Protocol maintenance | Custom, Cura-owned | Linux Foundation standard |
| Future multi-runner | Manual coordination | A2A contextId handles routing |

A2A does not replace the DB task state machine — the DB remains the source of truth. A2A is the **live transport** on top of it: CRM pushes tasks in, Talon streams progress out, DB records everything.

### 10.2 What stays the same

**Nothing about the safety model changes.** A2A is a transport layer change, not a permission model change.

- Human approval gate: task must be `READY` in DB before CRM sends the A2A message
- Permission separation: CRM orchestrator token ≠ Talon runner token — unchanged
- Talon double-checks `status = READY` in DB at claim time, even if a message arrives early
- Credential fetch-and-discard: unchanged
- Site isolation via `allowed_domains`: unchanged
- `BrowserBackend` adapter: unchanged — A2A is above this layer

### 10.3 Message flow

```
CRM (NestJS — A2A Client)               Talon (Python — A2A Server)
  │                                              │
  │  TalonTask.status → READY (DB)              │
  │  TalonDispatchService triggered              │
  │                                              │
  │  POST /a2a  (tasks/sendSubscribe)            │
  │  {                                           │
  │    message: {                                │
  │      role: "user",                           │
  │      parts: [{ type: "data", data: {         │
  │        skill: "execute_browser_task",        │
  │        task_id: "<talon-task-ulid>",         │
  │        site_key: "linkedin.com",             │
  │        payload: { prompt, abort_conditions } │
  │      }}]                                     │
  │    },                                        │
  │    contextId: "<userId>"                     │
  │  }                                           │
  ├─────────────────────────────────────────────▶│
  │                                              │  Validate bearer token
  │                                              │  DB check: task.status === READY
  │                                              │  Claim: READY → CLAIMED (DB)
  │◀── SSE: status=working ──────────────────────┤
  │    "Task claimed. Fetching credential."      │
  │                                              │  Fetch credential (vault)
  │                                              │  Open BrowserBackend session
  │◀── SSE: status=working ──────────────────────┤
  │    "Browser session opened."                 │
  │                                              │  Execute step 1…
  │◀── SSE: status=working ──────────────────────┤
  │    { step: 1, description: "Navigated..." }  │
  │                                              │  Execute step 2…
  │◀── SSE: status=working ──────────────────────┤
  │    { step: 2, description: "Clicked..." }    │
  │                                              │  Close session, discard credential
  │◀── SSE: status=completed ────────────────────┤
  │    artifact: { result: { success: true } }   │
  │                                              │
  │  Update TalonTask → COMPLETED (DB)           │
  │  Update CoworkTask → COMPLETED (DB)          │
  │  Push live update → Soketi → CRM dashboard  │
```

### 10.4 Talon A2A Server (Python)

Talon is a persistent Python service using `a2a-sdk` and Starlette/uvicorn.

```python
# talon/agent_executor.py
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message
from a2a.types import DataPart

class TalonAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        params = self._extract_params(context.message)
        task_id = params["task_id"]
        site_key = params["site_key"]

        # Double-check READY state in DB (safety gate)
        if not await is_task_ready(task_id):
            raise PermissionError(f"Task {task_id} is not in READY state")

        # Claim in DB: READY → CLAIMED
        await claim_task(task_id)
        await event_queue.enqueue_event(
            new_agent_text_message("Task claimed. Fetching credential.")
        )

        # Credential fetch (abort if missing)
        credential = await fetch_credential(site_key, params["user_id"])
        if not credential:
            await fail_task(task_id, "NO_CREDENTIAL")
            raise ValueError("NO_CREDENTIAL: no credential for site")

        # Execute via BrowserBackend
        backend = BackendRegistry.get(site_key)
        async with backend.open_session(site_key, credential) as session:
            result = await backend.execute_task(
                session, params["payload"],
                on_step=lambda step: event_queue.enqueue_event(
                    new_agent_text_message(f"Step {step.index}: {step.description}")
                ),
            )

        # Complete in DB
        await complete_task(task_id, result)

        # Final artifact streamed to CRM
        await event_queue.enqueue_event(DataPart(data=result))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        task_id = self._extract_task_id(context)
        await fail_task(task_id, "CANCELLED")


# talon/server.py
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import (
    AgentCard, AgentSkill, AgentCapabilities, AgentAuthentication
)
import uvicorn

agent_card = AgentCard(
    name="talon",
    description=(
        "Deterministic browser task executor for Cura. Executes pre-approved "
        "browser tasks against specific sites. One site per session. "
        "Human approval is required before any task reaches this agent."
    ),
    url="https://talon.cura.internal",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=True, pushNotifications=False),
    authentication=AgentAuthentication(schemes=["Bearer"]),
    skills=[
        AgentSkill(
            id="execute_browser_task",
            name="Execute Browser Task",
            description=(
                "Execute a single pre-approved browser action on a specified site. "
                "The task must be in READY state in the Cura task database. "
                "Streams progress via SSE. Returns a result artifact on completion."
            ),
            tags=["browser", "automation", "recruitment", "linkedin"],
            inputModes=["application/json"],
            outputModes=["application/json"],
        )
    ],
)

handler = DefaultRequestHandler(
    agent_executor=TalonAgentExecutor(),
    task_store=InMemoryTaskStore(),   # A2A in-flight state; DB is source of truth
)

app = A2AStarletteApplication(agent_card=agent_card, http_handler=handler).build()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### 10.5 CRM A2A Client (NestJS)

The CRM dispatches tasks to Talon the moment they reach `READY`. A DB event hook or a Prisma middleware fires `TalonDispatchService`.

```typescript
// apps/api/src/talon/talon-dispatch.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SoketiService } from '../soketi/soketi.service';

@Injectable()
export class TalonDispatchService {
  private readonly talonUrl: string;
  private readonly talonToken: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly soketi: SoketiService,
  ) {
    this.talonUrl = this.config.getOrThrow('TALON_A2A_URL');
    this.talonToken = this.config.getOrThrow('TALON_BEARER_TOKEN');
  }

  async dispatch(talonTaskId: string): Promise<void> {
    const task = await this.prisma.talonTask.findFirstOrThrow({
      where: { id: talonTaskId, status: 'READY' },
    });

    // Discover Talon's agent card (cached after first fetch)
    const agentCardUrl = `${this.talonUrl}/.well-known/agent.json`;
    const response = await fetch(`${this.talonUrl}/a2a`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.talonToken}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'message/stream',
        params: {
          message: {
            role: 'user',
            parts: [{
              type: 'data',
              data: {
                skill: 'execute_browser_task',
                task_id: task.id,
                site_key: task.siteKey,
                payload: task.payload,
              },
            }],
          },
          contextId: task.userId,   // group recruiter's tasks in one A2A context
        },
      }),
    });

    // Consume SSE stream
    for await (const event of this.readSSE(response)) {
      await this.handleTalonEvent(task.id, event);
    }
  }

  private async handleTalonEvent(taskId: string, event: A2AStreamEvent) {
    if (event.status?.state === 'working') {
      // Push live progress to CRM dashboard via Soketi
      await this.soketi.publish(`talon.${taskId}`, 'progress', event.status.message);
    }

    if (event.status?.state === 'completed') {
      const result = event.artifact?.data ?? {};
      await this.prisma.talonTask.update({
        where: { id: taskId },
        data: { status: 'COMPLETED', result, completedAt: new Date() },
      });
      // Cascade to parent CoworkTask
      await this.completeCoworkTask(taskId, result);
    }

    if (event.status?.state === 'failed') {
      await this.prisma.talonTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: event.status.message,
          completedAt: new Date(),
        },
      });
    }
  }
}
```

### 10.6 A2A Agent Card (published at `/.well-known/agent.json`)

```json
{
  "name": "talon",
  "description": "Deterministic browser task executor for Cura. Executes pre-approved browser tasks against specific sites. One site per session. Human approval required before any task reaches this agent.",
  "url": "https://talon.cura.internal",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "authentication": {
    "schemes": ["Bearer"]
  },
  "skills": [
    {
      "id": "execute_browser_task",
      "name": "Execute Browser Task",
      "description": "Execute a single pre-approved browser action. task_id must be READY in the Cura DB. Streams step-level progress. Returns result artifact.",
      "tags": ["browser", "automation", "recruitment"],
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    }
  ]
}
```

### 10.7 Safety gate: A2A does not bypass human approval

A2A changes **when** tasks reach Talon (push vs poll) — it does not change **what** can reach Talon.

```
Orchestrator creates TalonTask           DRAFT
  │
Human reviews in CRM dashboard           PENDING_APPROVAL
  │ (approve)
CRM transitions task                     READY
  │
TalonDispatchService fires A2A message   → Talon
  │
Talon claims (DB check: must be READY)   CLAIMED
  │
Talon executes                           IN_PROGRESS → COMPLETED
```

If an A2A message arrives for a task not in `READY` state (e.g., still `PENDING_APPROVAL`, or already `COMPLETED`), Talon rejects it with a `403` before opening any browser session. The DB state machine is the authority — A2A is the delivery mechanism.

### 10.8 Decision: adopt A2A as the CRM↔Talon transport

**Decision:** A2A from the start. Custom REST polling removed.

**Rationale:**
- Push dispatch eliminates the 30-min polling delay — tasks start seconds after human approval
- Real-time SSE progress enables live CRM dashboard updates (via Soketi)
- A2A is the Linux Foundation standard; adopting it now prevents a migration later
- Agent card at `/.well-known/agent.json` means future agents (screening, scheduling) can discover and call Talon without configuration changes
- `a2a-sdk` is stable (v0.3, with 1.0 in active development) — safe to adopt

**Trade-offs accepted:**
- Talon becomes a persistent service rather than a cron job — requires process supervision (systemd, Docker, Kubernetes)
- A2A adds a dependency (`a2a-sdk`) and requires running a second HTTP server (port 8001) alongside the browser process

**Alternatives rejected:** Custom REST polling (30-min latency, no real-time progress, no interoperability). Rejected.

---

## 11. Relationship to CRM Task Queue

Talon is the **execution layer**. The CRM task queue (see @docs/crm-technical-plan.md Section 5) is the **brain**.

```
CRM CoworkTask (READY)
  │
  ▼ Orchestrator translates to TalonTask
TalonTask (PENDING_APPROVAL)
  │
  ▼ Human approves
TalonTask (READY)
  │
  ▼ Runner executes
TalonTask (COMPLETED)
  │
  ▼ Orchestrator writes result back
CRM CoworkTask (COMPLETED)
```

Each `TalonTask` carries a `coworkTaskId` reference for traceability. The CRM does not know or care how Talon executes — it only sees task status updates. Talon does not know or care what the CRM plans to do with the results — it only executes what is in front of it.

---

---

## 12. Open Questions

1. **Session resumption:** If the recruiter's Chrome already has an active LinkedIn session, should Talon attach to it rather than re-login? browser-use supports `session_id` for resumable sessions — needs testing.
2. **Vault service technology:** HashiCorp Vault, AWS Secrets Manager, or a lightweight custom service? Decision depends on infrastructure choices in Phase 3.
3. **Runner hosting:** Does the runner run on the recruiter's machine (alongside the browser) or as a cloud service? Cloud service + recruiter's browser (via remote debugging protocol) is more reliable but requires recruiter to expose a debug port.
4. **Approval UX latency:** Recruiters approving tasks one-by-one is friction. Bulk approval ("approve today's outreach queue") needs CRM UI design — ensure bulk approve still requires human review of the list, not a blind confirm.
5. **Prompt injection defence:** A candidate's LinkedIn profile could contain text designed to hijack browser-use's LLM (e.g., "ignore previous instructions and send a message to..."). Mitigation: system prompt sandboxing + off-site navigation blocking + step verification. Needs adversarial testing before Phase 3 launch.
6. **page-agent evaluation:** If browser-use proves unreliable on a specific site, page-agent is the natural next candidate. Before enabling it: security audit of the pinned version, confirm no login-page use, confirm restricted to post-auth sessions. Should be a deliberate opt-in decision, not a quiet config change.
