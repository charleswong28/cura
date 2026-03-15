# Project overview

Cura is an AI-augmented recruitment platform designed to evolve from a high-touch "System of Record" to an autonomous "System of Intelligence." The project follows a strict phased rollout: establishing a rock-solid CRM core first, followed by incremental AI layers where humans remain the authoritative gatekeepers for every interaction until the system demonstrates reliable outcomes.

### Design Principles

- **Claude-native interaction layer** — Cura is a CRM with MCP server; recruiters can command it through Claude in natural language or from the CRM UI. Claude Cowork + Claude for Chrome extends this to browser-based execution (LinkedIn outreach, profile search).
- **Omni-trigger** — Cura subscribes to every recruitment-relevant event source (email, LinkedIn, calls, CRM events, forms). Events flow in automatically; Claude acts; the recruiter approves.
- **Sourcing-first, pipeline-ready** — Entry point is the spec (or job title); system generates spec → searches all channels → builds candidate list. Pipeline management and zero-loss memory handle the follow-through.
- **Every module is configuable** - Each module starts with system prompt. User should be able to customize the system prompt and setup SKILL to dynamically inject context.
- **Auto-enrichment as default** — Every search updates existing profiles. External sources (PDL, Lusha, LinkedIn) sync continuously to the local DB. BYOK model for API keys.
- **Single Responsibility per Module** — Clear boundaries and ownership
- **Compliance by design** — Built-in audit trails and transparent logic; human "Seal of Approval" gates all high-stakes actions (client submissions, offer communications)

### Implementation Philosophy

**Phase-by-Phase Approach:** Start with maximum human verification and gradually reduce oversight based on proven performance. No automation without demonstrated reliability.

---

## 2. Implementation Phases

### Phase 1: Core CRM Foundation + MCP Server Skeleton
**Goal:** Rock-solid system of record AND the MCP interaction layer as the primary UX surface
- Manual Kanban board for pipeline management
- Basic CRUD operations (candidates, clients, jobs)
- **Cura MCP Server** — exposes core entities (candidates, jobs, clients) as Claude tools; natural language commands read/write CRM
- **Human verification gates for ALL outreach** — AI drafts, human approves, human sends
- Activity timeline with manual logging
- Simple AI suggestions (human decides everything)

### Phase 2: Omni-Trigger — Subscribe to Everything
**Goal:** Cura subscribes to all recruitment event sources so Claude can act autonomously; recruiter approves
- **Email subscription** — inbound emails trigger classification, CRM enrichment, and Claude-drafted responses
- **LinkedIn reply detection via email notifications** — LinkedIn sends email on new messages; Cura email subscription captures them, matches sender to CRM candidate by LinkedIn URL, creates reply record + dashboard notification. See @docs/outreaching-technical-plan.md Section 5.1
- **LinkedIn activity subscription** — connection accepts, InMail replies, and messages trigger Claude follow-up drafts
- **Post-call subscription** — call/meeting end events trigger transcript ingestion, candidate enrichment, and follow-up drafts
- **Pipeline staleness subscription** — scheduled scans detect idle candidates and trigger proactive Claude nudges; auto-draft follow-up after 7+ days with no reply. See @docs/outreaching-technical-plan.md Section 5.3
- Email/Calendar sync (automated logging, human verification)
- CV Parser (AI extracts, human approves changes)
- Enrichment workflows (AI suggests, human approves)
- Chrome extension as optional **convenience tool** for recruiter-initiated additions (not part of trigger architecture)

