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
- Browser session persistence — Chrome profile on VM disk (primary), S3 encrypted state (fallback), session lifecycle, IP consistency design
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

**Note:** When running on the recruiter's machine with Chrome profile mode (`user_data_dir`), S3 session storage is not required — the profile directory persists on disk naturally. S3 session persistence applies to the storage_state deployment path (see Section 5.3).

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

## 5.3 Deployment, IP Consistency, and LinkedIn Detection Risk

This section documents research findings (March 2026) on LinkedIn's bot detection capabilities and what they mean for Talon's deployment model. IP consistency is not a code problem — it is a deployment decision with direct consequences for recruiter account safety.

### LinkedIn's detection stack (2026)

LinkedIn has expanded bot detection significantly since 2024–2025. It now operates multiple independent layers:

| Detection layer | What it checks | Notes |
|----------------|---------------|-------|
| **ASN classification** | Whether the IP resolves to a datacenter AS number | AWS, GCP, DigitalOcean etc. are blocked *at login* — the auth flow never completes |
| **IP reputation scoring** | Whether the IP appears in fraud/abuse databases | Residential proxy IPs are increasingly flagged; shared proxy pool IPs degrade quickly |
| **Browser fingerprint** | TLS handshake, user-agent, extension presence, canvas/font rendering | Headless browsers and anti-detect browsers are detectable |
| **Behavioural analysis** | Typing cadence, scroll patterns, inter-action timing | A 2026 algorithm update added real-time ML analysis of micro-patterns |
| **Session geolocation** | Whether the session IP country matches the account's registered location | Mid-session IP rotation invalidates the session immediately |

**Key finding:** LinkedIn is the hardest major platform to automate. It blocks datacenter IPs directly in the auth flow — no amount of session persistence or cookie reuse helps if the IP originates from a cloud provider. Residential proxies have ~50% account survival rate (post-2025 detection expansion). Mobile proxies (4G/5G CGNAT) have ~85% survival rate. The recruiter's own IP — never shared, never abused, matching their account's registered country — has the lowest risk of all.

### Deployment options for Talon

| Deployment | IP type | LinkedIn survival | Session handling | Operational effort | Cost |
|------------|---------|------------------|------------------|-------------------|------|
| **EC2 + recruiter's home/work exit proxy** ✓ recommended | Home/office residential (tunnelled) | Highest — identical to manual use | Chrome profile on EBS | One-time Tailscale or WireGuard setup | ~$15–35/mo EC2+EBS + $0 proxy |
| Recruiter's own machine (Phase 3 fallback) | Home/office residential | Highest — identical to manual use | Chrome profile on machine | One-time Python + Playwright setup | ~$0 infra |
| Dedicated EC2 per recruiter + Elastic IP | Datacenter | **Blocked at login** — LinkedIn detects at ASN level | Chrome profile on EBS | Medium — one EC2 per recruiter | ~$20–50/mo per recruiter |
| EC2 + shared residential proxy | Shared residential | ~50% survival | Chrome profile on EBS | High — proxy management, IP rotation | ~$50–100/mo per recruiter |
| EC2 + mobile proxy (4G/5G) | Mobile CGNAT | ~85% survival | Chrome profile on EBS | High — mobile proxy subscriptions | ~$100–200/mo per recruiter |
| **browser-use Cloud** | Datacenter (likely) | **Blocked at login** | 15-min session cap; cloud profiles | None — managed service | Usage-based + blocked |

### Why browser-use Cloud is not viable for LinkedIn

browser-use Cloud was evaluated as a potential "run remotely without the recruiter's machine" option. Research findings:

