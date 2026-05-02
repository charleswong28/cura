# Outreach Technical Plan — LinkedIn via Cura Browser Agent

> **Status:** Research & Design
> **Phase:** 3 (Sourcing Automation + Intelligence Layer)
> **Last updated:** 2026-03-21
> **Task queue & scheduling design:** See @docs/crm-technical-plan.md Section 5

---

## 1. Why a Local Browser Agent

LinkedIn aggressively detects and bans automation tools that operate from data centres, shared proxies, or unofficial APIs. The core insight remains: **automation must run on the recruiter's own machine, from their own IP, using their own browser session** — making it indistinguishable from manual usage.

Cura achieves this with a **local browser agent**: a Cura-controlled service running on the recruiter's machine that uses [Browser-Use](https://github.com/browser-use/browser-use) (MIT, 79K+ GitHub stars) to interact with the recruiter's real Chrome browser, and the Claude API for reasoning about page state and deciding actions.

| Detection vector | Third-party SaaS (Unipile, HeyReach) | Headless Playwright | **Cura Browser Agent** (Browser-Use + real Chrome) |
|------------------|---------------------------------------|---------------------|----------------------------------------------------|
| **IP address** | Data centre / residential proxy — flagged | Data centre — flagged | Recruiter's home/office IP — clean |
| **Browser fingerprint** | Anti-detect browser — detectable | Headless markers (`__playwright__binding__`, `navigator.webdriver`) — detectable | Real Chrome with real extensions, history, cookies — clean |
| **CDP detection** | N/A (API-based) | CDP protocol exposed — detectable | CDP exposed (mitigated by Patchright — see below) |
| **TLS fingerprint** | Programmatic HTTP clients — distinct signatures | Chromium TLS — close | Native Chrome TLS stack — identical to manual |
| **Session origin** | Cookie extraction or credential injection | Cookie injection | Recruiter's own authenticated session |
| **Behavioural pattern** | Uniform timing, no scrolling, no mouse movement | No human variance | AI-driven interaction with natural variance + random delays |
| **LinkedIn ToS** | API abuse / scraping — clear violation | Automation — violation | Browser automation — grey area |

**Bottom line:** Cura's local agent connects to the recruiter's running Chrome instance via Browser-Use, uses the Claude API for reasoning about page state and actions, and orchestrates task execution directly from the CRM queue. No third-party subscriptions required beyond Cura itself. LinkedIn sees normal user activity from a real browser.

### 1.1 Agent Architecture

```
Cura CRM (NestJS API)
    │
    ├── Task Queue (CoworkTask model)
    ├── Rate Limiter (budget enforcement)
    ├── Session Audit (CoworkSession model)
    │
    ▼
Cura Desktop Agent (local service on recruiter's machine)
    │
    ├── Scheduler (triggers sessions per CRM config)
    ├── Browser-Use (Python, connects to Chrome)
    │   └── Claude API (reasoning about page state + actions)
    └── Chrome (real profile, recruiter's LinkedIn session)
         └── LinkedIn (sees normal user activity)
```

- The agent runs as a local service (Electron tray app or background daemon) on the recruiter's machine
- It polls the CRM API for session schedule and task queue
- Browser-Use connects to the recruiter's running Chrome via `--remote-debugging-port` (CDP) or Patchright (no CDP)
- Claude API provides reasoning: the agent sends page screenshots/DOM to Claude, Claude decides what to click/type
- Results are reported back to CRM via API (`completeTask`, `failTask`, `reportReply`, etc.)

### 1.2 Why Browser-Use

| Criteria | Browser-Use | Stagehand | Skyvern |
|----------|-------------|-----------|---------|
| **License** | MIT | MIT | AGPL-3.0 |
| **GitHub stars** | 79K+ | ~10K | ~14K |
| **Language** | Python | TypeScript | Python |
| **Real Chrome profile** | Yes (`--browser real --profile`) | Via CDP connect | Via `--use-local-profile` |
| **LLM support** | Model-agnostic (Claude, GPT, etc.) | Customisable | Customisable |
| **Maturity** | $17M funding, active development | Active | Active |
| **Commercial use** | No restrictions (MIT) | No restrictions (MIT) | Copyleft — requires open-sourcing derivatives |

Browser-Use is the clear choice: MIT license, largest community, model-agnostic, and explicit support for connecting to real Chrome profiles with existing sessions.

### 1.3 CDP Detection Risk & Mitigation

**CDP (Chrome DevTools Protocol) is the primary detection vector.** LinkedIn actively detects CDP instrumentation — error serialisation patterns, protocol side effects, and `__playwright__binding__` globals all signal automation.

