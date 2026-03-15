# **Cura: The AI-First North Star for Human-Centric Recruitment**

**Mission Statement:** To eliminate the administrative tax of recruitment through autonomous AI, freeing recruiters to focus on the only thing that actually closes deals: human connection.

## ---

**1\. Core Design Principles**

### **1.1 Dual Interaction Surface: CRM Web App + Claude MCP**

Cura has two first-class ways to work:

| Surface | Best for |
|---|---|
| **CRM web app** (`app.cura.com`) | Structured pipeline management, bulk review, dashboards, settings — anything that benefits from a persistent visual interface |
| **Claude via MCP** | Ad-hoc commands, sourcing runs, drafting outreach, quick lookups — anything faster to say than to click |

Both write to the same system of record. Recruiters choose the right tool for the moment. The MCP model mirrors Apollo.io's deployment: Claude becomes an execution surface; Cura is the database and action layer.

* **MCP Workflow:** "Find 20 CFOs at Series B fintech in London" → Cura executes multi-channel search, returns enriched profiles, queues personalised outreach — all inside a Claude conversation.
* **Governance:** Plan-based credit limits, no destructive bulk operations, full audit trail. Every MCP action writes back to the CRM.

### **1.2 Omni-Trigger — Subscribe to Everything, Act Automatically**

Cura subscribes to every recruitment-relevant event source so Claude can work autonomously. The recruiter's only required touch is the **final approval step**. No clicking, no tab-switching — events flow into Cura, Claude decides what to do, and the recruiter approves.

**Event sources Cura subscribes to:**

| Event | What Claude does | Recruiter touch |
|---|---|---|
| **Inbound email** (candidate reply, client brief, referral) | Classify, enrich from CRM, draft reply or create task | Review → approve |
| **LinkedIn activity** (InMail reply, connection accepted, message) | Identify candidate, pull CRM context, draft next action | Review → approve |
| **New candidate sourcing** (scheduled runs) | Search all channels, enrich & deduplicate, score fit, surface shortlist | Review shortlist → approve outreach |
| **Post-call** (call ends) | Transcribe, extract signals, update candidate profile, draft follow-up | Review → approve |
| **Pipeline staleness** (scheduled scan) | Generate proactive nudge with context and drafted action | Review → approve |
| **Inbound form / referral** | Create candidate record, draft acknowledgement | Review → approve |

**Principle:** Cura is the always-on subscriber. Claude is the autonomous actor. The recruiter is the final approver. No trigger requires the recruiter or Claude to initiate — all events are pushed into the system by server-side subscriptions.

A Chrome extension may exist as a **convenience tool** for recruiter-initiated additions (e.g., pinning a LinkedIn profile to Cura while browsing), but it is not part of the trigger architecture.

### **1.3 Sourcing-First, Pipeline-Ready**

The entry point is the spec (or even a job title). Cura generates the full job spec, searches all channels simultaneously, and builds the candidate list before the recruiter has opened a second tab. Once candidates are in, pipeline management and zero-loss memory serve the follow-through.

* **For the headhunter (Herman persona):** spec → search → outreach is the entire value proposition.
* **For the pipeline-manager persona:** the same sourcing engine feeds a structured CRM with stage tracking, client management, and revenue reporting.
* **Core capability stack:** job spec generation, multi-channel sourcing (LinkedIn, PDL, ContactOut, internal DB), one-click outreach (email / InMail / WhatsApp), pipeline tracking (sourced → placed), client management, communications log, calendar & scheduling, revenue tracking.

### **1.4 Auto-Enrichment as Default**

Every search automatically updates existing profiles — no stale duplicates. External data sources (PDL, Lusha, LinkedIn) continuously sync to the local database. The BYOK model lets firms supply their own API keys (already in schema), keeping data costs transparent and under recruiter control.

## ---

**2\. Competitive Intelligence: US/EU Market (2026)**

