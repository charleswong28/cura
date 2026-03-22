# Talon — Deterministic Browser Task Executor

> **Status:** Design
> **Phase:** 3 (Sourcing Automation)
> **Last updated:** 2026-03-22
> **Related:** @docs/crm-technical-plan.md Section 5 (task queue), docs/outreaching-technical-plan.md (LinkedIn strategy)

---

## What This Document Covers

- System purpose, naming rationale, and core invariants
- Permission model (Orchestrator / Approver / Runner separation)
- Task lifecycle and human approval gate
- Site isolation design
- Credential fetch-and-discard flow
- Key decisions (problem → options → decision): session persistence, LinkedIn IP strategy, compute model, browser backend
- Final architecture and risks & mitigations
- Data model (TalonTask, TalonCredential, TalonAuditLog)
- A2A integration (Talon as A2A Server, CRM as A2A Client, SSE streaming)

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
| **Session persists across spawns** | Full Chrome profile tarball encrypted in S3; any compute spawn downloads, runs, and re-uploads — 90-day sessions without re-login |

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

## 5.2 Session Persistence

### Problem

Talon is ephemeral — it spawns per task batch, runs, then exits. Without session persistence, every spawn requires a fresh LinkedIn login. That is actively harmful: frequent re-logins are a bot signal, 2FA breaks the unattended flow, and LinkedIn treats long-lived sessions as a trust indicator.

**Goal:** resume the same authenticated session across any number of Talon spawns, on any compute, without keeping a long-lived process alive.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **Full Chrome profile tarball → S3** | 90-day sessions; consistent fingerprint (device IDs, canvas, IndexedDB); portable across any compute | ~50–200 MB per recruiter; ~5–15s download/upload per task batch |
| `storage_state` JSON → S3 | ~50 KB; instant transfer | New browser context each run — new fingerprint; LinkedIn may challenge sooner |
| EBS persistent disk | Fastest (no transfer); full fingerprint | Tied to one EC2 instance; prevents scale-to-zero; always-on cost |
| Always-on process | No transfer overhead | Memory leak risk; crash = lost session; continuous attack surface; always-on cost |

**Why not mount S3 directly as a filesystem?** Chrome writes SQLite and LevelDB files with POSIX file locks. s3fs-fuse is unreliable for database workloads. The correct pattern is copy-in / copy-out: download tarball to ephemeral local disk, run Chrome against it, upload updated tarball when done. Fargate ephemeral disk (20 GB default) is a real POSIX filesystem — Chrome runs against it with no issues.

### Decision

**Full Chrome profile tarball in S3.** At task start, download and extract to `/tmp/chrome/{userId}/`. At task end, tar and re-upload. Session key stored in Secrets Manager; profile encrypted with AES-256-GCM before upload (Section 5.2.1).

### Session lifecycle

```
Talon spawns for (tenantId, userId, siteKey)
  │
  ├── Fetch session key from Secrets Manager
  │
  ├── Check S3: s3://cura-talon/sessions/{tenantId}/{userId}/{siteKey}.tar.gz.enc
  │     ├── Found  → decrypt → extract to /tmp/chrome/{userId}/
  │     │            health check: is session still active?
  │     │              ├── Healthy  → skip login, proceed to tasks
  │     │              └── Expired  → full login, then continue
  │     └── Not found → full login (first run)
  │
  ├── Execute approved tasks  (Chrome reads/writes /tmp/chrome/{userId}/)
  │
  ├── Tar /tmp/chrome/{userId}/ → encrypt → upload to S3 (overwrite)
  │
  └── Exit — /tmp cleaned up; session key discarded from memory
```

### What is stored

| Data | Where | Why |
|------|-------|-----|
| Full Chrome profile (cookies, localStorage, IndexedDB, device IDs) | S3 encrypted tarball | 90-day session + fingerprint consistency |
| Login credentials (username, password, 2FA) | Secrets Manager only | Never touch S3 |
| Task payloads | CRM DB | Not session-related |

### 5.2.1 Encryption