Browser-Use wraps Playwright, which uses CDP by default. Mitigations:

| Mitigation | Effect | Status |
|------------|--------|--------|
| **Real Chrome profile** (not headless) | Eliminates headless markers, `navigator.webdriver`, UA string leaks | Available now |
| **Patchright** (CDP-free Playwright fork) | Avoids CDP entirely — uses alternative browser control | Emerging; less battle-tested |
| **Behavioural throttling** | Random delays (30s–3min), working hours only, human-like patterns | Built into Cura's rate limiter |
| **Low volume** | 15–50 actions/day — well below detection thresholds | Executive search volumes are inherently low |

**Risk assessment:** MEDIUM. Acceptable for executive search volumes. Higher than the original Cowork plan (which used a Chrome extension with no CDP), but Cowork required each recruiter to have a Claude Max subscription — an untenable ask.

### Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| **Serial execution** | One browser, one session — can't parallelise | Executive search volumes (20–50/day) don't need parallelism |
| **Requires recruiter's machine** | Chrome must be open during working hours | Scheduled sessions; recruiter sets and forgets |
| **CDP detection** | LinkedIn may detect Chrome DevTools Protocol | Patchright (CDP-free fork); behavioural throttling; real profile reduces other signals |
| **Python sidecar** | Browser-Use is Python; Cura is TypeScript | Local agent runs as standalone Python service with REST API |
| **Reliability** | ~60% on complex UI tasks; simple tasks much higher | LinkedIn outreach is repetitive; high success expected |

---

## 2. Task Types

Each agent session clears tasks from the CRM queue. Different task types have different LinkedIn limits and different roles in the pipeline.

| Task Type | Description | LinkedIn Limit | Prioritisation Applies? |
|-----------|-------------|---------------|------------------------|
| **SEND_CONNECTION_REQUEST** | Send invite to a non-connection, optionally with a personalised note (Free: 200 chars, Paid: 300 chars) | ~100–200/week; Free accounts limited to 5–10 notes/month | **Yes** — CRM ranks best-fit candidates to maximise response rate within weekly cap |
| **SEND_MESSAGE** | Send message to an existing 1st-degree connection | 50–100/day (velocity-based) | **Yes** — CRM prioritises candidates most likely to convert |
| **SEND_INMAIL** | Send InMail to a non-connection (requires Premium/Sales Nav/Recruiter) | Monthly credit-based (5–150/mo depending on tier) | **Yes** — scarce credits should go to highest-value targets |
| **SEARCH_PROFILES** | Search LinkedIn for candidates matching filters (title, location, industry, etc.) and import results to CRM | Free/Premium: ~300 searches/month (CUL). Sales Nav/Recruiter: unlimited | **No** — search is exploratory; volume is the goal |
| **SYNC_PROFILE** | Visit a candidate's LinkedIn profile to update CRM data (title, company, location, headline) | ~500–2,000 profile views/day | **No** — sync all stale profiles regardless of fit |
| **SCAN_INBOX** | Scan LinkedIn messaging inbox for new replies and extract content | No specific limit (reading, not sending) | **No** — always scan everything |
| **SCAN_CONNECTIONS** | Check sent invitations page for accepted connections | No specific limit | **No** — always scan everything |
| **WITHDRAW_INVITATION** | Withdraw pending connection requests older than 3 weeks to stay under 700 cap | No specific limit | **No** — withdraw oldest first |

### Execution Order Per Session

Each 30-min agent session runs tasks in this order:

```
1. SCAN_INBOX          — check for new replies (read-only, no limit risk)
2. SCAN_CONNECTIONS    — check for accepted invitations
3. WITHDRAW_INVITATION — clear stale pending invites if needed
4. SEND_CONNECTION_REQUEST — highest-priority outreach first
5. SEND_MESSAGE        — follow-ups to existing connections
6. SEND_INMAIL         — use credits on top targets
7. SEARCH_PROFILES     — sourcing (if budget allows)
8. SYNC_PROFILE        — refresh stale CRM data
```

Outreach tasks (4–6) are ordered by CRM match score — best candidates first. If the session runs out of time or budget, lower-ranked candidates roll to the next session.

---

## 3. CRM-Driven Match Prioritisation — ROI for Outreach Actions

Prioritisation applies to **outreach actions only** (connection requests, messages, InMails) — not to search, sync, or scan tasks which have separate limits and no targeting benefit.