| Competitor | Core Strength | Critical Weakness (The "Manual" Trap) |
| :---- | :---- | :---- |
| **Apollo.io** | **MCP-native GTM execution:** Deployed MCP server; `Search → Enrich → Contact → Sequence` runs entirely inside Claude. 210M+ contact database. | **Sales-only:** Built for SDRs and AEs. No headhunting workflows, no placement tracking, no candidate experience. Cura is Apollo for recruitment. |
| **Loxo** | **Talent Intelligence:** Combines CRM/ATS with a 1.2B profile database. | **Manual Deal Flow:** Underlying legacy architecture limits deep integration; users report clunky deal-board management. No MCP / Claude integration. |
| **Recruit CRM** | **User Satisfaction:** Extremely easy setup and intuitive Kanban interface for SMBs. | **Scalability & Lock-in:** Limited custom reporting and data export risks for larger firms. No AI sourcing. |
| **Bullhorn** | **Enterprise Stability:** The industry standard for large staffing firms. | **Legacy Lag:** Lacks native webhooks, making real-time AI automation and modern "autonomous" flows impossible. |
| **Gem** | **Outbound Mastery:** Elite multi-channel outreach and analytics. | **Cost-Prohibitive:** Seat costs of up to $4,000/yr make it inaccessible for boutique firms. |
| **LinkedIn** | **Signal Data:** Unparalleled access to 1B+ members and "intent" signals. | **Context Blindness:** Frequently fails on role nuance (e.g., confusing M\&A Directors with Film Directors).5 No system-of-record or pipeline layer. |

## ---

**3\. Strategic Moats & Market Entry**

### **3.1 The "Superhuman" UI Philosophy**

Cura is positioned as the fastest recruitment experience ever built, mirroring the **Superhuman** philosophy of "speed, zero clutter, and keyboard-first fluidity".

* **Aesthetic Speed:** A minimalist, keyboard-first interface that eliminates the excessive clicking endemic to legacy tools — 11 clicks to move a candidate in most ATS tools; Cura does it in one.

### **3.2 Compliance by Design (The Regulatory Moat)**

With the **EU AI Act** enforcing high-risk standards for recruitment AI on **August 2, 2026**, Cura’s built-in audit trails and transparent logic provide a defensive moat against bias-related lawsuits currently facing incumbents.

### **3.3 Relationship-Led Sourcing**

Cura uses AI to draft personalized messages that adapt to the recruiter's unique voice. This preserves the "personal touch" expected in high-end search while operating at the speed of an AI agent.6

---

**4\. Pricing Strategy (Freemium + AI Credits + Seat Tiers)**

### Model: Freemium → PLG → Seat expansion

Agencies test tools before switching; no dominant freemium model exists in the recruitment CRM space; AI cost structure must be throttled. This model enables product-led growth while keeping unit economics safe.

| Tier | Price | Target | AI Credits/mo | Key Limits |
| :--- | :--- | :--- | :--- | :--- |
| **Free** ("Solo Recruiter") | £0 | Individual recruiters, adoption | 500 | 1 seat, 50 candidates, 1 active job, Cura branding |
| **Starter** ("Boutique") | £149 /user/mo | Boutique agencies | 3,000 | Unlimited jobs, email & LinkedIn sync, basic automations |
| **Pro** ("Scaling Agency") | £199 /user/mo | Scaling agencies | 10,000 | Autonomous pipeline agents, zero-loss memory, voice & meeting summaries |
| **Enterprise** | Custom | Large staffing firms | Unlimited (fair use) | EU AI Act audit trails, dedicated infra, SLA |

### AI Credit Model
- Cost per AI action is visible to the user (builds trust, mirrors OpenAI usage billing)
- Credits roll over (encourages retention)
- Top-ups available: £10 per 1,000 credits
- Background tasks use cheaper models; foreground actions use full models — avoids runaway cost

### Internal Credit Discount Structure (not customer-facing)
Included credits are provided at a discount vs the public top-up rate of £10/1,000:

| Plan | Credits included | Effective rate | Saving vs top-up |
| :--- | :--- | :--- | :--- |
| Free | 500 | — (no comparable top-up value) | — |
| Starter (Boutique) | 3,000 | £9/1,000 | 10% |
| Pro (Scaling Agency) | 10,000 | £8/1,000 | 20% |
| Enterprise | Unlimited (fair use) | — | — |