Two layers:
1. **Talon-side AES-256-GCM** — per-user, per-site key from Secrets Manager. Plaintext never reaches S3.
2. **AWS SSE-KMS** — S3 bucket encrypted at rest. Second independent layer.

IAM: `s3:GetObject/PutObject` on `sessions/*` scoped to Talon's task role only. 90-day inactivity TTL via S3 lifecycle policy.

---

## 5.3 LinkedIn IP Strategy

### Problem

EC2 IPs are blocked at LinkedIn login — ASN-level classification rejects datacenter ranges before any session can start. Browser traffic must exit from a genuine residential IP.

LinkedIn runs multiple independent detection layers:

| Layer | What it checks |
|-------|---------------|
| ASN classification | Datacenter IP ranges — blocked at login |
| IP reputation | Fraud/abuse databases — shared pools degrade quickly |
| Browser fingerprint | Headless browser signals, TLS handshake |
| Behavioural analysis | Typing cadence, scroll timing, micro-patterns (ML, expanded 2025–2026) |
| Session geolocation | Mid-session IP change invalidates the session immediately |

### Options

| Option | IP type | LinkedIn survival | Cost | Verdict |
|--------|---------|-----------------|------|---------|
| **Recruiter home proxy (lightweight device)** | Home residential | ~100% — identical to manual use | ~$0–5/mo device | ✅ Default |
| Dedicated residential/ISP IP (Webshare) | Dedicated residential | ~90–95% | ~$1.50–5.50/IP/mo | ✅ Fallback |
| Shared residential proxy pool | Shared residential | ~50% | ~$50–100/mo | ❌ Too risky |
| Mobile proxy (SOAX, Bright Data 4G/5G) | Mobile CGNAT | ~85% | ~$70–240/mo | ❌ Expensive |
| Bare EC2 IP | Datacenter | Blocked at login | Included | ❌ Never viable |

### Decision

**Recruiter home proxy as default.** The recruiter installs a lightweight always-on device (Raspberry Pi, mini-PC) at home and runs a Tailscale exit node or WireGuard peer. All Talon browser traffic routes through it at OS level — no proxy config in the browser code. The recruiter's laptop does not need to be on.

**Dedicated third-party IP as fallback** (Section 5.5) when the home network is unavailable.

**Per-recruiter isolation:** Never route two LinkedIn accounts through the same IP. LinkedIn correlates shared IPs across accounts.

### Home proxy setup

**Option A — Tailscale exit node (recommended, ~30 min setup):**
```bash
# On the home device (one-time)
tailscale up --advertise-exit-node  # approve in Tailscale admin console

# On EC2 / Fargate container entrypoint (one-time or per-spawn)
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --exit-node=<home-device-ip> --authkey=<tskey-...>
curl https://ipinfo.io/ip   # must return home ISP IP
```

**Option B — WireGuard on home router (no device needed):**
Supported by OpenWrt, Asus-Merlin, pfSense, OPNsense. Router is always on; EC2/Fargate connects as a WireGuard peer. Requires router with WireGuard support.

---

## 5.4 Compute Model

### Problem

EC2 costs money whether or not tasks are running. LinkedIn outreach runs in short bursts (task queue triggers every 30 min). Between bursts, compute is idle. The compute model must:
- Cost near zero when idle
- Handle 2 recruiters at launch
- Scale to 30+ recruiters in 3 months without a rewrite

S3 profile storage (Section 5.2) makes compute fully stateless — any instance can pick up any recruiter's session.

### Options

| Option | Idle cost | Running cost | Concurrency | Complexity | Verdict |
|--------|-----------|-------------|-------------|------------|---------|
| **EC2 stop/start (EventBridge + Lambda)** | ~$0 (stopped) | ~$10–15/mo | Sequential | Low | ✅ Phase 3 |
| Always-on EC2 | ~$30–40/mo | Same | Sequential | Low | ❌ Wasteful at 2 recruiters |
| **ECS Fargate spot** | $0 | ~$50/mo at 30 recruiters | Parallel | Medium | ✅ Phase 4 |
| Lambda | $0 | Near $0 | Parallel | Medium | ❌ 15-min timeout too short for browser tasks |

