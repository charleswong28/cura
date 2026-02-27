# Project overview

Cura is an AI-augmented recruitment platform designed to evolve from a high-touch "System of Record" to an autonomous "System of Intelligence." The project follows a strict phased rollout: establishing a rock-solid CRM core first, followed by incremental AI layers where humans remain the authoritative gatekeepers for every interaction until the system demonstrates reliable outcomes.

### Design Principles (Aligned with North Star)

- **AI first, human verify** — AI handles administrative work, humans gate all critical decisions
- **Zero-Loss Engagement Memory** — Every interaction captured and contextualized 
- **Single Responsibility per Module** — Clear boundaries and ownership
- **Compliance by design** — Built-in audit trails and transparent logic
- **"AI Runs the ATS. You Close the Deal."** — AI handles the administrative heavy lifting so recruiters focus on the only thing that closes deals: human connection

### Implementation Philosophy

**Phase-by-Phase Approach:** Start with maximum human verification and gradually reduce oversight based on proven performance. No automation without demonstrated reliability.

---

## 2. Implementation Phases

### Phase 1: Core CRM Foundation (Human-Heavy)
**Goal:** Establish rock-solid system of record with full human control
- Manual Kanban board for pipeline management
- Basic CRUD operations (candidates, clients, jobs)
- **Human verification gates for ALL outreach**
- Activity timeline with manual logging
- Simple AI suggestions (human decides everything)

### Phase 2: Input Channels (Selective Automation) 
**Goal:** Add data ingestion with human oversight
- LinkedIn Extension (manual capture + human review)
- Email/Calendar sync (automated logging, human verification)
- CV Parser (AI extracts, human approves changes)
- Enrichment workflows (AI suggests, human approves)

### Phase 3: Intelligence Layer (Advisory Only)
**Goal:** AI recommendations with mandatory human approval
- AI Matching Engine (scored suggestions only)
- Draft generation (AI writes, human reviews/edits ALL messages)
- Pipeline suggestions (AI recommends, human executes)
- Compliance monitoring (automated flagging, human resolution)

### Phase 4+: Gradual Automation (Future)
**Goal:** Reduce verification based on proven performance
- Progressive removal of verification requirements
- Selective autonomous actions for low-risk operations
- Human escalation paths for edge cases

---

## 3. High-Level Architecture

### System Layers

1. **Input Channels** — Data ingestion, sourcing, enrichment  
2. **Core Platform (Cura CRM)** — Source of truth & manual workflows  
3. **Intelligence Layer** — AI suggestions & advisory scoring  
4. **Execution Layer** — Human-verified outreach automation  
5. **Governance Layer** — Compliance & audit trails  

```text
INPUT CHANNELS (HUMAN-VERIFIED)                    CENTRAL HUB (THE BRAIN)              OUTPUTS & ACTIONS (HUMAN-GATED)
====================================               ========================             ====================================

+--------------------------------+                                              +---------------------------------------+
| LinkedIn Chrome Extension      |-- Manual Capture ---+                        | Human-Verified Outreach               |
| (Recruiter Manual Selection)   |  + Human Review     |                        | ┌─ Draft Review Required ─┐          |
+--------------------------------+                     |                        | │ • Email Review & Approve │          |
                                                       v                        | │ • LinkedIn Msg Review    │          |
+----------------------------+                      +-----------------------+    | │ • Manual Send Action     │          |
| Email & Calendar Sync      |-- Auto Log --------->|     Cura CRM          |----| └─────────────────────────┘          |
| (Activity Capture Only)    |   Human Verify       |   (Single Source)     |    +---------------------------------------+
+----------------------------+                      |                       |                    ^
                                                    | - Candidate Profiles  |                    |
+----------------------------+                      | - Client Job Orders   |                    |
| Meeting & Call Sync        |- Notes Capture ----->| - Manual Kanban       |      +----------------------------+
| (Transcript + Human Notes) |   Human Review       | - Activity Timeline   |----->| AI Advisory Layer          |
+----------------------------+                      | - Human Decision Log  |      | • Scoring Suggestions      |
                                                    +-----------------------+      | • Match Recommendations    |
+----------------------------+                      ^                              | • HUMAN APPROVAL REQUIRED  |
| AI CV Parser               |-- Extract Data ------+                              +----------------------------+
| ┌─ Human Review Required ─┐|   Human Approve      |     
| │ All changes must be     │|                      |                             +----------------------------+
| │ reviewed before saving  │|                      |                             | Compliance & Audit         |
| └─────────────────────────┘|                      |                             | • All Actions Logged       |
+----------------------------+                      |                             | • Human Decision Tracking  |
                                                    |                             | • Verification Audit Trail |
+----------------------------+                      |                             +----------------------------+
| Data Enrichment            |-- Suggest Changes ---+
| ┌─ Approval Required ─────┐|   Human Approve
| │ No auto-application of  │|
| │ enriched data           │|
| └─────────────────────────┘|
+----------------------------+

PHASE 1 PRIORITY: Manual Kanban + Human-Gated Actions
```