### Phase 3: Sourcing Automation + Intelligence Layer
**Goal:** Spec-to-candidate-list automation; AI recommendations with mandatory human approval
- **Job spec generation** — client brief / job title → full spec auto-generated via Claude
- **Multi-channel sourcing** — MCP tool executes parallel search across LinkedIn, PDL, ContactOut, internal DB; returns enriched list
- **LinkedIn outreach via Claude Cowork** — candidate found → personalised LinkedIn message drafted → human approves in CRM → recruiter starts Cowork session → Claude for Chrome sends connection requests / messages / InMails from recruiter's own browser. See @docs/outreaching-technical-plan.md
- **Cowork task queue** — generic task queue (`CoworkTask` model) consumed by Cowork on 30-min schedule. Task types: `SEND_CONNECTION_REQUEST`, `SEND_MESSAGE`, `SEND_INMAIL`, `SCAN_INBOX`, `SCAN_CONNECTIONS`, `SEARCH_PROFILES`, `SYNC_PROFILE`, `WITHDRAW_INVITATION`, `CHECK_ACCOUNT_HEALTH`. See @docs/crm-technical-plan.md Section 5
- **CRM-driven match prioritisation** — every outreach action is expensive (LinkedIn caps ~15 connection requests/day); CRM scores candidates by role fit, skill match, location, recency, prior relationship signals, and response likelihood. Daily budget filter selects top-N targets. See @docs/outreaching-technical-plan.md Section 3
- **Session execution order** — each 30-min session runs: health check → budget check → inbox scan → connection accept check → outreach (ordered by priority) → session report. See @docs/crm-technical-plan.md Section 5.3
- **Stale detection & alerting** — tasks IN_PROGRESS > 1 hour marked stale; escalation from WARNING → ERROR → CRITICAL. Alert model with severity levels and auto-actions (pause, cooldown). See @docs/crm-technical-plan.md Section 5.6
- **Reply classification** — replies classified by Claude as interested / not interested / question / referral / out of office / connection accepted → auto-draft appropriate follow-up → recruiter approves. See @docs/outreaching-technical-plan.md Section 5.4
- AI Matching Engine (scored suggestions only)
- Pipeline suggestions (AI recommends, human executes)
- **Background pipeline agent** — monitors stage triggers; pushes proactive Claude prompts ("Candidate X hasn't been contacted in 7 days")
- Compliance monitoring (automated flagging, human resolution)

### Phase 4+: Progressive Automation (Future)
**Goal:** Reduce verification overhead based on proven performance
- Auto-approve for pre-approved outreach templates (recruiter opts in per template)
- LinkedIn Recruiter API adapter (official InMail for customers with seats)
- Multi-channel outreach: email via Gmail/Outlook OAuth (same task queue model)
- Revenue tracking, advanced analytics
- Human escalation paths for edge cases

---

## 3. High-Level Architecture

### System Layers

1. **MCP Interaction Layer** — Claude as the primary UX surface; natural language → Cura actions
2. **Cowork Execution Layer** — Claude Cowork + Chrome extension controls recruiter's browser for LinkedIn outreach and search; fetches tasks from CRM via MCP, reports results back
3. **Omni-Trigger Subscriptions** — server-side event subscriptions (email, LinkedIn, calls, pipeline, forms)
4. **Core Platform (Cura CRM)** — Source of truth, outreach task queue, rate limiting, approval workflows
5. **Intelligence Layer** — AI sourcing, matching, draft generation; human approval for all high-stakes actions
6. **Governance Layer** — Compliance & audit trails

```text
INTERACTION SURFACE                   CENTRAL HUB (THE BRAIN)              OUTPUTS & ACTIONS (HUMAN-GATED)
====================================  ========================             ====================================

+--------------------------------+                                         +---------------------------------------+
| Claude (MCP Client)            |<--- natural language -----+            | LinkedIn Outreach (Phase 3)           |
| "Find 20 CFOs at Series B..."  |---> MCP tool calls ------>|            | ┌─ Claude Cowork Execution ──┐       |
+--------------------------------+                           |            | │ • Recruiter approves in CRM │       |
                                                             v            | │ • Cowork fetches READY tasks │       |
+--------------------------------+                                        | │ • Chrome ext sends on LI    │       |
| Claude Cowork + Chrome ext     |<--- MCP (fetch tasks) ----+            | │ • Results sync back to CRM  │       |
| (recruiter's own browser)      |---> MCP (report results)->|            | └──────────────────────────────┘       |
+--------------------------------+                           |            +---------------------------------------+
                                                             v                          ^
OMNI-TRIGGER SUBSCRIPTIONS                     +-----------------------+                |
(all server-side, push into Cura)              |     Cura CRM          |----------------+
====================================           |   (Single Source)     |
+----------------------------+                 |                       |
| Email events               |-- auto ------->| - Candidate Profiles  |
| LinkedIn events            |-- auto ------->| - Client Job Orders   |  +----------------------------+
| Call/meeting end events    |-- auto ------->| - Manual Kanban       |->| AI Intelligence Layer      |
| Pipeline staleness scans   |-- auto ------->| - Activity Timeline   |  | • Multi-channel sourcing   |
| Inbound forms / referrals  |-- auto ------->| - Human Decision Log  |  | • Job spec generation      |
+----------------------------+                 | - Outreach Task Queue |  | • Match scoring            |
                                               +-----------^-----------+  | • Outreach drafts          |
+----------------------------+                             |              | • HUMAN APPROVAL REQUIRED  |
| Convenience tools          |                            |              +----------------------------+
| Chrome extension (optional)|-- manual capture --------->|
| AI CV Parser               |-- extract + approve ------>|              +----------------------------+
| Data Enrichment            |-- suggest + approve ------>|              | Compliance & Audit         |
+----------------------------+                            |              | • All Actions Logged       |
                                                          |              | • Human Decision Tracking  |
                                                          +              | • Verification Audit Trail |
                                                                         +----------------------------+

PHASE 1 PRIORITY: CRM CRUD + MCP Server skeleton (Claude can read/write candidates, jobs, clients)
PHASE 2 PRIORITY: Reply detection pipeline (email notifications → inbox scan → CRM staleness nudges)
PHASE 3 PRIORITY: Outreach task queue + MCP tools for Cowork execution + CRM match prioritisation
```

