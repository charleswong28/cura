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
- Browser session persistence — Chrome profile on EBS (primary), S3 encrypted state (fallback)
- LinkedIn ban problem, IP strategy options, and final decision: recruiter home proxy (lightweight device)
- Compute cost model: shared EC2 stop/start (Phase 3, 2 recruiters) → ECS Fargate scale-to-zero (Phase 4, 30+ recruiters)
- Third-party proxy fallback when home network unavailable
- Swappable `BrowserBackend` interface — browser-use (default) vs page-agent (alternative), security analysis
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
| **No task, no action** | Runner exits cleanly if queue is empty — no browser session, no credential fetch |
| **No credential, no session** | Session open is blocked; task moves to `FAILED(NO_CREDENTIAL)` |
| **One site per session** | `allowed_domains` set at session creation; off-site navigation throws and fails the task |
| **Human approval required** | `PENDING_APPROVAL → READY` transition requires Approver-role JWT; no system path exists |
| **Roles never overlap** | Orchestrator token has no runner API access; runner token has no task-write access |
| **Session persists across spawns** | Browser state (cookies, localStorage) encrypted and stored in S3; next spawn resumes without re-login |

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

browser-use enforces site isolation via `allowed_domains` at session creation time. Subdomains of the declared key are included (e.g., `www.linkedin.com`, `mail.linkedin.com`). Any navigation attempt outside those domains raises `NavigationBlockedError`, which Talon treats as a task failure — the session is closed and the task is marked `FAILED(OFF_SITE_NAVIGATION)`.

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

## 5.2 Browser Session Persistence

### The problem

Talon is designed to be **ephemeral** — it spawns per task batch, runs, then exits. Without session persistence, every Talon spawn requires a full login to the target site. For LinkedIn this is actively harmful:

1. Frequent fresh logins are a strong automation signal — human users maintain long-lived sessions
2. Login may require 2FA, breaking the unattended flow
3. LinkedIn tracks session age as a trust indicator; a session that has existed for weeks looks like a human

The root goal is: **session continuity across Talon spawns, without keeping a long-lived process alive**.

### The solution: encrypted session state in S3

At the end of each Talon run, export the browser's storage state (cookies + localStorage — the minimal set needed to resume an authenticated session) and persist it encrypted to S3. On the next spawn, load and resume. Login is only required when the stored session has expired or been invalidated.

### Session lifecycle

```
Talon spawns for (tenantId, userId, siteKey)
  │
  ├── Fetch session key from vault (per-user, per-site encryption key)
  │
  ├── Check S3: s3://cura-talon/sessions/{tenantId}/{userId}/{siteKey}.enc
  │     │
  │     ├── Found → decrypt → load into browser context (storage_state)
  │     │     └── Health check: is session still active?
  │     │           ├── Healthy → skip login entirely, proceed to tasks
  │     │           └── Expired/invalid → full login, then continue
  │     │
  │     └── Not found → full login
  │
  ├── Execute approved tasks
  │
  ├── Export browser storage state (cookies, localStorage)
  │     └── Encrypt with session key → upload to S3 (overwrite previous)
  │
  └── Exit — credential reference and session key discarded from memory
```

### What is stored vs not stored

| Data | Storage | Rationale |
|------|---------|-----------|
| Browser storage state (cookies, localStorage) | S3 (encrypted) | The session resumption payload |
| Last-seen IP | S3 session metadata | IP change detection (see 5.3) |
| Estimated session expiry | S3 session metadata | Avoid unnecessary health-check round trips |
| Login credentials (username, password, 2FA secret) | Vault only | Never go near S3; only fetched on full login |
| Task payloads | CRM DB | Nothing task-related belongs in S3 |
| Audit events | Audit service | S3 is not an audit destination |

**Stored session state is a credential.** It grants access to the recruiter's authenticated site session. The encryption and access controls in Section 5.2.1 treat it as such.

**Why not the full Chrome profile directory in S3?** Chrome's `user_data_dir` contains SQLite databases (Cookies), LevelDB databases (Local Storage, IndexedDB), and lock files. These require a real POSIX filesystem with file locking — S3 object storage cannot serve as the backing store for concurrent database writes. `storage_state` (Playwright's JSON export of cookies + localStorage, ~50–100 KB) is the correct portable format for S3. It is everything needed to resume an authenticated session without the filesystem constraints.

### 5.2.1 Encryption design

Two independent encryption layers:

1. **Talon-side (AES-256-GCM):** Before upload, Talon encrypts the session state with a per-user, per-site key fetched from the vault. The plaintext never reaches S3. The vault key is never written to S3.
2. **AWS-side (SSE-KMS):** S3 bucket is configured with SSE-KMS. Even if someone bypasses the vault, they face a second encryption layer managed by AWS KMS.

Access controls:
- S3 bucket policy restricts `GetObject` / `PutObject` on `sessions/*` to Talon's IAM role only
- 14-day inactivity TTL via S3 lifecycle policy — stale states auto-delete
- Every S3 access logged to CloudTrail

**Security trade-off accepted:** Storing session state externally means a fully compromised AWS account could yield encrypted session blobs. This is accepted because: (a) the vault key is not in S3, so blobs without the vault are useless ciphertext; (b) a full AWS account compromise also gives access to the CRM database, vault, and all recruiter data — the session state is not the incremental risk. The threat model for Cura does not include complete AWS account compromise as a realistic attacker scenario for Phase 3.

---

## 5.3 The LinkedIn Ban Problem

LinkedIn is the hardest major platform to automate. It operates multiple independent detection layers — defeating one is not enough.

| Detection layer | What LinkedIn checks |
|----------------|---------------------|
| **ASN classification** | Whether the IP resolves to a datacenter (AWS, GCP, DigitalOcean etc.) — blocked at login before any session can start |
| **IP reputation** | Whether the IP appears in fraud/abuse databases — shared residential proxy pools degrade quickly |
| **Browser fingerprint** | TLS handshake, user-agent, canvas/font rendering — headless browsers are detectable |
| **Behavioural analysis** | Typing cadence, scroll patterns, inter-action timing — real-time ML micro-pattern analysis (expanded 2025–2026) |
| **Session geolocation** | Mid-session IP change invalidates the session immediately |

**Core constraint:** EC2 IPs are blocked at login — no cookie reuse or session persistence helps if the outbound IP is a datacenter ASN. The browser traffic must exit from a genuine residential IP.

### How we tackle it — options compared

| Approach | IP type | LinkedIn survival | Always-on | Cost | Verdict |
|----------|---------|-----------------|-----------|------|---------|
| **Recruiter's home proxy (lightweight device)** | Home residential | Highest — identical to manual use | Yes (device is always-on, not their laptop) | ~$0–5/mo proxy device + EC2 | ✅ **Phase 3 decision** |
| Dedicated residential/ISP IP (Webshare etc.) | Dedicated residential | ~90–95% | Yes | ~$1.50–5.50/IP/mo | ✅ Phase 4 when home unavailable |
| Shared residential proxy pool | Shared residential | ~50% | Yes | ~$50–100/mo | ❌ Too risky post-2025 detection |
| Mobile proxy (SOAX, Bright Data 4G/5G) | Mobile CGNAT | ~85% | Yes | ~$70–240/mo per recruiter | ❌ Expensive; overkill for Phase 3 |
| Bare EC2 IP | Datacenter | **Blocked at login** | Yes | Included | ❌ Never viable for LinkedIn |

**Decision:** A lightweight proxy device at the recruiter's home (behind their router) routes EC2 browser traffic out through their genuine residential IP. EC2 runs the heavy lifting 24/7; the recruiter's home network provides the trusted IP. We can productise the hardware as a separate sold device in a later phase.

---

## 5.4 Compute Model: Cost vs Scale

### The core constraint

EC2 instances cost money whether or not tasks are running. At 2 recruiters, LinkedIn outreach runs in short batches (the task queue triggers every 30 min per Section 5 of crm-technical-plan.md). Between batches, compute sits idle. At 30 recruiters, the pattern is the same but multiplied — peak demand is still burst, not continuous.

The right model: **start compute when tasks arrive, stop it when the queue drains.**

`storage_state` in S3 (Section 5.2) is what makes this possible — session state is portable across any compute. No EBS, no persistent disk needed. Any instance that spawns can load the session and pick up where the last one left off.

### Phase 3: Shared EC2 with queue-driven stop/start (2 recruiters at launch)

One shared EC2 instance serves all recruiters. It starts when the CRM task queue has work, runs the batch, then stops itself. Idle cost: near zero.

```
EventBridge rule (every 30 min)
  → Lambda: check CRM queue depth for READY tasks
      ├── Tasks present → start EC2 (ec2:StartInstances)
      └── No tasks → do nothing

EC2 starts → Talon runs → processes all READY tasks
  → queue drains → Talon calls ec2:StopInstances on itself → instance stops
```