- **IP type:** browser-use Cloud runs on its own infrastructure. The documentation describes "proprietary Chromium forks" optimised for stealth, but there is no mention of residential or mobile IPs. The service almost certainly uses datacenter IPs.
- **LinkedIn at datacenter IPs:** LinkedIn's authentication flow performs ASN-level IP classification and **blocks datacenter IP ranges at login**. A session cannot be established from a cloud provider's IP block regardless of browser stealth or cookie state.
- **Session cap:** Sessions are limited to 15 minutes. LinkedIn outreach batches regularly exceed this.
- **Browser profiles:** browser-use Cloud supports persistent browser profiles (cookies, localStorage) across sessions — a good design — but this is irrelevant if login cannot complete from a datacenter IP.
- **Verdict:** browser-use Cloud is suitable for general web automation but not for LinkedIn outreach from a recruiter account. Do not use.

### On the recruiter's machine: Chrome profile vs storage_state

When running on the recruiter's machine, there are two session strategies:

**Option A — storage_state (JSON file, S3-backed):** Talon exports Playwright's `context.storage_state()` at end of each run, encrypts, and stores in S3. On next spawn, loads the JSON and initialises the browser context with it. This is the S3 design from Section 5.2. Clean, portable, works the same way regardless of what Chrome version or profile is installed.

**Option B — Chrome profile directory (`user_data_dir`):** Talon points Playwright's `launchPersistentContext` at the recruiter's actual Chrome user data directory. The browser session shares the exact same profile as their manual LinkedIn use — same cookies, same extensions, same browsing history, same font and canvas fingerprint. This is the hardest-to-detect option but requires Chrome to not already be open on the same profile (process conflict).

| | storage_state (S3) | Chrome profile (`user_data_dir`) |
|--|-------------------|--------------------------------|
| **Detection risk** | Low — real cookies | Lowest — indistinguishable from manual use |
| **Fingerprint** | New browser instance | Same as recruiter's real Chrome |
| **Profile conflict** | None | Chrome must be closed |
| **Portability** | Any machine with vault access | Tied to this machine's Chrome install |
| **Recommended for** | Cloud deployment, session portability | Recruiter's primary machine |

**Recommended default:** Chrome profile (`user_data_dir`) on an EC2 instance with EBS volume, with Tailscale or WireGuard routing all browser traffic out through the recruiter's home/work network. If the home network is unavailable, fall back to a third-party mobile proxy (see Section 5.5).

### IP detection handling

Talon stores `last_ip` in session metadata. On each spawn, it compares current outbound IP to the stored value:
- **Match** → proceed normally
- **Mismatch** → run conservative health check; if LinkedIn shows a security prompt, discard state and trigger full re-login, updating `last_ip`

This is detection, not prevention. The real mitigation is deployment. IP consistency is a constraint, not something code can fix.

---

## 5.4 Deployment: EC2 + Home/Work Exit Proxy (Phase 3 Primary)

Talon runs as a persistent service on an EC2 instance. All browser traffic exits via the recruiter's home or work network. EC2 provides 24/7 reliability and persistent EBS storage; the recruiter's network provides the genuine residential IP that LinkedIn trusts — identical to their manual usage.

### AWS infrastructure

| Component | Service | Spec | Purpose |
|-----------|---------|------|---------|
| Talon process | EC2 | t3.medium (2 vCPU / 4 GB RAM) | Runs browser-use + Playwright + Chromium |
| Chrome profiles | EBS gp3 | 100 GB, attached to instance | Persistent Chrome user data directories |
| Credential vault | AWS Secrets Manager | — | Stores LinkedIn credentials; single-use fetch tokens |
| Session state fallback | S3 | — | Only if Talon ever runs without persistent EBS |
| Networking | Security Group | See below | Restrict inbound; allow Tailscale UDP outbound |

**EC2 instance sizing:** Chromium is memory-heavy. t3.medium (4 GB) handles one browser context comfortably. t3.large (8 GB) recommended if running concurrent contexts for multiple recruiters on one instance.

**Security Group rules:**