### Decision

**Phase 3 (launch, 2–5 recruiters): Shared EC2, stop/start on queue depth.**
**Phase 4 (~10+ recruiters): ECS Fargate spot, scale to zero.**

No EBS. Session state lives in S3 — compute is fully swappable.

### Phase 3 architecture

```
EventBridge rule (every 30 min)
  → Lambda checks CRM queue for READY tasks
      ├── Tasks present → ec2:StartInstances
      └── No tasks     → do nothing

EC2 starts → Talon processes all READY tasks
  → queue drains → Talon calls ec2:StopInstances on itself → stopped
```

| Component | Service | Spec |
|-----------|---------|------|
| Talon process | EC2 | t3.medium (4 GB); t3.large (8 GB) at 5+ recruiters |
| Session profiles | S3 | ~50–200 MB per recruiter |
| Credentials | Secrets Manager | — |
| Queue poller | EventBridge + Lambda | Every 30 min |
| IAM | Instance profile | `ec2:StopInstances` self-only, `s3:GetObject/PutObject` sessions bucket, `secretsmanager:GetSecretValue` |

**Estimated cost (2 recruiters): ~$10–15/mo** (EC2 running ~2–3 hr/day; S3 and Lambda near $0).

### Phase 4 architecture

```
CRM READY tasks → EventBridge Pipe → ECS RunTask (Fargate spot)
  → Container starts (~30s)
  → Downloads Chrome profile tarball from S3 → /tmp
  → Executes tasks
  → Uploads updated tarball → S3
  → Container exits → billing stops
```

Fargate requirements: `--no-sandbox`, 2 vCPU / 4 GB task definition. 20 GB ephemeral disk (default) is sufficient for a 200 MB profile.

**Estimated cost (30 recruiters, 2 hr/day): ~$50/mo.** Zero idle cost.

**Switch trigger:** at ~10 recruiters, or when concurrent execution across recruiters is needed.

---

## 5.5 Fallback: Third-Party Proxy

### Problem

The home proxy requires the recruiter's home device to be on and connected. If the recruiter moves, travels, or the network is unavailable, there is no fallback without a pre-configured alternative IP.

### Options

| Option | LinkedIn survival | Cost | Notes |
|--------|-----------------|------|-------|
| **Dedicated static residential IP (Webshare)** | ~90–95% | ~$1.47–5.50/IP/mo | Exclusively ours; no pool sharing |
| Shared residential pool | ~50% | ~$50–100/mo | Degrades; multiple users share IPs |
| Mobile proxy (SOAX 4G/5G) | ~85% | ~$70–240/mo | Better survival but expensive at scale |

### Decision

**Dedicated Webshare residential IP per recruiter.** Exclusively assigned — no shared pool degradation. Account-to-IP mapping is permanent; never reassign an IP to a different LinkedIn account.

```python
profile = BrowserProfile(
    user_data_dir=f"/tmp/chrome/{user_id}",
    proxy=ProxySettings(server="http://<webshare-proxy>", username="...", password="..."),
)
```

Store `proxy_endpoint` on the recruiter's account record. This is an operational config change per recruiter — no code change.

---

## 6. Browser Execution Backend

### Problem

LinkedIn and other target sites update their UI frequently. Hardcoded CSS selectors break silently and require code changes on every update. The backend must handle UI changes without selector maintenance, while keeping the execution architecture secure and auditable.

### Options

| Option | Adapts to UI changes | Security risk | Maintenance | Verdict |
|--------|---------------------|---------------|-------------|---------|
| **browser-use (LLM + CDP, external process)** | Yes — LLM adapts | Low — no in-page access | Low | ✅ Default |
| Raw Playwright + selectors | No — breaks on UI update | Low | High — code changes per update | ❌ |
| page-agent (Alibaba, in-page JS injection) | Yes | **High** — in-page script reads full DOM including credentials; Chinese-origin dependency; unsigned npm updates | Low | ❌ Not for production |