**Why shared EC2 (not one per recruiter):** At 2–5 recruiters, tasks rarely overlap. A t3.medium (4 GB) handles one Chromium context comfortably; t3.large (8 GB) handles 2 concurrent. One instance is enough. Per-recruiter session isolation is handled by S3 keys, not by separate instances.

**AWS infrastructure (Phase 3):**

| Component | Service | Spec | Purpose |
|-----------|---------|------|---------|
| Talon process | EC2 | t3.medium → t3.large at 5+ recruiters | Runs browser-use + Playwright + Chromium |
| Session state | S3 | ~100 KB per recruiter | storage_state JSON, encrypted (Section 5.2) |
| Credential vault | Secrets Manager | — | LinkedIn credentials |
| Queue poller | EventBridge + Lambda | Every 30 min | Start EC2 when tasks present |
| IAM | Instance profile | `ec2:StopInstances` (self only), `s3:GetObject/PutObject` on sessions bucket, `secretsmanager:GetSecretValue` | Least privilege |

**Estimated cost (Phase 3, 2 recruiters):**
- EC2 t3.medium running ~2–3 hr/day (task batches) → ~$10–15/mo
- S3 session state → ~$0
- Lambda + EventBridge → ~$0 (well within free tier)
- EBS: none required (OS on root volume only)

### Phase 4: ECS Fargate, scale to zero (10–30 recruiters)

Above ~10 recruiters, the stop/start EC2 model adds friction — cold start latency grows, and managing instance state across many concurrent recruiters becomes messy. Switch to ECS Fargate: containers spin up per task batch and terminate when done. Zero idle cost. No EC2 instances to manage.

```
CRM task queue has READY tasks
  → EventBridge Pipe or Lambda → ECS RunTask (Fargate, spot)
      → Container starts (~30s cold start)
      → Talon loads storage_state from S3
      → Executes approved tasks
      → Exports storage_state to S3
      → Container exits → billing stops
```

**Fargate Chromium requirements:** `--no-sandbox` (rootless container), 2 vCPU / 4 GB task definition. No persistent disk — session state lives in S3.

**Estimated cost (Phase 4, 30 recruiters, 2 hr/day automation each):**
- 30 × 2 hr × $0.04/hr (Fargate spot) → ~$50/mo compute
- S3 session state → ~$0
- No idle cost

### Comparison

| | Phase 3: Shared EC2 stop/start | Phase 4: ECS Fargate |
|-|-------------------------------|---------------------|
| **Idle cost** | ~$0 (stopped) | $0 (no instances) |
| **Running cost** | ~$10–15/mo | ~$50/mo at 30 recruiters |
| **Cold start** | 30–60s EC2 start | ~30s container start |
| **Concurrency** | Sequential (one instance) | Parallel (one task per container) |
| **Operational complexity** | Low | Medium (ECS task definitions) |
| **When to switch** | — | At ~10 recruiters or concurrency needed |
| **Session storage** | S3 storage_state | S3 storage_state |

**No EBS in either model.** EBS is only relevant if fingerprint consistency becomes a problem (same browser fingerprint across runs). If LinkedIn starts flagging sessions, add an EBS volume to EC2 (Phase 3) or an EFS mount to Fargate (Phase 4) to persist a full Chrome `user_data_dir`. That is an upgrade path, not the default.

### Home proxy setup

Each recruiter installs a lightweight always-on device at home (Raspberry Pi, mini-PC, spare box) and runs a Tailscale exit node or WireGuard. The device stays on; the recruiter's laptop does not need to be running. EC2 or Fargate containers route all browser traffic through it at OS level — no proxy settings in the browser code.

**Option A — Tailscale exit node (recommended, 30 min setup):**

```bash
# On the home proxy device (one-time)
tailscale up --advertise-exit-node
# Approve in Tailscale admin console

# On EC2 / in Fargate container startup (via user-data or entrypoint)
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --exit-node=<home-device-tailscale-ip> --authkey=<tskey-...>
curl https://ipinfo.io/ip   # must return home ISP IP, not AWS
```

**Option B — WireGuard on home router (most robust, no device needed):**

Router stays on always. Supported by OpenWrt, Asus-Merlin, pfSense, OPNsense. EC2/container connects as a WireGuard peer.

**Per-recruiter IP isolation:** Each LinkedIn account must exit via its own home network. Never route multiple recruiter accounts through the same IP — LinkedIn correlates shared IPs across accounts.