| Direction | Port / Protocol | Source / Destination | Purpose |
|-----------|----------------|----------------------|---------|
| Inbound | 8001 TCP | CRM API security group only | A2A task dispatch |
| Inbound | 22 TCP | Admin IP only | SSH access |
| Outbound | 41641 UDP | 0.0.0.0/0 | Tailscale relay (DERP fallback) |
| Outbound | 51820 UDP | 0.0.0.0/0 | WireGuard (if using Option B) |
| Outbound | All | 0.0.0.0/0 | Browser traffic (exits via home tunnel) |

### Architecture

```
[EC2 instance — always on]                    [Recruiter's home/work network]
  Talon (Python + browser-use)             ┌─ Option A: Tailscale exit node (laptop/NAS)
  Chrome profiles on EBS volume   ─────────┤─ Option B: WireGuard on router (always-on)
  All outbound traffic tunnelled           └─ Option C: SSH SOCKS5 (from laptop)

LinkedIn sees: recruiter's home/work IP (identical to their manual use)
```

**Why EC2 over ECS/Fargate/Lambda:**
- Chromium requires persistent disk for Chrome profiles (ECS Fargate has no persistent local disk)
- Talon is a long-running process (A2A server on port 8001) — Lambda's 15-min timeout is incompatible
- EC2 with EBS gives the same Chrome profile persistence as running on the recruiter's own machine

**Per-recruiter IP isolation:** Each LinkedIn account must exit via its own IP. Never tunnel multiple recruiter accounts through the same home network — LinkedIn correlates shared IPs across accounts. One home network = one recruiter account.

---

### Tunnel options: why AWS has no native equivalent

AWS does not have a managed service for routing EC2 outbound traffic through a specific home network. The two AWS-native VPN services go the **wrong direction** or are **too complex** for home use:

| Option | Direction | Cost | Verdict |
|--------|-----------|------|---------|
| **AWS Client VPN** | Client → AWS (wrong way) | ~$72/mo endpoint + $0.05/hr per connection | ❌ Routes recruiter's device into AWS, not EC2 traffic out through home |
| **AWS Site-to-Site VPN** | AWS VPC ↔ customer network | ~$36/mo per VPN connection | ❌ Requires static IP at home + Customer Gateway device; overkill for home setup |
| **Tailscale on EC2** | EC2 → home machine | Free (1 exit node) | ✅ Right tool — install on EC2 like any Linux machine |
| **WireGuard on EC2** | EC2 → home router | $0 | ✅ Right tool — config-only, no managed service needed |

**Decision: Tailscale is the right tool even on AWS.** It installs on EC2 in two commands and requires no AWS-specific configuration.

---

### Option A: Tailscale Exit Node (recommended — 30 min setup)

The recruiter's home machine (or any always-on device: NAS, Raspberry Pi, spare laptop) advertises itself as a Tailscale exit node. The EC2 instance routes all traffic through it.

**Home machine (one-time setup):**
```bash
# Install Tailscale, advertise as exit node
tailscale up --advertise-exit-node
# Approve in Tailscale admin console: app.tailscale.com → Machines → Edit route settings
```

**EC2 instance (one-time setup, via user-data or SSH):**
```bash
# Install Tailscale on Amazon Linux 2 / Ubuntu
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --exit-node=<home-machine-tailscale-ip> --authkey=<tskey-...>

# Verify exit IP matches recruiter's home ISP — must NOT be an AWS IP
curl https://ipinfo.io/ip
```

**browser-use config — no proxy settings required.** Tailscale handles OS-level routing. All browser traffic exits via home automatically.

```python
import os
PROFILE_DIR = os.getenv("CHROME_PROFILE_DIR", "/mnt/ebs/chrome-profiles")

profile = BrowserProfile(
    user_data_dir=f"{PROFILE_DIR}/{tenant_id}/{user_id}",
    # No proxy= — Tailscale exit node routes at OS level
)
session = BrowserSession(browser_profile=profile)
```

**Tailscale free tier:** supports 1 exit node — sufficient for Phase 3 (one recruiter per Tailscale account). Scale plan ($6/mo) adds multiple exit nodes.