---

## 4. Human Verification Points (Phase 1 Requirements)

### 4.1 Outreach Verification (MANDATORY)
- **LinkedIn Messages:** All connection requests, InMails, and messages require human review and approval in CRM before Claude Cowork executes them
- **Follow-up Sequences:** Each message in sequence needs individual approval
- **Client Communications:** All client-facing messages require manual verification
- **Bulk Actions:** No bulk sending without individual message review (bulk approve available but each draft visible)
- **Execution visibility:** Recruiter can watch Claude Cowork's LinkedIn session and pause/stop at any time

### 4.2 Data Change Verification
- **Profile Updates:** AI suggestions require human approval before saving
- **Enrichment Data:** All enriched fields flagged for human review
- **Pipeline Movements:** Stage changes require manual recruiter confirmation  
- **Job Matching:** AI suggestions displayed, human makes final decision
- **Contact Merging:** Duplicate detection flagged, human resolves conflicts

### 4.3 Decision Gating
- **Candidate Submissions:** Client submissions require "Seal of Approval"
- **Interview Scheduling:** All meeting requests manually reviewed
- **Offer Communications:** Compensation discussions require human oversight
- **Compliance Actions:** GDPR/data requests escalated to human decision
- **Quality Control:** Random audit of AI-generated content

### 4.4 Activity Logging
- **Manual Timeline Updates:** Recruiters log all important interactions
- **Decision Rationale:** Record why AI suggestions were accepted/rejected
- **Performance Tracking:** Log verification time and accuracy
- **Error Documentation:** Track AI mistakes for model improvement

---

## 5. Module Responsibilities (Phase-Aware)

---

### 4.1 Input Channels (Data Ingestion & Sourcing Layer)

#### 4.1.0 Cura MCP Server (Phase 1 — Core Interaction Layer)

**Purpose:** Expose Cura as an MCP server so recruiters can command the platform through Claude in natural language.

**Owns**
- MCP tool definitions for all core entities (candidates, jobs, clients, pipeline stages)
- OAuth handshake for Claude Connectors menu
- Translating Claude tool calls → Cura API mutations
- Returning structured results to Claude (enriched profiles, sourcing lists, draft messages)
- Plan-based rate limits and credit consumption per tool call
- Full audit log of all MCP-originated actions

**Does NOT own**
- Claude model itself
- Data storage (delegates to CRM)
- Matching logic (delegates to Intelligence Layer)

**Key Boundary**
> Claude is the UX surface; Cura MCP is the action and database layer. Every action writes back to the system of record.

---

#### 4.1.1 Chrome Extension (Convenience Tool — Not a Trigger)

**Purpose:** Optional recruiter-initiated tool for manually adding profiles or surfacing Cura context while browsing LinkedIn/Gmail. Not part of the omni-trigger architecture.