**page-agent detail:** Runs inside the target page's JavaScript context. A malicious version update (npm packages are not cryptographically signed) could silently exfiltrate credentials or session tokens. Supply chain risk is unacceptable as a default.

### Decision

**browser-use for all sites.** External Python process controlling Chrome via CDP — never touches page internals. LLM adapts to DOM changes without selector maintenance.

`page-agent` is registered as a known future candidate only. If ever adopted for a specific site: pin to exact version, audit full diff before any upgrade, never use on login pages, require explicit security review.

### BrowserBackend interface

All runner code goes through a four-method interface: `open_session`, `health_check`, `execute_task`, `close_session`. Switching backends for a site is a one-line config change — no task lifecycle or permission model changes.

```json
{ "site_backends": { "linkedin.com": "browser-use" }, "default_backend": "browser-use" }
```

### Determinism rules (apply to all backends)

**Rule 1 — Atomic tasks.** One task = one action.
```
WRONG: "Find the best candidates and send them connection requests"
RIGHT: "Navigate to https://linkedin.com/in/johndoe and send a connection request
        with note: 'Hi John...'. Stop after the request is sent."
```

**Rule 2 — Declared abort conditions.** Stop conditions are explicit in the task payload.
```json
{ "abort_conditions": ["already_connected", "pending_invitation_exists", "profile_not_found"] }
```

**Rule 3 — Step verification.** After each declared step, check for expected DOM state. If not found, fail immediately — no retry loop.

**Rule 4 — No exploration.** Exact URLs, exact actions, exact stop conditions. Never open-ended language ("find", "explore", "check if").

---

## 7. Final Architecture

All decisions combined:

```
[AWS]
  EventBridge (every 30 min)
    → Lambda: queue depth check
        → EC2 start (Phase 3) / ECS RunTask (Phase 4)

  Talon container / EC2 instance
    ├── Downloads Chrome profile tarball from S3 → /tmp/chrome/{userId}/
    ├── Fetches credential from Secrets Manager (if login needed)
    ├── Runs browser-use + Playwright (Chromium)
    │     All traffic exits via recruiter's home proxy (Tailscale/WireGuard)
    ├── Executes approved tasks
    ├── Uploads updated Chrome profile tarball → S3
    └── Stops EC2 / exits container

  S3
    sessions/{tenantId}/{userId}/{siteKey}.tar.gz.enc  ← Chrome profiles

  Secrets Manager
    linkedin/{tenantId}/{userId}  ← credentials

[Recruiter's home network]
  Lightweight proxy device (Raspberry Pi / mini-PC)
    Tailscale exit node or WireGuard peer
    Always on, behind home router
    LinkedIn sees: recruiter's genuine residential IP
```

**Phase 3 (2–5 recruiters at launch):**
- 1 × shared EC2 t3.medium; starts on queue depth, stops when queue drains
- ~$10–15/mo total

**Phase 4 (~10+ recruiters):**
- ECS Fargate spot; one container per task batch; true scale-to-zero
- ~$50/mo at 30 recruiters