LinkedIn imposes hard daily/weekly limits on outreach (see Section 4). This makes **every outreach action expensive**. A recruiter can send ~15 connection requests/day — wasting even one on a poor-fit candidate is a direct ROI loss.

**This is where Cura's CRM is the differentiator.** Traditional outreach tools blast messages to large lists. Cura does the opposite: it uses the CRM's enriched candidate data to rank and select the highest-value targets, ensuring every limited outreach slot goes to the best possible match.

### How CRM Prioritisation Works

```
Job Spec + Enriched Candidate Pool
    │
    ▼
CRM Match Scoring (outreach candidates only)
    • Role fit (title, seniority, industry alignment)
    • Skill match (required vs candidate skills)
    • Location / timezone compatibility
    • Recency of enrichment data
    • Prior relationship signals (past interactions, referrals)
    • Likelihood of response (connection degree, shared groups, mutual connections)
    │
    ▼
Ranked Candidate List
    │
    ▼
Daily Budget Filter
    • "I have 15 connection requests today — pick the top 15"
    • "I have 5 InMail credits left — use them on the 5 best non-connections"
    │
    ▼
Task Queue (approved by recruiter)
    │
    ▼
Cura Browser Agent executes in priority order
```

### Why This Beats Traditional Outreach

| Approach | Daily Actions | Targeting | Expected Response Rate |
|----------|--------------|-----------|----------------------|
| **Manual spray-and-pray** | ~15 connection requests | Recruiter's gut feel | ~10–20% |
| **Automation tools** (HeyReach, Dux-Soup) | ~50–100 (risky volume) | Basic filters | ~5–10% (volume over quality) |
| **Cura CRM + Claude** | ~15 (within safe limits) | AI-scored, enriched, ranked | ~25–40% (best matches first) |

The constraint isn't volume — it's selection. With only ~15 connection requests/day and ~70/week (paid), every slot must count. CRM match scoring turns a hard limit into a competitive advantage.

### Recruiter Approval Flow

The CRM presents the ranked outreach list. The recruiter reviews and approves:

```
Dashboard → "Today's Outreach Queue (15 of 43 candidates)"

  #1  Sarah Chen — CFO, Series B fintech — 94% match
  #2  James Park — VP Finance, growth stage — 91% match
  ...
  #15 Maria Lopez — Controller, mid-market — 78% match

  [Approve All]  [Edit Selection]  [Skip Today]
```

The recruiter stays in control — Cura recommends, the recruiter decides.

---

## 4. LinkedIn Limits & Rate Enforcement

LinkedIn does **not** publish official numbers for most limits. The values below are community-observed (2025–2026). These are **browser/UI limits**, not API limits.

### 4.1 Connection Requests

LinkedIn's primary constraint is **weekly**, resetting 7 days after your first invitation in a cycle.

| Account Type | Weekly Limit | Confidence |
|-------------|-------------|------------|
| **Free** | ~100/week | Medium-High |
| **Premium / Sales Nav / Recruiter** | ~100–200/week | Medium-High |

**Factors that push toward 200/week:** SSI score >70, acceptance rate >40%, account age 6+ months, active engagement, paid subscription.

#### Personalised Notes — Critical Constraint

| Account Type | With Note | Without Note |
|-------------|----------|-------------|
| **Free** | **5–10/month** (hard cap) | Up to ~100/week |
| **Paid** | **Unlimited** (within weekly cap) | Up to ~200/week |

Character limits: Free 200 chars, Paid 300 chars. **Recruiter MUST have a paid LinkedIn subscription for meaningful outreach.**

#### Pending Invitations

**700 max** pending (unaccepted) invitations. Cura auto-withdraws after 3 weeks to stay under.

### 4.2 Messages (1st-Degree Connections)

No hard cap — velocity-based detection. Safe range: **50–100 messages/day**. Personalised messages are safer than templates.

### 4.3 InMail Credits

| Tier | Monthly Credits | Cost |
|------|----------------|------|
| Premium Career | 5 | $30/mo |
| Premium Business | 15 | $60/mo |
| Sales Navigator | 50 | $100/mo |
| Recruiter Lite | 30 | $170/mo |
| Recruiter (Full) | 150 | $835–1,600/mo |

Credits refunded if recipient replies within 90 days. Unused credits roll over (3x cap).

### 4.4 Profile Views & Search

| Action | Free | Paid (Sales Nav / Recruiter) |
|--------|------|------------------------------|
| Profile views/day | ~500 | ~2,000 |
| Searches/month | ~300 (CUL applies) | Unlimited (CUL removed) |

### 4.5 Cura's Enforcement Limits