## 5.5 Fallback: Third-Party Proxy (Home Network Unavailable)

When the recruiter's home network cannot act as exit proxy (recruiter moves, network unavailable, agency with many recruiters), a dedicated static residential IP is the fallback.

**Default choice: Webshare dedicated ISP/residential IP (~$1.47/IP/mo).** Dedicated means the IP is exclusively ours — no pool sharing, no degradation from other users.

```python
from browser_use import BrowserProfile, BrowserSession
from playwright.async_api import ProxySettings
import hashlib

def proxy_for_recruiter(recruiter_id: str, zone_password: str) -> ProxySettings:
    """Deterministic sticky session — same recruiter always gets same IP."""
    token = hashlib.sha256(recruiter_id.encode()).hexdigest()[:8]
    return ProxySettings(
        server="http://brd.superproxy.io:33335",
        username=f"brd-customer-C1234-zone-mobile_residential-session-rand{token}",
        password=zone_password,
    )

profile = BrowserProfile(
    user_data_dir=f"{PROFILE_DIR}/{tenant_id}/{user_id}",
    proxy=proxy_for_recruiter(recruiter_id, zone_password),
)
```

**Account → proxy mapping is permanent.** Never reassign a proxy IP to a different LinkedIn account — LinkedIn detects IP sharing across accounts. Store `proxy_endpoint` alongside the recruiter's account record.

| | Home proxy (default) | Dedicated third-party IP (fallback) |
|-|---------------------|-------------------------------------|
| **LinkedIn survival** | Highest (~100%) | ~90–95% |
| **Cost** | ~$0–5/mo device + EC2 | ~$1.47–10/mo per IP |
| **Operational effort** | One-time device setup | Config string per recruiter |
| **When to use** | Default | Home network unavailable |

---

## 6. Browser Execution Backend

Talon abstracts browser execution behind a `BrowserBackend` interface — the underlying library is swappable per site without changing task lifecycle, permission model, or A2A transport.

### 6.1 BrowserBackend interface

Four-method protocol: `open_session`, `health_check`, `execute_task`, `close_session`. All runner code goes through this interface — no direct browser API calls outside a backend implementation. Switching backends for a site is a one-line config change.

```json
{
  "site_backends": {
    "linkedin.com": "browser-use",
    "seek.com.au":  "browser-use"
  },
  "default_backend": "browser-use"
}
```

### 6.2 Backend comparison

| Aspect | browser-use (default) | page-agent (alternative, not for production) |
|--------|-----------------------|----------------------------------------------|
| **Architecture** | External Python process → CDP | In-page JavaScript injection |
| **LLM adapts to DOM changes** | Yes — no selector maintenance | Yes |
| **Origin** | Open-source, grpc (Austria) | Alibaba (China) |
| **Supply chain risk** | Low | High — in-page script with full DOM read access; malicious update could exfiltrate credentials |
| **Credential exposure** | No in-page access | Full in-page DOM, including cookies |
| **`allowed_domains` enforcement** | Native in session constructor | Must be re-enforced at Talon adapter level |
| **Production status** | Mature, widely used | Do not use as default; evaluate per-site with explicit security review |

**Default: `browser-use` for all sites.** `page-agent` is documented as a future option only; if ever adopted, pin to exact version and never use on login pages.

### 6.3 Determinism rules (apply to all backends)

**Rule 1 — Atomic tasks.** One task = one action. Sequences are multiple individually-approved tasks.

```
WRONG: "Find the best candidates and send them connection requests"
RIGHT: "Navigate to https://linkedin.com/in/johndoe and send a connection request
        with the note: 'Hi John, ...'. Stop after the request is sent."
```

**Rule 2 — Declared abort conditions.** Stop conditions are explicit in the task payload, not improvised.

```json
{
  "prompt": "Send a connection request to https://linkedin.com/in/johndoe...",
  "abort_conditions": ["already_connected", "pending_invitation_exists", "profile_not_found"]
}
```

**Rule 3 — Step verification.** After each declared step, check for expected DOM state. If not found, fail immediately — no retry loop.

**Rule 4 — No exploration.** Task prompts specify exact URLs, exact actions, exact stop conditions. Never open-ended language ("find", "explore", "check if").

---

## 7. No-Task, No-Error Guarantee

A runner with no approved tasks does nothing. When the A2A task queue returns empty for a given `siteKey`, Talon exits cleanly. No browser session is opened, no credential is fetched, no S3 session state is touched.

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