**Limitation:** The exit-node machine must stay on and connected. Disable sleep/hibernate on the exit-node device, or use Option B (router-level WireGuard) for always-on reliability without keeping a laptop running.

---

### Option B: WireGuard on Home Router (most robust — always on)

WireGuard on the router survives laptop sleep/restart — the router is always on. Supported by OpenWrt, Asus-Merlin, pfSense, OPNsense, and most prosumer routers.

```
[EC2] --WireGuard peer (UDP 51820)--> [Home router] --> internet (home ISP IP)
```

**Router:** Enable WireGuard server in the router UI. Generate a peer config file for the EC2 instance.

**EC2 instance:**
```bash
apt install wireguard
# Paste peer config from router into /etc/wireguard/wg0.conf
# Add to /etc/systemd/system/wg0.service for auto-start
wg-quick up wg0
curl https://ipinfo.io/ip   # must return home ISP IP
```

**browser-use config — identical to Tailscale (no proxy settings).** WireGuard handles OS-level routing.

**When to use:** Recruiter has a compatible router and wants 24/7 reliability without any home machine staying on.

---

### Option C: SSH SOCKS5 (simple, less reliable)

```bash
# EC2 — create SOCKS5 proxy on localhost:1080 via home machine
autossh -N -D 1080 -M 0 user@home-ddns-hostname
```

```python
from playwright.async_api import ProxySettings
profile = BrowserProfile(
    user_data_dir=f"{PROFILE_DIR}/{tenant_id}/{user_id}",
    proxy=ProxySettings(server="socks5://localhost:1080"),
)
```

**Limitations:** SSH drops require autossh or systemd restart. Home IP must be port-forwarded. Less reliable than Tailscale or WireGuard.

---

### Chrome profile persistence on EBS

Chrome profiles are stored on the EBS volume mounted to the EC2 instance. The EBS volume persists independently of the EC2 instance lifecycle — profiles survive instance stops, restarts, and even instance replacement (detach + reattach EBS to new instance).

```
/mnt/ebs/chrome-profiles/
  {tenantId}/
    {userId}/            ← one directory per recruiter
      Default/
        Cookies
        Local Storage/
        ...
```

```python
import os
PROFILE_DIR = os.getenv("CHROME_PROFILE_DIR", "/mnt/ebs/chrome-profiles")

profile = BrowserProfile(
    user_data_dir=f"{PROFILE_DIR}/{tenant_id}/{user_id}",
)
```

**EBS mount (fstab entry for auto-mount on instance restart):**
```
/dev/nvme1n1  /mnt/ebs  ext4  defaults,nofail  0  2
```

**S3 session state (Section 5.2) is not required for this deployment model.** S3 is retained as a fallback for ephemeral deployments without EBS. For EC2 + EBS, the EBS volume is the session store.

**Profile conflict:** Chrome's lock file prevents two processes opening the same profile simultaneously. Talon must run tasks for a given recruiter sequentially — already enforced by the task queue design (one `IN_PROGRESS` task per `userId` at a time).

| | Chrome profile on EBS (Tailscale/WG) | S3 storage_state | Chrome profile on recruiter's machine |
|-|------------------------------------|-----------------|--------------------------------------|
| **Detection risk** | Lowest — persisted fingerprint | Low — real cookies | Lowest — indistinguishable from manual |
| **Always-on** | Yes | Yes | No — machine must be awake |
| **Session continuity** | EBS persists independently of EC2 | Export/import per run | Profile survives restart |
| **Instance replacement** | Detach + reattach EBS | No change | N/A |
| **Recommended for** | Phase 3 primary | Ephemeral containers | Phase 3 fallback |


## 5.5 Phase 4 Fallback: Third-Party Proxy (No Home Network Available)

When the recruiter's home/work network cannot act as the exit proxy (e.g., recruiter moves, network unavailable, multi-recruiter agency without per-recruiter home networks), a third-party proxy is the fallback. LinkedIn survival rates are lower than a genuine home IP but acceptable for agencies at scale.

### Proxy integration with browser-use