**Owns**
- LinkedIn profile page: display candidate's Cura history; one-click "Add to Cura"
- Recruiter-triggered capture from LinkedIn (profile data)
- Recruiter notes capture

**Does NOT own**
- Automated event subscriptions (all triggers are server-side)
- Data storage
- Matching logic
- Outreach sending (drafts only; human approves and sends)

**Key Boundary**
> Convenience only. All automatic event handling is server-side via omni-trigger subscriptions.

---

#### 4.1.2 Candidate Sourcing (Automated)

**Purpose:** Automatically discover and ingest candidates from external sources.

**Example Sources**
- LinkedIn partner feeds / APIs
- Job boards (Indeed, Reed, Totaljobs)
- Talent marketplaces
- GitHub / Stack Overflow  
- Internal talent pools  

**Owns**
- Scheduled crawling & ingestion
- Bulk candidate capture
- Source attribution & deduplication hints
- Normalized candidate payload delivery to CRM

**Does NOT own**
- Canonical storage
- Matching decisions
- Outreach

**Key Boundary**
> Fully automated sourcing; no recruiter action required.

---

#### 4.1.3 Client Job Sourcing (Automated)

**Purpose:** Import and synchronize job demand.

**Owns**
- Job ingestion from APIs/imports
- Structured field extraction
- Hiring manager association
- Status synchronization (open/closed/filled)

**Does NOT own**
- Candidate matching
- Outreach execution
- Compliance enforcement

---

#### 4.1.4 Email & Calendar Sync

**Purpose:** Capture communication history and relationship context.

**Owns**
- Email sync (inbound/outbound)
- Calendar event capture
- Contact association
- Activity timeline generation

**Does NOT own**
- Outreach sequencing
- Data enrichment
- Matching logic

---

## 4.1.5 Meeting Notes Sync (Zoom & Phone Calls)

**Purpose:** Capture structured notes and summaries from meetings and calls.

**Sources**
- Zoom meeting transcripts & summaries  
- VoIP / phone call notes  
- Manual notes captured during calls  
- AI-generated call summaries  

**Owns**
- Meeting transcript ingestion
- AI summarization (if enabled)
- Note-to-contact association
- Key signal extraction (interest level, salary expectations, availability)
- Timeline activity creation

**Does NOT own**
- Outreach automation
- Candidate profile canonical data changes (except notes)
- Matching decisions

**Key Boundary**
> Captures conversational context; does not alter core candidate facts.

---

#### 4.1.5b Post-Call Event Handler (Phase 2 — Omni-Trigger)

**Purpose:** Subscribe to call/meeting end events; automatically enrich candidate profiles and draft follow-up tasks.

**Owns**
- Subscribing to call/meeting end event sources
- Transcript ingestion and AI summarization
- Pushing enriched notes and key signals to candidate profile
- Drafting follow-up task in CRM
- Surfacing pending approval to recruiter

**Does NOT own**
- Outreach sending (always human-approved)
- Pipeline stage changes (always human-confirmed)
- Matching decisions

**Key Boundary**
> Post-call data arrives automatically via subscription; all resulting actions require human approval.

---

#### 4.1.5c Background Pipeline Agent (Phase 3 — Omni-Trigger)

**Purpose:** Monitor CRM pipeline events and push proactive prompts to Claude when recruiter action is required.

**Owns**
- Scheduled scan of pipeline stages and last-contact dates
- Rule evaluation ("no contact in N days", "stage stale for X days")
- Generating proactive Claude prompt with context ("Candidate X at Offer stage — no contact in 7 days. Draft follow-up?")
- Logging agent-triggered events in audit trail

**Does NOT own**
- Taking any action autonomously — all prompts require human response
- Sending messages, updating stages, or altering records without recruiter approval
- Matching logic

**Key Boundary**
> Advisory and notification only. Agent prompts; human decides and acts.

---

#### 4.1.5 AI CV / Resume Parser

**Purpose:** Convert unstructured CVs into structured candidate profiles.

**Owns**
- Text extraction (PDF/DOCX/OCR)
- Skills & experience extraction
- Job title normalization
- Structured candidate payload

**Does NOT own**
- Fit scoring
- Data persistence
- Outreach

---

#### 4.1.6 Web Sourcing Plugins (Data Enrichment)

