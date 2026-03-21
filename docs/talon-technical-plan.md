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
- browser-use integration and determinism strategy
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

## 6. browser-use Integration

Talon uses [browser-use](https://github.com/browser-use/browser-use) as the browser execution layer.

### Why browser-use over raw Playwright

| Aspect | browser-use | Raw Playwright |
|--------|-------------|----------------|
| Handles dynamic UI | Yes — LLM adapts to DOM changes | No — CSS selectors break on UI updates |
| LinkedIn selector rot | Not a problem | High maintenance (LinkedIn updates weekly) |
| Maintenance burden | Low | High |
| Determinism | Controlled via scoped task prompts | Full (scripted steps) |
| Setup complexity | Low | Medium |

The trade-off: browser-use's LLM core is non-deterministic by nature. Section 6.2 explains how Talon makes it deterministic.

### 6.1 Session configuration

```python
from browser_use import Agent, BrowserSession

session = BrowserSession(
    allowed_domains=[task.site_key],   # site isolation enforced here
    headless=False,                    # recruiter's own Chrome, visible
    session_id=task.session_id,        # resumable if recruiter already logged in
)

agent = Agent(
    task=task.payload.prompt,          # exact, bounded instruction
    browser_session=session,
    max_steps=task.payload.max_steps,  # hard cap, default 10
)

result = await agent.run()
```

### 6.2 Determinism via scoped task prompts

browser-use is LLM-driven. Talon constrains it to deterministic behaviour through four rules:

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

### 9.2 browser-use over raw Playwright

**Decision:** browser-use as the execution layer

**Rationale:**
- LinkedIn, Seek, and other target sites update their UI frequently — CSS selectors break silently
- browser-use's LLM core handles DOM changes without code changes
- Reduces ongoing maintenance to zero for UI changes

**Trade-offs accepted:** Non-determinism risk is mitigated by scoped task prompts (Section 6.2). The LLM executes within a bounded instruction set, not open-ended exploration.

**Alternative rejected:** Raw Playwright with hardcoded selectors. High maintenance, requires engineering time every time a target site updates. Rejected.

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

## 10. Relationship to CRM Task Queue

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

## 11. Open Questions

1. **Session resumption:** If the recruiter's Chrome already has an active LinkedIn session, should Talon attach to it rather than re-login? browser-use supports `session_id` for resumable sessions — needs testing.
2. **Vault service technology:** HashiCorp Vault, AWS Secrets Manager, or a lightweight custom service? Decision depends on infrastructure choices in Phase 3.
3. **Runner hosting:** Does the runner run on the recruiter's machine (alongside the browser) or as a cloud service? Cloud service + recruiter's browser (via remote debugging protocol) is more reliable but requires recruiter to expose a debug port.
4. **Approval UX latency:** Recruiters approving tasks one-by-one is friction. Bulk approval ("approve today's outreach queue") needs CRM UI design — ensure bulk approve still requires human review of the list, not a blind confirm.
5. **Prompt injection defence:** A candidate's LinkedIn profile could contain text designed to hijack browser-use's LLM (e.g., "ignore previous instructions and send a message to..."). Mitigation: system prompt sandboxing + off-site navigation blocking + step verification. Needs adversarial testing before Phase 3 launch.