browser-use accepts Playwright's `ProxySettings` natively on `BrowserProfile`:

```python
from browser_use import BrowserProfile, BrowserSession
from playwright.async_api import ProxySettings

profile = BrowserProfile(
    user_data_dir=f"{PROFILE_DIR}/{tenant_id}/{user_id}",
    proxy=ProxySettings(
        server="http://brd.superproxy.io:33335",
        username="brd-customer-C1234-zone-mobile_residential-session-randABC12345",
        password="zone_password"
    )
)
session = BrowserSession(browser_profile=profile)
```

### Per-recruiter deterministic proxy token

Each LinkedIn account must have its own stable IP. Generate a deterministic session token from the recruiter ID so it survives Talon restarts without changing the pinned IP:

```python
import hashlib
from playwright.async_api import ProxySettings

def proxy_for_recruiter(recruiter_id: str, zone_password: str) -> ProxySettings:
    """Deterministic sticky session — same recruiter always gets same IP."""
    session_token = hashlib.sha256(recruiter_id.encode()).hexdigest()[:8]
    return ProxySettings(
        server="http://brd.superproxy.io:33335",
        username=f"brd-customer-C1234-zone-mobile_residential-session-rand{session_token}",
        password=zone_password,
    )
```

**Account → proxy registry:** Store the `proxy_endpoint` alongside the recruiter's LinkedIn account in the database. Never reassign an IP to a different LinkedIn account — LinkedIn detects IP sharing across accounts. This mapping is permanent until the IP is explicitly burned.

### Provider comparison

**Sticky session providers (shared pool, per-GB billing):**

| Provider | Type | Sticky duration | LinkedIn survival | Pricing | Notes |
|----------|------|----------------|-----------------|---------|-------|
| **SOAX** | Mobile 4G/5G | Up to **60 min** (best in class) | ~85% | $6.60/GB PAYG or $139/mo 150GB | 99.55% success rate; KYC required |
| **Bright Data** | Mobile 4G/5G | Up to 30 min | ~85% | ~$14–24/GB mobile | Explicit LinkedIn product; 99%+ success |
| **Oxylabs** | Mobile + residential | Up to 30 min | ~85% | ~$15/GB mobile | 99.9% uptime; 1.1s avg response |
| **IPRoyal** | Residential | Up to 7 days | ~50% | ~$2–7/GB | Lower survival post-2025 detection expansion |

**Dedicated IP providers (exclusively yours, flat-rate billing):**

| Provider | Type | Monthly cost | LinkedIn survival | Notes |
|----------|------|-------------|-----------------|-------|
| **Webshare** | Dedicated ISP/residential | ~$1.47/IP | ~90–95% | Cheapest; static residential, no pool sharing |
| **IPRoyal Static** | Dedicated residential ISP | ~$5.50/IP | ~90–95% | Permanent assignment |
| **Proxy-Seller** | Dedicated 4G/5G mobile | ~$10/IP | ~85% | Real carrier; on-demand rotation link |
| **PROXY.father** | Dedicated 4G/5G (real SIM) | $49–59/mo | ~85% | One SIM per IP; EU-focused |

**Key insight:** Playwright renders full pages — 10–50x more bandwidth than bare HTTP scraping. A single recruiter doing 2 hours of LinkedIn automation per day burns 5–10 GB/month. At $14–24/GB that is $70–240/mo per recruiter in proxy fees alone. Dedicated flat-rate IPs at $1.47–5.50/mo are almost always cheaper.

**Phase 4 default:** Dedicated ISP/static residential IP per recruiter (Webshare at ~$1.47/IP). Only use sticky mobile sessions for accounts that need re-activation after a flag event (SOAX 60-min sticky).

### Sticky session format by provider