**Purpose:** Enrich candidate and company records.

**Examples**
- Clearbit
- Meeting notes processors
- Company enrichment APIs

**Owns**
- Contact data enrichment
- Company metadata enrichment
- Confidence scoring for enriched fields

**Does NOT own**
- Primary data capture
- Outreach
- Matching logic

---

### 4.2 Core Platform

#### 5.2.1 Cura CRM (System of Record) - Phase 1 Priority

**Purpose:** Central source of truth and manual workflow engine.

**Phase 1 - Human-Heavy Features**
- **Manual Kanban Board** - Recruiter-controlled pipeline stages
- Candidate profiles with human data entry/review
- Client accounts with manual relationship management
- Job orders with human intake and management
- **Human-verified activity timeline** 
- Data integrity with human conflict resolution
- Access control & permissions
- **Human decision audit trail**

**Phase 2+ - Selective Automation**
- AI-suggested workflow triggers (human approval required)
- Automated deduplication (with human conflict resolution)
- Smart pipeline suggestions (human decides)

**Does NOT own (Any Phase)**
- AI model training
- External enrichment execution
- Direct message delivery (only stores approved drafts)

**Key Principle**
> All modules read/write via CRM APIs. All critical actions require human verification.

---

### 4.3 Intelligence Layer

#### 5.3.1 AI Matching Engine - Advisory Only (Phase 3)

**Purpose:** Provide candidate-job fit intelligence as suggestions only.

**Phase 3 - Advisory Mode**
- Candidate-job similarity scoring (displayed to human)
- Skill vectorization / embeddings
- **Shortlist suggestions** (human makes final selection)
- Match explainability for human review
- **Performance tracking for human decisions**

**Phase 4+ - Selective Automation**
- Auto-shortlist generation for low-stakes scenarios
- Model improvement based on human feedback
- Confidence-based automation thresholds

**Does NOT own (Any Phase)**
- Canonical data storage
- Final matching decisions (always human)
- Outreach execution
- Compliance decisions

**Key Principle**
> Advisory only. Human always has final authority on matches.

---

### 4.4 Execution Layer

#### 5.4.1 LinkedIn Outreach via Claude Cowork (Phase 3)

**Purpose:** Execute LinkedIn engagement with mandatory human approval, using Claude Cowork as the execution layer.

**Phase 1-2 - Manual Only**
- **Human writes all messages**
- Manual sending through LinkedIn directly
- Activity logged manually in CRM

**Phase 3 - AI Draft + Human Approval + Cowork Execution**
- **AI drafts LinkedIn messages** (connection requests, InMails, direct messages) via Claude MCP
- **Mandatory human review and edit in CRM** (outreach task queue with approval flow: DRAFT → PENDING_APPROVAL → READY)
- **Recruiter approves drafts** → tasks marked READY
- **Claude Cowork + Chrome extension executes** — fetches READY tasks from CRM via MCP, sends from recruiter's own browser/LinkedIn session
- **Rate limiting enforced by CRM** — Cura limits well below LinkedIn thresholds (70 conn requests/week, 15/day, 40 messages/day, 200 profile views/day). 4-week warm-up for new accounts (3 → 5 → 10 → full). See @docs/outreaching-technical-plan.md Section 4.5–4.6
- **Full task type coverage** — connection requests, messages, InMails, inbox scan, connection scan, invitation withdrawal, profile search, profile sync, account health check
- **MCP tools for Cowork** — `getTasks`, `claimTask`, `completeTask`, `failTask`, `reportReply`, `reportConnectionAccepted`, `getOutreachBudget`, `checkAccountHealth`, `reportSessionSummary`. See @docs/crm-technical-plan.md Section 5.4
- **Session audit trail** — `CoworkSession` model logs tasks attempted/completed/failed/skipped, replies found, connections accepted, budget snapshots. See @docs/crm-technical-plan.md Section 5.8
- Follow-up sequence drafts (each message approved individually)
- **Reply detection pipeline** — three mechanisms: (1) LinkedIn email notifications → Cura email subscription (Phase 2), (2) scheduled inbox scan every 30 min, (3) CRM staleness nudges. See @docs/outreaching-technical-plan.md Section 5
- See @docs/outreaching-technical-plan.md for full technical design