### 9.6 S3 encrypted session state for ephemeral process model

**Decision:** Browser session state (cookies + localStorage) encrypted and stored in S3, keyed by `{tenantId}/{userId}/{siteKey}`. Talon remains ephemeral — spawns per batch, exits after tasks complete.

**Rationale:**
- LinkedIn treats session continuity as a trust signal. A fresh login on every Talon spawn looks like automation — a session that has existed for weeks looks like a human.
- An always-on Talon process (the alternative that avoids S3) holds a live browser and LinkedIn session 24/7. A crash loses the session, leak detection is harder, and the process has a continuous attack surface.
- S3 is the natural fit for binary blob storage. Playwright's `context.storage_state()` and `storage_state` parameter provide the exact API needed for export/import with zero custom serialisation.

**Security trade-off accepted:** Stored session state is effectively a session credential. Mitigated by: Talon-side AES-256-GCM before upload (vault-derived key, never in S3); AWS SSE-KMS as a second layer; strict IAM (Talon's runtime role only); 14-day inactivity TTL. The threat of a compromised S3 bucket yielding usable session tokens is accepted — a full AWS compromise gives access to far more than session state.

| Option | Re-login frequency | Always-on process | Security exposure | Portability |
|--------|------------------|-------------------|-------------------|-------------|
| **S3 encrypted state (chosen)** | Only on expiry (~weeks) | No | Encrypted blobs; vault-gated key | High — any Talon instance |
| Persistent process | Never | Yes | Session in memory; crash = lost | Low — single machine |
| Local filesystem | Only on expiry | No | Unencrypted by default | Low — single machine |
| PostgreSQL binary column | Only on expiry | No | DB encryption | High |
| No persistence | Every spawn | No | None — no stored state | N/A |

**Why not PostgreSQL:** Binary session blobs (1–5 MB) are a poor fit for a relational DB row. S3 lifecycle policies, IAM, and SSE-KMS are the right controls for binary artifact storage.

**Why not always-on process:** Operational overhead disproportionate to the 30-min-per-session workload. Crash recovery complexity, no benefit over S3 persistence for session continuity.

---

### 9.7 One site per session (strict isolation)

**Decision:** `allowed_domains` set at browser session creation to exactly `[task.site_key]`.

**Rationale:**
- A task approved for LinkedIn must not be able to reach Gmail, a banking site, or any other authenticated context
- Cross-site navigation cannot happen accidentally (configuration error) or maliciously (prompt injection in task payload)
- Audit logs are meaningful: every entry maps to exactly one site

**Alternative rejected:** Allow-all navigation with post-hoc logging. Logged harm is still harm. An accidental Gmail interaction that sent an email is not recoverable by knowing it happened. Rejected.

---

### 9.8 Deployment model: EC2 + recruiter's home/work exit proxy (Phase 3)

**Decision:** Talon runs on an EC2 instance (t3.medium, self-hosted browser-use) with Chrome profiles on EBS, and all browser traffic routed through the recruiter's home or work network via Tailscale exit node or WireGuard on their home router.

**Rationale (research-backed):**

LinkedIn operates ASN-level IP classification directly in its authentication flow. Datacenter IP ranges are blocked at login. The recruiter's home/work IP — never shared, never abused, matching their account's registered country — has the lowest detection risk of all options. The cloud VM + home network exit proxy model achieves the best of both worlds:

1. **Cloud VM:** always on, no dependency on the recruiter's laptop being awake, reliable 24/7 operation
2. **Home network exit:** LinkedIn sees the recruiter's actual residential IP — identical to their manual use

Session state is stored as a Chrome profile directory on the VM's persistent disk — no S3 export/import cycle needed.

| Deployment | LinkedIn viable? | Why |
|------------|-----------------|-----|
| **EC2 + home/work exit proxy (Tailscale/WG)** | ✅ Yes — recommended | Real residential IP tunnelled through home; EC2 reliability; Chrome profile on EBS |
| Recruiter's own machine (fallback) | ✅ Yes | Real residential IP, same as manual use; machine must be awake |
| browser-use Cloud | ❌ No | Datacenter IPs blocked at LinkedIn login; 15-min session cap; custom proxy requires Enterprise |
| Cloud VM + Elastic IP | ❌ No | Datacenter ASN — blocked at LinkedIn login |
| Cloud VM + residential proxy | ⚠️ Risky | ~50% account survival; acceptable only for non-sensitive testing |
| Cloud VM + mobile proxy | ✅ Viable (Phase 4 fallback) | ~85% survival; adds $100–200/mo per recruiter + proxy management |

**Trade-offs accepted:**
- Recruiter's home network must be available (router on, internet connected) during task execution — reasonable assumption for Phase 3
- One-time Tailscale or WireGuard setup on the recruiter's home machine/router (~30 min)
- One home network = one LinkedIn account (IP isolation constraint)
- EC2 t3.medium + 100 GB EBS costs ~$30–35/mo per tenant

**Phase 4 trigger:** If home networks prove unavailable (recruiter travels, moves, ISP outage), switch that account to a dedicated third-party ISP IP (Webshare ~$1.47/IP) as fallback. This is an operational config change per recruiter, not a code change. See Section 5.5. AWS Site-to-Site VPN is not used — it costs ~$36/mo per VPN connection and requires Customer Gateway hardware at the recruiter's home.

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

Talon is a persistent Python service built on `a2a-sdk` + Starlette/uvicorn. The `a2a-sdk` `AgentExecutor` interface has two methods: `execute` (handle an incoming task) and `cancel` (handle a cancellation request). Talon's `execute` implementation does exactly eight things in order:

1. Extract `task_id`, `site_key`, and `payload` from the A2A message
2. DB check: reject with 403 if `task.status ≠ READY` (safety gate)
3. Claim: transition `READY → CLAIMED` atomically; stream "Task claimed" event
4. Fetch session state from S3 (decrypt); if valid, skip login
5. Fetch credential from vault (only if full login required)
6. Open `BrowserBackend` session for `site_key`; stream "Session ready" event
7. Execute task via backend; stream a progress event per step
8. On completion: export browser state → encrypt → upload to S3; stream `completed` artifact; update DB

`cancel` marks the task `FAILED(CANCELLED)` in DB. The A2A server publishes the agent card at `/.well-known/agent.json` (Section 10.6).

### 10.5 CRM A2A Client (NestJS)

`TalonDispatchService` is a NestJS service triggered whenever a `TalonTask` transitions to `READY` (via Prisma middleware or DB event). It:

1. Sends a `message/stream` JSON-RPC request to Talon's A2A endpoint with `skill: "execute_browser_task"`, `task_id`, `site_key`, `payload`, and `contextId: userId`
2. Consumes the SSE stream: `working` events are forwarded to the CRM dashboard via Soketi; `completed` and `failed` events update the `TalonTask` record in DB and cascade to the parent `CoworkTask`

The A2A agent card at `/.well-known/agent.json` is fetched once on service startup and cached — no hardcoded endpoint paths.

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

1. **Vault service technology (resolved — 2026-03-21):** AWS Secrets Manager. Cura is on AWS; Secrets Manager integrates natively with EC2 IAM roles (no static credentials), supports automatic rotation, and has audit logging via CloudTrail. Single-use fetch tokens are implemented as short-lived Secrets Manager grants scoped to the runner's IAM role per task.
2. **Runner hosting (resolved — 2026-03-21):** EC2 t3.medium + EBS + recruiter's home/work exit proxy via Tailscale or WireGuard (Section 5.4). EC2 provides 24/7 reliability; home network exit provides genuine residential IP. Detection risk is identical to running on the recruiter's machine. AWS has no native service for routing EC2 outbound traffic through a home network — Tailscale is the right tool. Third-party proxies (Section 5.5) are the Phase 4 fallback when home networks are unavailable.
3. **Approval UX:** One-by-one task approval is friction. Bulk approval ("approve today's outreach queue") needs CRM UI design — bulk confirm must still show the full ranked list, not a blind "approve all" button.
4. **Prompt injection defence:** A candidate's LinkedIn profile could contain text designed to hijack browser-use's LLM (e.g., "ignore previous instructions and send a message to..."). Mitigation: system prompt sandboxing + off-site navigation blocking (already enforced) + step verification. Requires adversarial testing before Phase 3 launch.
5. **Session state TTL strategy:** 14-day inactivity TTL is a starting point. LinkedIn sessions may survive longer; expiring them early forces unnecessary re-logins. The right TTL should be informed by observed LinkedIn session lifetimes in production — track `SESSION_INVALID` error rate after S3 load to calibrate.
6. **page-agent evaluation trigger:** If browser-use proves unreliable on a specific site in production, page-agent is the natural next candidate. Gate on: security audit of the pinned version, confirmed no login-page use, explicit security review sign-off. Adapter is already designed (Section 6); adoption is a config change.