```
# Bright Data
username: brd-customer-{CUSTOMER_ID}-zone-mobile_residential-session-rand{TOKEN}-country-us
host: brd.superproxy.io:33335

# IPRoyal (token and lifetime encoded in password)
username: {iproyal_username}
password: {iproyal_password}_country-us_session-{8CHAR}_lifetime-24h
host: geo.iproyal.com:12321

# Oxylabs
username: {oxylabs_username}-sessid-{TOKEN}-country-us
host: pr.oxylabs.io:7777
```

### WireGuard + Wireproxy mesh (50+ recruiters, no home networks)

At scale, per-GB billing compounds. The alternative: a WireGuard mesh where each recruiter gets a dedicated residential ISP peer, exposed locally as a SOCKS5 port via [Wireproxy](https://github.com/windtf/wireproxy). Each WG peer is a cheap VPS at a residential ISP (~$5/mo flat), not a metered proxy pool.

```
Recruiter A → wireproxy :1080 → WireGuard peer A (residential ISP, NYC)
Recruiter B → wireproxy :1081 → WireGuard peer B (residential ISP, London)

profile_a = BrowserProfile(proxy=ProxySettings(server="socks5://127.0.0.1:1080"))
profile_b = BrowserProfile(proxy=ProxySettings(server="socks5://127.0.0.1:1081"))
```

```ini
# /etc/wireproxy/recruiter_a.conf
WGConfig = /etc/wireguard/recruiter_a.conf

[Socks5]
 BindAddress = 127.0.0.1:1080
```

| | Home network exit proxy (Phase 3) | Third-party dedicated IP (Phase 4) | WireGuard mesh (Phase 4 scale) |
|-|----------------------------------|-----------------------------------|-----------------------------|
| **LinkedIn survival** | Highest (~100%) | ~90–95% | ~90–95% (genuine ISP) |
| **Cost** | ~$5–10/mo VM only | ~$1.47–10/mo per IP | ~$5/mo per WG peer |
| **IP trust** | Recruiter's actual home IP | Clean dedicated pool IP | Genuine ISP IP |
| **Operational effort** | Tailscale/WG setup once | Config string per recruiter | Provision WG peers |
| **When to use** | Phase 3 default | Phase 4 when home unavailable | Phase 4 at 50+ recruiters |


## 6. Browser Execution Backend

Talon abstracts the browser execution layer behind a `BrowserBackend` interface. This makes the underlying execution library swappable per site without changing Talon's task lifecycle, permission model, or determinism rules.

### 6.1 BrowserBackend interface

`BrowserBackend` is a four-method protocol: `open_session`, `health_check`, `execute_task`, and `close_session`. Every runner call goes through this interface — no code outside a backend implementation ever touches browser APIs directly. A new backend is a single new class plus a one-line config entry. Switching backends for a site requires no changes to the task lifecycle, permission model, or A2A transport.

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

[browser-use](https://github.com/browser-use/browser-use) wraps Playwright with an LLM agent. It controls the browser via Chrome DevTools Protocol (CDP) from an external Python process — it never touches the page source or injects scripts.

**Characteristics:**
- External process — all browser control is over CDP, not in-page
- LLM adapts to DOM changes without code updates — no selector maintenance
- `allowed_domains` enforced natively — site isolation built into the session constructor
- `storage_state` parameter accepts Playwright's exported session state — S3 session persistence (Section 5.2) works out of the box
- Does not require JavaScript injection into the target page

### 6.4 backend: page-agent (alternative)

[page-agent](https://github.com/alibaba/page-agent) by Alibaba is a JavaScript in-page DOM agent. Unlike browser-use, it lives **inside** the web page — injected as a script tag, parsing the DOM directly via JavaScript. No screenshots, no OCR; text-only DOM interaction. Its DOM processing layer is derived from browser-use under MIT licence.

**Characteristics:**
- In-page JavaScript injection — executes inside the target page's JavaScript context
- DOM-native text parsing — potentially faster and cheaper per step than vision-based approaches
- Multi-tab support via optional Chrome extension
- Conceptually compatible with Talon's determinism rules; `allowed_domains` constraint must be re-enforced at the Talon adapter level (not natively in page-agent)

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