**Recruiter Onboarding Requirements (Phase 3)**
- Claude Max subscription ($100–200/mo) — required for Cowork + Chrome extension
- Claude for Chrome extension installed
- LinkedIn Premium / Sales Nav / Recruiter — free accounts limited to ~5 personalised notes/month
- 150+ LinkedIn connections — below this, LinkedIn flags activity
- No other automation tools running (Dux-Soup, LinkedHelper increase detection risk)
- See @docs/outreaching-technical-plan.md Section 6

**Phase 4+ - Selective Automation**
- Auto-approve for pre-approved templates (recruiter opts in)
- LinkedIn Recruiter API adapter (for customers with seats — official InMail)
- Multi-channel: email outreach via Gmail/Outlook OAuth

**Does NOT own (Any Phase)**
- Candidate storage
- Matching logic
- Sending without human approval (Cowork only executes READY tasks)
- Consent policy definition

**Key Principle**
> CRM is the brain (drafts, approvals, rate limits). Cowork is the hands (browser execution). Recruiter approves; Cowork sends.

---

### 4.5 Governance Layer

#### 4.5.1 Compliance & Analytics

**Purpose:** Ensure regulatory compliance and provide reporting.

**Owns**
- Consent tracking
- Data retention policies
- Right-to-be-forgotten workflows
- Audit logs
- GDPR/CCPA reporting
- Compliance dashboards

**Does NOT own**
- Core data modeling
- Outreach logic
- Matching logic

**Key Principle**
> Defines rules; CRM executes enforcement.

---


## 5. Strategic Architectural Principles

### 5.1 CRM as the Canonical "Source of Truth"
* **Centralized Persistence:** No peripheral module (Plugin, Extension, or Sourcing Bot) shall maintain an independent database of candidate or job records.
* **API-First Ingestion:** All external data points must flow through the Core CRM APIs to ensure schema validation, automated deduplication, and immediate platform-wide availability.

### 5.2 Decoupling Manual vs. Automated Sourcing
* **High-Touch (LinkedIn Extension):** Reserved for recruiter-led, bespoke headhunting. It focuses on human intuition and the "clipping" of high-value passive talent into specific projects.
* **High-Volume (Automated Pipelines):** Dedicated to "always-on" background ingestion. This layer populates the top-of-funnel via Job Boards, Crawlers, and partner APIs without requiring manual recruiter intervention.

### 5.3 "AI-Augmented, Human-Verified" Workflow
* **Heavy Lifting by AI:** The AI layer is responsible for most of the initial works.
* **Human Gatekeeping:** For high-stakes milestones (e.g., submitting a candidate to a client, moving to the "Offer" stage or sending an important message), the system requires a manual recruiter "Verify & Commit" to ensure quality control. Also, maintaining the "personal touch" is expected in executive search. AI should help human to make that touch easily.

### 5.4 Comprehensive Context Tracking (The "Memory" Principle)
* **Zero-Loss Engagement:** Every interaction—from a LinkedIn message and an email open to a transcribed Zoom call—must be timestamped and attached to the candidate or client timeline.
* **Intelligence Feedback Loop:** The more granular the context (e.g., “Candidate expressed interest in remote-first roles during the call”), the more accurately the Intelligence Layer can predict future placement success.


---

## 6. Phase-by-Phase Workflows

### 6.1 Phase 1: CRM + MCP Foundation Flow

1. **Recruiter opens Claude** — types "Show me all candidates at Offer stage" or "Add John Smith, CFO at Acme, to pipeline"
2. **Cura MCP executes** — reads/writes CRM via tool calls, returns result to Claude conversation
3. Fallback: **manually capture profile** via LinkedIn Extension → human reviews → save to CRM
4. **Human decides pipeline stage** and logs activity

### 6.2 Phase 2: Omni-Trigger Flow

**Email event:** Inbound email arrives → Cura classifies, enriches from CRM → Claude drafts reply or creates task → **human approves → sends**

**Post-call event:** Call/meeting ends → Cura ingests transcript → auto-enriches candidate profile → drafts follow-up task → **human reviews and approves**

**LinkedIn reply detection (via email):** Candidate replies on LinkedIn → LinkedIn emails recruiter → Cura email subscription captures it → classifier detects LinkedIn notification → matches sender to CRM candidate by LinkedIn URL → creates reply record + dashboard notification → next Cowork session reads full message content