---

## 4. Human Verification Points (Phase 1 Requirements)

### 4.1 Outreach Verification (MANDATORY)
- **Email Drafts:** Every email must be reviewed and manually approved before sending
- **LinkedIn Messages:** All InMail/connection requests require human review and edit
- **Follow-up Sequences:** Each message in sequence needs individual approval
- **Client Communications:** All client-facing messages require manual verification
- **Bulk Actions:** No bulk sending without individual message review

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

#### 4.1.1 LinkedIn Chrome Extension (Manual / Semi-Automated Sourcing)

**Purpose:** Enable recruiters to manually / semi-automatically source candidates from LinkedIn.

**Owns**
- Scraping visible profile data
- Recruiter-triggered capture
- Semi-automated bulk extraction
- Recruiter notes capture
- Triggering candidate create/update in CRM

**Does NOT own**
- Automated sourcing pipelines
- Data storage
- Matching logic
- Outreach automation

**Key Boundary**
> Human-in-the-loop sourcing only.

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

#### 5.4.1 Human-Verified Outreach (Phase 3)

**Purpose:** Execute engagement with mandatory human approval.

**Phase 1-2 - Manual Only**
- **Human writes all messages**
- Manual sending through existing tools
- Activity logged manually in CRM

**Phase 3 - AI Draft + Human Approval**
- **AI drafts messages (LinkedIn, Email)**
- **Mandatory human review and edit**
- **Manual approval required before sending**
- Personalization suggestions (human selects)
- Follow-up sequence drafts (each message approved individually)
- Delivery tracking (opens, replies)

**Phase 4+ - Selective Automation**  
- Auto-send for pre-approved templates only
- Human approval for important communications
- Confidence-based automation rules

**Does NOT own (Any Phase)**
- Candidate storage
- Matching logic  
- Automatic sending without human approval
- Consent policy definition

**Key Principle**
> AI drafts, human verifies, human sends. No autonomous outreach.

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

### 6.1 Phase 1: Manual Candidate Sourcing Flow (Human-Heavy)

1. **Recruiter manually captures profile** via LinkedIn Extension
2. **Human reviews all captured data** before saving 
3. **Manual data entry/correction** in CRM
4. **Human decides pipeline stage** placement
5. **Manual activity logging**

### 6.2 Phase 2: Semi-Automated Sourcing Flow (Human Oversight)

1. Automated sourcing suggests candidates
2. **Human reviews all suggestions** before import
3. **Human approves data changes** from enrichment
4. **Manual pipeline stage assignment**
5. AI suggests job matches → **Human decides**

### 6.3 Phase 3: AI-Assisted Flow (Human Verification)

1. AI auto-imports candidates → **Human reviews conflicts**
2. AI suggests enrichment → **Human approves changes**
3. AI generates job match scores → **Human makes decisions**
4. **AI drafts outreach → Human reviews every message**
5. **Human manually sends all communications**

### 6.4 Human-Verified Outreach Flow (All Phases)

1. **AI drafts message** (Phase 3+) OR **Human writes** (Phase 1-2)
2. **Mandatory human review and edit**
3. **Human clicks "Approve & Send"**
4. **System logs human decision + message content**
5. **Activity automatically synced to timeline**
6. **Human tracks responses and updates pipeline**

---

## 7. Non-Goals

- Company internal ATS system
- Payroll or HRIS functionality
- Autonomous AI hiring decisions