**Fallback (home network unavailable):**
- Dedicated Webshare residential IP per recruiter (~$1.47–5.50/IP/mo)

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **LinkedIn detects automation and bans recruiter account** | Medium | High — recruiter loses LinkedIn access | Home proxy provides genuine residential IP; full Chrome profile gives consistent fingerprint; behavioural limits (rate limits, human-like pacing) enforced by task queue |
| **Home proxy device goes offline** (power cut, ISP outage, recruiter unplugs) | Medium | Medium — tasks fail until device is back | Talon health-checks outbound IP before each task batch; alerts if IP is AWS range; falls back to third-party proxy (Section 5.5) on operator config change |
| **Chrome profile corrupted or lost** (Fargate task killed mid-upload) | Low | Medium — requires re-login + new session | S3 always holds last known-good profile; Talon detects a missing/corrupt tarball and triggers full re-login; new profile is uploaded at end of that run |
| **Secrets Manager credential fetch fails** (IAM misconfiguration, network issue) | Low | Medium — task fails, no browser action taken | Task moves to `FAILED(NO_CREDENTIAL)`; no session opened; operator notified via CRM alert |
| **Prompt injection in candidate profile** (LinkedIn page contains adversarial LLM instructions) | Low | High — unintended browser actions | System prompt sandboxing in browser-use; site isolation (`allowed_domains`) blocks off-site navigation; step verification catches unexpected DOM states; human approval gate means every task was reviewed |
| **Supply chain compromise of browser-use** | Very low | High | Pin to exact version in requirements.txt; automated Dependabot PRs reviewed before merge; external-process architecture limits blast radius (no in-page access) |
| **EC2 fails to stop itself** (Talon crash before StopInstances call) | Low | Low — EC2 runs until next check | Lambda poller re-checks queue every 30 min; if queue is empty and EC2 is running, Lambda stops it. Add separate watchdog Lambda on 5-min schedule as safety net |
| **Fargate task exceeds 20 GB ephemeral disk** | Very low | Low — task fails | Chrome profiles rarely exceed 500 MB; Fargate ephemeral can be expanded to 200 GB; alert on S3 tarball size > 1 GB |
| **LinkedIn session expires before 90 days** | Medium | Low — recruiter re-authenticates once | Health check at each spawn detects expired session; triggers full re-login automatically; 2FA handled via TOTP secret in Secrets Manager |
| **Two Talon tasks attempt to load same recruiter profile concurrently** | Very low | Medium — Chrome lock file conflict | Task queue enforces one `IN_PROGRESS` task per `userId` at a time (DB constraint) |

---


## 9. Data Model

```prisma
model TalonTask {
  id              String          @id @default(ulid())
  tenantId        String
  userId          String
  siteKey         String
  status          TalonTaskStatus
  payload         Json            // { prompt, max_steps, abort_conditions }
  approvedBy      String?
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
  coworkTaskId    String?

  @@index([tenantId, status, siteKey])
  @@index([tenantId, userId, status])
}

enum TalonTaskStatus { DRAFT PENDING_APPROVAL REJECTED READY CLAIMED IN_PROGRESS COMPLETED FAILED }

enum TalonErrorCode {
  NO_CREDENTIAL SESSION_INVALID STEP_FAILED OFF_SITE_NAVIGATION
  TIMEOUT MAX_STEPS_EXCEEDED ABORT_CONDITION_MET
}

model TalonCredential {
  id               String   @id @default(ulid())
  tenantId         String
  userId           String
  siteKey          String
  encryptedPayload Json     // AES-256-GCM; decrypted by Secrets Manager only
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([tenantId, userId, siteKey])
}

model TalonAuditLog {
  id        String          @id @default(ulid())
  taskId    String
  tenantId  String
  runnerId  String
  event     TalonAuditEvent
  siteKey   String
  metadata  Json            // url, action_type — never PII values
  timestamp DateTime        @default(now())

  @@index([taskId])
  @@index([tenantId, timestamp])
}

enum TalonAuditEvent {
  CREDENTIAL_FETCH_REQUESTED CREDENTIAL_FETCH_DENIED
  SESSION_OPENED SESSION_CLOSED
  STEP_COMPLETED STEP_FAILED OFF_SITE_BLOCKED
  TASK_CLAIMED TASK_COMPLETED TASK_FAILED
}
```

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

## 12. Open Questions

1. **Approval UX:** One-by-one task approval is friction. Bulk approval ("approve today's outreach queue") needs CRM UI design — bulk confirm must still show the full ranked list, not a blind "approve all" button.
2. **Prompt injection defence:** A candidate's LinkedIn profile could contain adversarial LLM instructions. Mitigation in Section 8 (risks). Requires adversarial testing before Phase 3 launch.
3. **Session TTL calibration:** 90-day S3 lifecycle TTL is a starting point. Calibrate against observed `SESSION_INVALID` error rate in production.
4. **page-agent evaluation trigger:** If browser-use proves unreliable on a specific site, page-agent is the next candidate — gate on security audit, no login-page use, explicit sign-off. Adapter is already in place (Section 6).
