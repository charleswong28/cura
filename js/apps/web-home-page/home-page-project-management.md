# Cura — Marketing Home Page: V2 Rework

## Project Status: 🔄 In progress (21 tasks: HP-064 to HP-084)

**Goal:** Rework the home page selling points to match the evolved product direction. The original V1 (63 tasks, all shipped) is archived in `home-page-v1-archived.md`.

**Positioning Hook:** _"Your AI Recruiter. Ready in 5 Minutes."_
**Target Reader:** Boutique and mid-market recruitment agency owners/leads frustrated by legacy ATS clutter (Bullhorn, Loxo).

> **Rework rationale (2026-03-20):** The V1 page positioned Cura as "an AI-first ATS that saves clicks." The product has evolved into an AI recruiter that works autonomously — sourcing, outreaching, following up — while the human focuses on relationship work. Customers don't care about technical architecture (MCP, dual surfaces, omni-triggers). They care about the outcome: **an AI recruiter that's ready in 5 minutes and does outreach for you.** Auto CRM update is the secondary selling point — it frees recruiters to focus on relationships. Inspired by [nume.ai](https://www.nume.ai/) positioning ("Onboard Your AI CFO In 5 Minutes") — AI as a team member, not a tool.

---

## New Competitive Gaps (added to V1 intelligence)

| Gap                                 | Why it matters                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5-minute AI recruiter setup**     | No competitor positions as "onboard an AI team member." All require extensive configuration and manual operation.                                                  |
| **Automated personalised outreach** | Competitors either blast templates or require manual sending. Cura drafts personalised messages from CRM data and sends from the recruiter's own browser.          |
| **LinkedIn-safe by design**         | All automation tools use detectable infrastructure (data centre IPs, headless browsers). Cura runs in the recruiter's real Chrome — indistinguishable from manual. |
| **Self-updating CRM**               | Competitors require manual data entry. Cura captures every signal (email, LinkedIn, calls) automatically — the CRM maintains itself.                               |

---

## EPICs

### EPIC-HP-009: Hero Rework — AI Recruiter Positioning

**Objective:** Reposition the hero from "AI ATS" to "your AI recruiter that's ready in 5 minutes." Position Cura as a team member (like Nume's "AI CFO"), not a tool. The speed promise is the hook.
**Priority:** P0 — first impression drives the entire page narrative

### EPIC-HP-010: How It Works Section

**Objective:** Show the 3-step setup-to-value journey. Customer should think "that's it? I just connect my accounts and it works?"
**Priority:** P0 — bridges the hero promise to the product reality

### EPIC-HP-011: Outreach Section — "Outreach That Gets Replies"

**Objective:** Combine smart targeting + LinkedIn safety + human approval into one outcome-focused section. Addresses the three recruiter concerns: will this work? Will I get banned? Do I stay in control?
**Priority:** P0 — directly addresses known fears and a genuine technical moat

### EPIC-HP-012: Auto CRM Section — "Your CRM Updates Itself"

**Objective:** Position auto-updating CRM as the thing that frees recruiters to focus on relationship work. Every signal captured = zero admin = full context for every conversation.
**Priority:** P0 — the secondary selling point that enables the primary value (relationship focus)

### EPIC-HP-013: AI Showcase — Source Tab

**Objective:** Add sourcing demo tab to the existing AI Showcase section
**Priority:** P1 — extends existing section, low effort

### EPIC-HP-014: Comparison Table — New Rows

**Objective:** Add outcome-focused capability rows to the comparison table
**Priority:** P1 — straightforward data addition

### EPIC-HP-015: Pricing Tier Alignment

**Objective:** Align pricing tier names with the north star pricing model
**Priority:** P2 — cosmetic alignment

### EPIC-HP-016: Competitive Intelligence Update

**Objective:** Verify the new competitive gaps against latest product docs and competitor research
**Priority:** P2 — documentation

---

## Stories & Tasks

---

### EPIC-HP-009: Hero Rework — AI Recruiter Positioning

#### Story HP-9.1: Reworked Hero Copy

- [x] **HP-064:** Rework `<HeroSection>` headline:
  - Line 1: `"Your AI Recruiter."` (display sans, white, `text-hero` size)
  - Line 2: `"Ready in 5 Minutes."` (display sans, indigo gradient)
  - Mirrors Nume's "Onboard Your AI CFO In 5 Minutes" — positions Cura as a team member, not software. The speed promise is the hook.

- [x] **HP-065:** Rework subheadline: `"Connect your LinkedIn and email. Cura sources candidates, drafts personalised outreach, and follows up — automatically. You focus on the conversations that close deals."` (~20 px, muted white, max-width 540 px). Communicates the full value loop: setup → AI works → you do relationship work.

- [x] **HP-066:** Rework stat bar. Replace current 4 micro-stats with:
  - `"5 min"` / `"setup"` — speed promise reinforcement
  - `"24/7"` / `"sourcing & outreach"` — always-on
  - `"25-40%"` / `"reply rate"` — concrete, quantifiable outcome
  - `"Human"` / `"always approves"` — trust signal

#### Story HP-9.2: Reworked Hero Visual

- [x] **HP-067:** Replace `<HeroVisual>` pipeline Kanban with an "AI recruiter at work" dashboard mockup. Dark frosted-glass card showing:
  - Top bar: `"Cura AI — Working"` with a green pulse dot
  - Activity feed (3 lines, typewriter animation staggered):
    - `"✓ Found 23 CFO candidates in London"` (fade in at 0s)
    - `"✓ Drafted outreach for top 15"` (fade in at 2s)
    - `"⏳ Awaiting your approval (15 messages)"` (fade in at 4s, indigo highlight)
  - Bottom: mini avatar row of sourced candidates with match % badges
  - Shows the AI doing work and waiting for human approval — the core value loop.

- [x] **HP-068:** Add a subtle `"Set up once. It never stops working."` caption below the visual — muted, italic, small.

---

### EPIC-HP-010: How It Works Section

#### Story HP-10.1: Three-Step Flow

- [x] **HP-069:** Build `<HowItWorksSection>` — light background (`#FAFAF8`). Section eyebrow: `"How it works"` (indigo, uppercase). Headline: `"Set up. Let it work. Close deals."` (display sans, dark text). Subline: `"Three steps between you and an AI recruiter that sources, outreaches, and follows up around the clock."` (muted, centred).

- [x] **HP-070:** Three numbered step cards (horizontal on desktop, stacked on mobile), each with an icon, title, and description:
  - **Step 1 — "Connect your accounts"** (link/plug icon)
    `"Link your LinkedIn and email. Import your existing candidates or start fresh. Cura syncs everything in under 5 minutes."`
  - **Step 2 — "AI goes to work"** (robot/zap icon)
    `"Give Cura a job brief — or just a title. It generates the spec, searches LinkedIn and talent databases, drafts personalised outreach, and starts the pipeline. Automatically."`
  - **Step 3 — "You close the deal"** (handshake icon)
    `"Review the AI's work. Approve outreach with one click. Enter every candidate conversation with full context. Focus on the human connection that actually wins placements."`
  - Each card has a top number badge (01, 02, 03) in indigo. Connecting dotted line between cards on desktop.

- [x] **HP-071:** Below the steps, add a trust line: `"You choose which steps need your approval. Full control, no surprises."` — centred, muted italic.

---

### EPIC-HP-011: Outreach Section — "Outreach That Gets Replies"

#### Story HP-11.1: Outreach Outcomes

- [ ] **HP-072:** Build `<OutreachSection>` — dark background. Section eyebrow: `"AI-powered outreach"` (indigo). Headline: `"Outreach that actually gets replies."` (display sans, white). Subline: `"LinkedIn caps you at ~15 connection requests per day. Most tools blast through them blindly. Cura's AI scores every candidate and picks the 15 most likely to reply — then sends from your own browser, so LinkedIn never flags you."` (muted white, centred).

- [ ] **HP-073:** Three-column metric cards:
  - **Card 1 — "Manual outreach":** `"~15/day"` / `"Gut feel"` / `"10-20% reply rate"` — grey, muted
  - **Card 2 — "Automation tools":** `"~50-100/day"` / `"Basic filters"` / `"5-10% reply rate"` + red `"Ban risk"` badge — grey with warning
  - **Card 3 — "Cura":** `"~15/day"` / `"AI-scored & ranked"` / `"25-40% reply rate"` + indigo `"LinkedIn-safe"` badge — highlighted, elevated (border glow, slight elevation)

- [ ] **HP-074:** Two side-by-side feature callouts below the metrics:
  - **Left — "Smart targeting"** (target icon): `"Role fit, skill match, prior relationship, response likelihood — every candidate scored before a single message is sent."` — frosted glass card
  - **Right — "Your browser, your IP"** (shield icon): `"Cura sends from your real Chrome session. No data centre IPs, no headless browsers, no cookie injection. LinkedIn sees a normal recruiter."` — frosted glass card

- [ ] **HP-075:** Bottom callout: mini approval-queue mockup showing:
  ```
  Today's Outreach (15 of 43 candidates)
  #1  Sarah Chen — CFO, Series B fintech — 94% match
  #2  James Park — VP Finance, growth stage — 91% match
  ...
  [Approve All]  [Edit Selection]
  ```
  Caption: `"You approve everything. Cura handles the rest."`

---

### EPIC-HP-012: Auto CRM Section — "Your CRM Updates Itself"

#### Story HP-12.1: Zero-Admin CRM

- [ ] **HP-076:** Build `<AutoCRMSection>` — light background (`#FAFAF8`). Section eyebrow: `"Zero admin"` (indigo). Headline: `"Your CRM updates itself."` (display sans, dark text). Subline: `"Every email, LinkedIn reply, call transcript, and pipeline change — captured automatically. Walk into every conversation knowing exactly where things stand."` (muted, centred).

- [ ] **HP-077:** Animated event-feed visual (single column, centred). A CRM timeline mockup showing events appearing in sequence (staggered 600ms, Intersection Observer triggered):
  - `"📧 Email from Sarah Chen — interested in CFO role"` (just now)
  - `"💬 LinkedIn reply — James Park accepted connection"` (2 min ago)
  - `"📞 Call with Ana Costa — transcript & notes added"` (1 hr ago)
  - `"📋 Pipeline — moved 3 candidates to Interview stage"` (3 hrs ago)
  - `"🔍 Sourcing run — 12 new candidates enriched"` (yesterday)
  - Each entry has a source icon, text, and timestamp. Dark frosted-glass card.

- [ ] **HP-078:** Pull-quote below the visual: `"Stop updating your CRM. Start using it."` — large, serif italic, centred.

---

### EPIC-HP-013: AI Showcase — Source Tab

#### Story HP-13.1: Sourcing Tab

- [ ] **HP-079:** Add a fourth tab to `<AIShowcase>`: `"🔍 Source"` — positioned first in tab order (before Match, Draft, Brief). Shows a mock sourcing results panel:
  - Search bar: `"CFO, Series B fintech, London"` (pre-filled, terminal style)
  - 4 candidate result cards: name, title, company, match %, source badge (`LinkedIn` / `PDL` / `Internal DB`)
  - Footer: `"23 found · 4 channels · 12 seconds"`
  - Staggered appear animation (200ms per card).

---

### EPIC-HP-014: Comparison Table — New Rows

#### Story HP-14.1: Outcome-Focused Rows

- [ ] **HP-080:** Add 4 new rows to `<ComparisonSection>` CAPABILITIES array, focused on outcomes:

  | Capability                      | Legacy Enterprise | AI Recruiting Platform | Agency All-in-One | **Cura** |
  | ------------------------------- | :---------------: | :--------------------: | :---------------: | :------: |
  | AI-powered candidate sourcing   |         ✗         |        partial         |         ✗         |    ✅    |
  | Automated personalised outreach |         ✗         |           ✗            |         ✗         |    ✅    |
  | LinkedIn-safe execution         |         ✗         |           ✗            |         ✗         |    ✅    |
  | Self-updating CRM (zero admin)  |         ✗         |           ✗            |         ✗         |    ✅    |

- [ ] **HP-081:** Update comparison section subtitle to reflect 13 capabilities.

- [ ] **HP-082:** Update footnote to add: `"'LinkedIn-safe execution' means outreach runs from the recruiter's own browser and IP address, not from data centre infrastructure."`

---

### EPIC-HP-015: Pricing Tier Alignment

#### Story HP-15.1: Match North Star Tiers

- [ ] **HP-083:** Align `<PricingTeaser>` tier names with north star: Free (Solo Recruiter) / Starter (Boutique) / Pro (Scaling Agency) / Enterprise. Update feature bullets to emphasise outreach and auto-CRM features per tier.

---

### EPIC-HP-016: Competitive Intelligence Update

#### Story HP-16.1: Updated Gaps Table

- [ ] **HP-084:** Verify the 4 new rows added to the "New Competitive Gaps" table (above) are accurate against latest product docs and competitor research.

---

## Section Map (Scroll Order — V2)

```
 1. [NAV]              Sticky nav — logo · links · "Get Early Access" CTA
 2. [HERO]             REWORKED — "Your AI Recruiter. Ready in 5 Minutes."
                       AI-at-work dashboard visual · 4 micro-stats · waitlist CTA
 3. [HOW IT WORKS]     NEW — "Set up. Let it work. Close deals."
                       3-step: Connect accounts → AI sources & outreaches → You approve & close deals
 4. [OUTREACH]         NEW — "Outreach that actually gets replies."
                       Smart targeting (25-40% response) · LinkedIn-safe · approval queue
 5. [AUTO CRM]         NEW — "Your CRM updates itself."
                       Animated event feed · zero admin · full context for every conversation
 6. [VALUE PROP 1]     "AI that moves the deal." — autonomous pipeline
    [SPEED BANNER]     "3 hours reclaimed per day."
 7. [VALUE PROP 2]     "Every signal. One timeline." — zero-loss memory
 8. [VALUE PROP 3]     "AI drafts. You decide." — human-in-the-loop
 9. [REPLACE STACK]    "One brain. Not five tools." — stack consolidation visual + NLP search demo
10. [AI SHOWCASE]      Source · Match · Draft · Brief tabs · keyboard shortcuts
11. [COMPARISON]       Feature table (13 rows) · compliance badge
12. [SOCIAL PROOF]     Testimonials · logos · rating
13. [PRICING]          4-tier grid — Free · Starter · Pro · Enterprise
14. [WAITLIST]         "Your pipeline won't move itself." — email capture
15. [FOOTER]           Links · copyright
```

---

## Implementation Order

**Phase A (P0, sequential):** HP-009 → HP-010 → HP-011 → HP-012
**Phase B (P1, parallel):** HP-013 / HP-014
**Phase C (P2):** HP-015 / HP-016

---

## Dependencies & Notes

- All V1 design philosophy, tokens, fonts, and patterns still apply (see `home-page-v1-archived.md`)
- New sections follow dark/light alternation: Hero (dark) → Problem (light) → How It Works (light) → Outreach (dark) → Auto CRM (light)
- All animations use CSS `@keyframes` + Intersection Observer (consistent with V1)
- New components: `HowItWorksSection.tsx`, `OutreachSection.tsx`, `AutoCRMSection.tsx`
- Modified components: `HeroSection.tsx`, `AIShowcase.tsx`, `ComparisonSection.tsx`, `PricingTeaser.tsx`
- `page.tsx` needs updated imports and section composition for the new scroll order
