# Project overview

Cura is an AI-augmented recruitment platform designed to evolve from a high-touch "System of Record" to an autonomous "System of Intelligence." The project follows a strict phased rollout: establishing a rock-solid CRM core first, followed by incremental AI layers where humans remain the authoritative gatekeepers for every interaction until the system demonstrates reliable outcomes.

### Design Principles

- **AI first, human verify**
- **Single Responsibility per Module**
- **Compliance by design**

---

## 2. High-Level Architecture

### Layers

1. **Input Channels** — Data ingestion, sourcing, enrichment  
2. **Core Platform (Cura CRM)** — Source of truth & workflows  
3. **Intelligence Layer** — AI matching & scoring  
4. **Execution Layer** — Outreach automation  
5. **Governance Layer** — Compliance & reporting  

```text
INPUT CHANNELS (PLUGINS & APIS)                    CENTRAL HUB (THE BRAIN)              OUTPUTS & ACTIONS
===============================                   ========================             ==================

+--------------------------------+                                              +---------------------------------------+
| LinkedIn Chrome Extension      |-- Scrapes Profiles ----+                     | Automated Client & Candidate Outreach |
| (Manual / Semi-auto Sourcing ) |                        |                     | (LinkedIn / Email / SMS Sequences)    |
+--------------------------------+                        |                     +---------------------------------------+
                                                          v                               ^
+----------------------------+                      +-----------------------+             |
| Email & Calendar Sync      |-- Logs Activities -->|     Cura CRM          |-------------+
| (Outlook / Gmail API)      |                      |   (Core Database)     |
+----------------------------+                      |                       |
                                                    | - Candidate Profiles  |      +----------------------------+
+----------------------------+                      | - Client Job Orders   |----->| AI Matching Engine         |
| Meeting & Call Sync        |- Transcripts/Notes ->| - Kanban Pipelines    |      | (Best-Fit Scoring)         |
| (Zoom / Otter.ai)          |                      | - Contact History     |      +----------------------------+
+----------------------------+                      +-----------------------+
                                                      ^                     |
+----------------------------+                        |                     v
| AI CV / Resume Parser      |-- Extracts Data -------+                     +----------------------------+
| (PDF / DOCX Uploads)       |                        |                     | Compliance & Analytics     |
+----------------------------+                        |                     | (GDPR / CCPA / Audit)      |
                                                      |                     +----------------------------+
+----------------------------+                        |
| Web Sourcing & Enrichment  |-- Data Enrichment -----+
| (ZoomInfo / Clearbit)      |                        |
+----------------------------+                        |
                                                      |
+----------------------------+                        |
| Automated Job Sourcing     |-- Market Demand -------+
| (Job Board APIs / Crawlers)|
+----------------------------+
```

---


## 4. Module Responsibilities

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

#### 4.2.1 Cura CRM (System of Record)

**Purpose:** Central source of truth and workflow engine.

**Owns**
- Candidate profiles
- Client accounts
- Job orders
- Pipelines & stages
- Contact history & activity timeline
- Data integrity & deduplication
- Access control & permissions
- Workflow triggers (e.g., new job → trigger matching)

**Does NOT own**
- AI model training
- External enrichment
- Message delivery infrastructure

**Key Principle**
> All modules read/write via CRM APIs.

---

### 4.3 Intelligence Layer

#### 4.3.1 AI Matching Engine

**Purpose:** Provide candidate-job fit intelligence.

**Owns**
- Candidate-job similarity scoring
- Skill vectorization / embeddings
- Shortlist generation
- Match explainability
- Model improvement pipeline

**Does NOT own**
- Canonical data storage
- Outreach execution
- Compliance decisions

**Key Principle**
> Advisory, not authoritative.

---

### 4.4 Execution Layer

#### 4.4.1 Automated Client & Candidate Outreach

**Purpose:** Execute engagement across channels.

**Channels**
- LinkedIn messaging
- Email sequences

**Owns**
- Multi-step outreach sequences
- Personalization tokens
- Follow-up scheduling
- Delivery tracking (opens, replies)
- Sequence performance metrics

**Does NOT own**
- Candidate storage
- Matching logic
- Consent policy definition

**Key Principle**
> Executes engagement; CRM records history.

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

## 6. Core Workflows

### 6.1 Manual Candidate Sourcing Flow

1. Recruiter captures profile via LinkedIn Extension.
2. Data sent to CRM API.
3. CRM deduplicates & stores record.
4. Enrichment enhances profile.
5. AI evaluates job fit.

---

### 6.2 Automated Candidate Sourcing Flow

1. Candidate Sourcing pipelines ingest candidates.
2. Normalized data sent to CRM.
3. CRM deduplicates & stores.
4. Enrichment enhances profile.
5. AI evaluates fit.

---

### 6.3 Job Intake Flow

1. Client Job Sourcing imports job.
2. CRM stores job order.
3. AI Matching generates shortlist.
4. Recruiter reviews & triggers outreach.

---

### 6.4 Outreach Flow

1. Recruiter initiates outreach in bulk.
2. Outreach module sends sequences.
3. Engagement events synced to CRM.
4. Human-in-the-loop for important verification.

---

## 7. Non-Goals

- Company internal ATS system
- Payroll or HRIS functionality
- Autonomous AI hiring decisions