- The 20% discount is exclusive to Pro — used as a tier upgrade lever, not disclosed publicly
- Effective rates inform cost-of-goods modelling; do not surface on pricing page or in sales materials

### Positioning Advantages
- **Competitors**: Loxo Basic $169/seat/mo (~£133), Recruit CRM ~$85/user/mo, Gem up to $4,000/seat/yr — priced at a premium above Loxo, positioned as the AI-first category leader rather than a budget alternative
- Freemium enables bottom-up viral adoption; agencies share tools laterally
- Credit model makes AI value measurable ("X credits consumed = Y hours saved") — builds trust before upsell
- Recruiter behavior: test on side, resist long sales cycles, value immediate ROI → PLG fits perfectly

### Risk Mitigations
| Risk | Mitigation |
| :--- | :--- |
| AI cost explosion on Free | Hard credit cap, async batch processing, cheaper models for background tasks |
| Undervaluing AI | ROI dashboards; "credits consumed vs hours saved" UI |
| Free tier abuse | Candidate/job limits; Cura branding removes margin for white-labelling |

---

**Positioning Hook:** "Recruit from wherever work happens. Claude handles the rest."

**The Narrative:** A client sends a brief. You tell Claude. Within minutes, Cura has generated the job spec, searched LinkedIn, PDL, and your internal database, and drafted personalised outreach for 20 candidates — without switching tabs. When a reply lands in Gmail, your Chrome extension surfaces the candidate's full history. When a call ends, Cura transcribes it and updates the record automatically. The pipeline tracks itself. You stay in the conversation.

#### **Works cited**

1. Best AI Recruiting Software Tools for 2026 \- Humanly, accessed on February 22, 2026, [https://www.humanly.io/blog/best-ai-recruiting-software-tools-2026](https://www.humanly.io/blog/best-ai-recruiting-software-tools-2026)  
2. Best Recruitment CRM for Agencies in 2026: An Honest ..., accessed on February 22, 2026, [https://automindz-solutions.com/blog/best-recruitment-crm-for-agencies-2026](https://automindz-solutions.com/blog/best-recruitment-crm-for-agencies-2026)  
3. The Enterprise Learning Tech Market Quickly Transforms Around AI ..., accessed on February 22, 2026, [https://joshbersin.com/2026/02/the-enterprise-learning-tech-market-quickly-transforms-around-ai/](https://joshbersin.com/2026/02/the-enterprise-learning-tech-market-quickly-transforms-around-ai/)  
4. The Talent Acquisition Revolution: How AI is Transforming ..., accessed on February 22, 2026, [https://joshbersin.com/talent-acquisition-revolution/](https://joshbersin.com/talent-acquisition-revolution/)  
5. LinkedIn Hiring Assistant : r/recruiting \- Reddit, accessed on February 22, 2026, [https://www.reddit.com/r/recruiting/comments/1ocqagi/linkedin\_hiring\_assistant/](https://www.reddit.com/r/recruiting/comments/1ocqagi/linkedin_hiring_assistant/)  
6. 'It's a miraculous solution for recruiters': LinkedIn Hiring Assistant redefines recruitment in 2026 | Human Resources Director, accessed on February 22, 2026, [https://www.hcamag.com/asia/specialisation/hr-technology/its-a-miraculous-solution-for-recruiters-linkedin-hiring-assistant-redefines-recruitment-in-2026/557480](https://www.hcamag.com/asia/specialisation/hr-technology/its-a-miraculous-solution-for-recruiters-linkedin-hiring-assistant-redefines-recruitment-in-2026/557480)  
7. 2026 LinkedIn Hiring Release | Join the Talent Community to ask Recruiter or LinkedIn Learning questions, find answers, discover best practices, and share product ideas., accessed on February 22, 2026, [https://tcommunity.linkedin.com/product-updates/2026-linkedin-hiring-release-2275](https://tcommunity.linkedin.com/product-updates/2026-linkedin-hiring-release-2275)