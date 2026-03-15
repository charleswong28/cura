# Outreach Technical Plan — LinkedIn via Claude Cowork

> **Status:** Research & Design
> **Phase:** 3 (Sourcing Automation + Intelligence Layer)
> **Last updated:** 2026-03-15
> **Task queue & scheduling design:** See @docs/crm-technical-plan.md Section 5

---

## 1. Why Claude Chrome Extension

LinkedIn aggressively detects and bans automation tools that operate from data centres, shared proxies, or unofficial APIs. The core insight: **Claude for Chrome runs in the recruiter's own browser, on their own machine, from their own IP** — making it indistinguishable from manual usage.

| Detection vector | Third-party tools (Unipile, HeyReach, Playwright) | Claude for Chrome |
|------------------|----------------------------------------------------|-------------------|
| **IP address** | Data centre / residential proxy — flagged | Recruiter's home/office IP — clean |
| **Browser fingerprint** | Headless or anti-detect browser — detectable | Real Chrome with real extensions, history, cookies |
| **TLS fingerprint** | Programmatic HTTP clients have distinct signatures | Native Chrome TLS stack — identical to manual |
| **Session origin** | Cookie extraction or credential injection | Recruiter's own authenticated session |
| **Behavioural pattern** | Uniform timing, no scrolling, no mouse movement | Claude interacts with the real DOM — natural variance |
| **LinkedIn ToS** | API abuse / scraping — clear violation | Browser extension — grey area, not actively enforced |

**Bottom line:** No proxy infrastructure, no cookie management, no vendor dependency. The recruiter opens Chrome, starts a Cowork session, and Claude fetches tasks from Cura via MCP and executes them. LinkedIn sees a normal user clicking buttons.

### Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| **Serial execution** | One browser, one session — can't parallelise | Executive search volumes (20–50/day) don't need parallelism |
| **Requires recruiter's machine** | Chrome must be open during working hours | Scheduled sessions; recruiter sets and forgets |
| **Claude Max subscription** | $100–200/month per recruiter | Replaces hours of manual work per day |
| **Reliability** | ~60% on complex UI tasks; simple tasks much higher | LinkedIn outreach is repetitive; high success expected |

---

## 2. Task Types

Each Cowork session clears tasks from the CRM queue. Different task types have different LinkedIn limits and different roles in the pipeline.

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

Each 30-min Cowork session runs tasks in this order:

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
Claude Cowork executes in priority order
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

Cura enforces **well below** LinkedIn's thresholds — leaving room for the recruiter's manual usage. Budget checked via MCP before each action (see @docs/crm-technical-plan.md Section 5.4).

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
    → Next Cowork session reads full message content
```

**Prerequisite:** Recruiter must enable LinkedIn email notifications for messages.

### 5.2 Secondary: Scheduled Inbox Scan (Every 30 Min)

Each Cowork session scans LinkedIn inbox before outreach tasks. Picks up full message content, missed notifications, and connection accepts.

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
| Claude Max ($100–200/mo) | Required for Cowork + Chrome extension |
| Claude for Chrome extension | Enables browser control |
| LinkedIn Premium / Sales Nav / Recruiter | Free accounts limited to ~5 notes/month |
| 150+ LinkedIn connections | Below this, LinkedIn flags activity |
| No other automation tools running | Dux-Soup, LinkedHelper etc. increase detection risk |

Setup in Cura: recruiter registers LinkedIn profile URL + subscription tier → risk disclosure + acceptance → limits auto-applied based on tier. Schedule is configured in Claude Cowork (default: 30 min, Mon–Fri, 8am–7pm).

---

## 7. Comparison: Cowork vs Alternatives

| Aspect | **Claude Cowork** (chosen) | **Unipile / HeyReach** | **GoLogin + Playwright** |
|--------|---------------------------|------------------------|--------------------------|
| **IP risk** | Recruiter's own — zero | Residential proxy — medium | Anti-detect — low |
| **Detection risk** | Low | Medium | Low |
| **Vendor dependency** | Claude only | Claude + vendor | Claude + GoLogin + proxy |
| **Data stays local** | Yes | No (passes through vendor) | No (passes through proxy) |
| **Parallelisation** | Serial | Async API | Multiple profiles |
| **Speed** | ~15–30 profiles/hr | ~100+/hr | ~50–100/hr |
| **Unattended** | No (needs recruiter machine) | Yes (server-side) | Yes (cloud-based) |
| **LinkedIn ToS** | Grey (extension) | Violation (API abuse) | Violation (automation) |

**For executive search:** Quality over quantity. Cowork + CRM match scoring = fewer actions, better targets, higher response rates, lower risk.

---

## 8. Key Technical Decision

### Decision: Claude Cowork as LinkedIn Execution Layer

**Chosen:** Claude Cowork + Claude for Chrome, scheduled every 30 min, clearing task queue from CRM

**Why:**
- Recruiter's own IP, session, browser — lowest detection risk
- No candidate data leaves the recruiter's machine/Cura system
- Zero vendor dependency beyond Claude (which Cura already depends on)
- MCP integration is native (Cura is already an MCP server)
- CRM match scoring maximises ROI within LinkedIn's hard limits

**Trade-offs accepted:**
- Serial execution (sufficient for executive search volumes)
- Requires recruiter's machine during working hours
- Claude Max subscription cost ($100–200/mo, justified by time savings)

---

## 9. Open Questions

1. **Chrome extension reliability:** How reliably can Claude for Chrome interact with LinkedIn UI elements? Run a 20-profile test session.
2. **Claude Max adoption:** Will target recruiters already have Claude Max? Factor cost into Cura pricing.
3. **MCP + Chrome concurrency:** Can Cowork alternate between MCP calls (CRM) and Chrome extension (LinkedIn) in a single session?
4. **Session duration:** A 50-profile session might take 2+ hours. Does Cowork support this, or batch across multiple 30-min sessions?
5. **Match scoring model:** What weights produce the best response rates? Requires A/B testing once live.