Cura enforces **well below** LinkedIn's thresholds — leaving room for the recruiter's manual usage. Budget checked by the agent via CRM API before each action (see @docs/crm-technical-plan.md Section 5.4).

| Action | LinkedIn Limit | **Cura Limit** | Rationale |
|--------|---------------|----------------|-----------|
| Connection requests/week | 100–200 | **70** | ~50% margin for manual use |
| Connection requests/day | 15–40 | **15** | Conservative daily spread |
| Messages/day | 50–100 | **40** | Below spam detection |
| Profile views/day | 500–2,000 | **200** | Only view needed profiles |
| Pending invitations | 700 | **500** | Auto-withdraw after 3 weeks |

### 4.6 Warm-Up (New Accounts)

Accounts must have 150+ connections. 4-week ramp: Week 1 (3 conn/day), Week 2 (5), Week 3 (10), Week 4+ (full limits).

### 4.7 Timing

- Random delays: 30s–3min between actions
- Working hours only: 8am–7pm (recruiter's timezone)
- Weekend: 50% volume or pause (configurable)
- Sessions: every 30 min

---

## 5. Reply Detection Pipeline

LinkedIn has **no webhook or push API** for incoming messages. Three mechanisms work together:

### 5.1 Primary: LinkedIn Email Notifications → Cura Email Subscription (Phase 2)

LinkedIn sends email notifications on new messages. Cura's Phase 2 email subscription captures these automatically.

```
Candidate replies on LinkedIn
    → LinkedIn emails recruiter (messages-noreply@linkedin.com)
    → Cura email subscription captures it
    → Classifier detects LinkedIn notification
    → Matches sender to CRM candidate by LinkedIn URL
    → Creates reply record + dashboard notification
    → Next agent session reads full message content
```

**Prerequisite:** Recruiter must enable LinkedIn email notifications for messages.

### 5.2 Secondary: Scheduled Inbox Scan (Every 30 Min)

Each agent session scans LinkedIn inbox before outreach tasks. Picks up full message content, missed notifications, and connection accepts.

### 5.3 Tertiary: CRM Staleness Nudges

| Condition | CRM Action |
|-----------|-----------|
| Sent 48h ago, no reply | Informational dashboard note |
| Sent 7+ days, no reply | Auto-draft follow-up → recruiter reviews |
| Connection accepted, no follow-up | Auto-draft pitch → recruiter reviews |

### 5.4 Reply Classification

Replies are classified by Claude and auto-draft appropriate responses:
- **Interested** → Draft follow-up with job details + scheduling link
- **Not interested** → Mark opt-out, no follow-up
- **Question** → Draft answer from job spec data
- **Referral** → Create new candidate, draft outreach
- **Out of office** → Schedule follow-up for return date
- **Connection accepted** → Draft follow-up pitch

---

## 6. Recruiter Onboarding

| Requirement | Why |
|-------------|-----|
| Cura subscription (includes AI) | Cura provides Claude API access; no separate AI subscription needed |
| Cura Desktop Agent installed | Local service that connects to Chrome and executes tasks |
| Google Chrome (real profile, logged into LinkedIn) | Agent connects to recruiter's running Chrome instance |
| LinkedIn Premium / Sales Nav / Recruiter | Free accounts limited to ~5 personalised notes/month |
| 150+ LinkedIn connections | Below this, LinkedIn flags activity |
| No other automation tools running | Dux-Soup, LinkedHelper etc. increase detection risk |

Setup in Cura: recruiter registers LinkedIn profile URL + subscription tier → risk disclosure + acceptance (including CDP detection risk) → limits auto-applied based on tier. Schedule is configured in the Cura CRM dashboard (default: 30 min, Mon–Fri, 8am–7pm). The Cura Desktop Agent starts automatically and connects to Chrome when a session is due.

---

## 7. Comparison: Cura Browser Agent vs Alternatives

| Aspect | **Cura Browser Agent** (chosen) | **Claude Cowork** (original plan) | **Unipile / HeyReach** | **GoLogin + Playwright** |
|--------|--------------------------------|-----------------------------------|------------------------|--------------------------|
| **IP risk** | Recruiter's own — zero | Recruiter's own — zero | Residential proxy — medium | Anti-detect — low |
| **Detection risk** | Medium (CDP mitigated by Patchright) | Low (no CDP) | Medium | Low |
| **Vendor dependency** | None beyond Cura | Claude Max per recruiter | Claude + vendor | Claude + GoLogin + proxy |
| **Recruiter cost** | Included in Cura subscription | $100–200/mo Claude Max per recruiter | Vendor fees | GoLogin + proxy fees |
| **Data stays local** | Yes | Yes | No (passes through vendor) | No (passes through proxy) |
| **Cura controls the agent** | Yes — full orchestration | No — depends on Cowork scheduling | No | Partially |
| **Parallelisation** | Serial | Serial | Async API | Multiple profiles |
| **Speed** | ~15–30 profiles/hr | ~15–30 profiles/hr | ~100+/hr | ~50–100/hr |
| **Unattended** | Semi (Chrome must be open) | Semi (Chrome must be open) | Yes (server-side) | Yes (cloud-based) |
| **LinkedIn ToS** | Grey (automation) | Grey (extension) | Violation (API abuse) | Violation (automation) |

**For executive search:** The Cura Browser Agent retains the key advantage of the original Cowork approach (recruiter's own IP, session, and browser) while eliminating the dependency on each recruiter having a Claude Max subscription. Cura controls the full orchestration — scheduling, task selection, rate limiting, and AI reasoning — through a single local agent. The trade-off is slightly higher detection risk from CDP (mitigated by Patchright), which is acceptable at executive search volumes of 15–50 actions/day.

---

## 8. Key Technical Decision

### Decision: Cura Browser Agent as LinkedIn Execution Layer

**Chosen:** Cura-controlled local agent using Browser-Use (MIT, Python) + Claude API for reasoning, connecting to recruiter's real Chrome profile. Scheduled by the CRM, executing every 30 min during working hours.

**Why:**
- Recruiter's own IP, session, browser — low detection risk
- No candidate data leaves the recruiter's machine/Cura system
- Zero additional subscription cost for recruiters (Cura provides Claude API access)
- Cura controls the full agent lifecycle — no dependency on external scheduling
- Direct CRM integration — agent queries task queue and reports results via Cura's API
- Model-agnostic — Browser-Use supports Claude, GPT, or any LLM; not locked to one provider
- MIT license — no licensing concerns for commercial use

**Why not Claude Cowork (original plan):**
- Requires each recruiter to have Claude Max ($100–200/mo) — cannot ask customers to subscribe to a separate service
- Cura has no control over Cowork's scheduling, reliability, or execution environment
- MCP indirection adds complexity (Cowork fetches tasks via MCP, rather than Cura orchestrating directly)

**Trade-offs accepted:**
- Serial execution (sufficient for executive search volumes)
- Requires recruiter's machine during working hours (same as Cowork)
- CDP detection risk: MEDIUM (mitigated by Patchright, behavioural throttling, real Chrome profile)
- Browser-Use is Python — requires a Python sidecar or standalone service in Cura's otherwise TypeScript stack

**Alternatives considered:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Claude Cowork | Lowest detection risk (no CDP), native Chrome extension | Requires Claude Max per recruiter ($100–200/mo), no Cura control | Rejected — cost and control |
| Browser-Use + Playwright (CDP) | MIT, 79K stars, model-agnostic, real Chrome profile | CDP detectable by LinkedIn | **Chosen** with Patchright mitigation |
| Browser-Use + Patchright (no CDP) | No CDP, lower detection risk | Less battle-tested than standard Playwright | Preferred variant — adopt when stable |
| Stagehand | TypeScript-native, MIT, clean API (`act`/`extract`/`observe`) | Smaller community, less real-Chrome documentation | Keep as fallback |
| Skyvern | MCP built-in, vision-based, local profile cloning | AGPL-3.0 — problematic for commercial use | Rejected — license |

---

## 9. Open Questions

1. **CDP detection rate on LinkedIn:** Run a 20-profile test session using Browser-Use + real Chrome profile. Measure if LinkedIn shows any warnings or restrictions. Compare with Patchright variant.
2. **Browser-Use reliability on LinkedIn DOM:** LinkedIn's React-based UI is complex. Test connection request, message send, inbox scan, and profile search flows for success rate. Target: >90% on repetitive tasks.
3. **Patchright maturity:** Evaluate Patchright as a CDP-free Playwright replacement. Is it stable enough for production use? What is the community adoption trend?
4. **Python sidecar architecture:** Browser-Use is Python. Design the integration with Cura's TypeScript backend — options: (a) Python subprocess spawned by NestJS, (b) standalone Python service with REST/gRPC API, (c) rewrite agent logic in TypeScript using Playwright directly. Evaluate trade-offs.
5. **Match scoring model:** What weights produce the best response rates? Requires A/B testing once live.
6. **Recruiter consent and risk disclosure:** What level of disclosure about automation detection risk is required? Draft consent language for onboarding flow.