**LinkedIn event:** LinkedIn activity detected (InMail reply, connection accepted) → Cura identifies candidate, pulls CRM context → Claude classifies reply (interested / not interested / question / referral / out of office) → drafts appropriate next action → **human approves**

**Pipeline staleness:** Scheduled scan detects idle candidates → Claude generates proactive nudge with context → **human reviews and acts**. Escalation: 48h no reply = informational note; 7+ days = auto-draft follow-up; connection accepted with no follow-up = auto-draft pitch

### 6.3 Phase 3: Sourcing-First Flow (Headhunter)

1. **Client brief arrives** → email subscription or MCP command creates job draft in Cura
2. **Claude: "Generate spec for CFO role at Series B fintech"** → Cura generates full job spec → **human reviews**
3. **Claude: "Source 20 candidates for this role"** → Cura MCP executes search (PDL, ContactOut, internal DB) + Claude Cowork searches LinkedIn directly → returns enriched list
4. **CRM match scoring ranks candidates** — role fit, skill match, location, recency, prior relationship, response likelihood → ranked list with match percentages
5. **Human reviews shortlist** → dashboard shows "Today's Outreach Queue (15 of 43 candidates)" with match scores → **recruiter approves selection**
6. **Claude: "Draft outreach for shortlisted candidates"** → Cura drafts personalised LinkedIn messages → **human reviews each → approves in CRM** → tasks marked READY
7. **Recruiter opens Cowork: "Do my LinkedIn outreach"** → Cowork runs session: health check → budget check → inbox scan → connection check → outreach in priority order → session report → **results synced back to CRM**
8. **Reply arrives** → detected via email notification (Phase 2) or inbox scan → classified → follow-up auto-drafted → **recruiter approves** → queued for next session
9. **Background agent monitors pipeline** → proactive Claude prompt when follow-up is due → **human acts**

### 6.4 LinkedIn Outreach Execution Flow (Phase 3+)

```
PREPARATION (in Cura CRM)                    EXECUTION (Claude Cowork — every 30 min)
══════════════════════════                    ══════════════════════════════════════════

1. CRM scores candidates by match fit
2. AI drafts personalised messages ─────────────────────────────────┐
3. Recruiter reviews ranked queue:                                   │
   "Today's Outreach (15 of 43) — #1 Sarah Chen 94%..."             │
4. Recruiter clicks "Approve"                                        │
   → Task status: DRAFT → PENDING_APPROVAL → READY                  │
                                                                     │
                                              5. Recruiter opens Chrome + Cowork
                                              6. "Do my LinkedIn outreach"
                                              7. Session starts:
                                                 a. CHECK_ACCOUNT_HEALTH → if restricted, stop
                                                 b. getOutreachBudget() → if limit reached, skip outreach
                                                 c. SCAN_INBOX → new replies? classify & sync to CRM
                                                 d. SCAN_CONNECTIONS → accepted? create follow-up tasks
                                                 e. WITHDRAW_INVITATION → clear stale pending (3+ weeks)
                                                 f. SEND_CONNECTION_REQUEST → highest priority first
                                                 g. SEND_MESSAGE → follow-ups to connections
                                                 h. SEND_INMAIL → top targets (scarce credits)
                                                 i. SEARCH_PROFILES → sourcing (if budget allows)
                                                 j. SYNC_PROFILE → refresh stale CRM data
                                              8. Random 30s–3min delay between actions
                                              9. Each action → MCP: claimTask → completeTask/failTask
                                             10. reportSessionSummary → "16/18 sent. 2 skipped."

FOLLOW-UP (back in Cura CRM)
════════════════════════════
11. Reply detected via: (a) LinkedIn email notification → Cura email sub, or (b) next inbox scan
12. Claude classifies reply → interested / question / referral / not interested / OOO
13. Auto-drafts follow-up → recruiter approves → queued for next session
14. Stale task detection: IN_PROGRESS > 1hr → WARNING → offer Retry/Cancel
```

---

## 7. Non-Goals

- Company internal ATS system
- Payroll or HRIS functionality
- Autonomous AI hiring decisions
