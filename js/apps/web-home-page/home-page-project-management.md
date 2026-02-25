# Cura — Marketing Home Page: Project Management

## Project Status: 📋 Planning
**Goal:** Ship a Superhuman-inspired marketing landing page that converts recruitment agency leaders into early-access sign-ups. Dark, fast, keyboard-forward, AI-futuristic aesthetic. Every word earns its place.

**Positioning Hook:** *"Stop Clicking. Start Connecting."*
**Target Reader:** Boutique and mid-market recruitment agency owners/leads frustrated by legacy ATS clutter (Bullhorn, Loxo).

---

## Competitive Intelligence: What Loxo & RecruitCRM Say (and What They Miss)

### What they say well (messages we must also cover)
| Message | Who uses it | Our version |
|---------|-------------|-------------|
| "One platform. One workflow." | Loxo | "One brain. Every signal." — we go further: not just consolidated, but *thinking* |
| "Turn your messy tech stack into one disciplined workflow" | Loxo | "Replace five tools with one platform that actually acts" |
| "Build a scalable hiring machine" | RecruitCRM | "Scale without losing the human touch that wins mandates" |
| "From sourcing to placements" | RecruitCRM | "From first signal to signed offer — Cura moves the whole journey" |
| "Death-by-a-thousand-clicks" | Loxo | Our problem section owns this — we named it "The Endless Click" |
| "The Headache Tax" (multi-tool friction) | Loxo | We call it "The Tool Tax" — four vendors, four invoices, four context switches |

### Gaps they do NOT address (Cura's exclusive territory)
| Gap | Why it matters |
|-----|---------------|
| **Truly autonomous pipeline movement** | Loxo/RecruitCRM have *assistance-level* AI (note-taker, email suggester). Neither has an agent that reads intent signals and *advances the deal without being told*. |
| **Zero-loss engagement memory** | Both track activity logs. Neither synthesizes Zoom + LinkedIn + email + calendar into a unified, searchable context layer. |
| **Human-in-the-Loop as a trust feature** | Competitors position automation as "set and forget." Cura flips it: human gates are a *feature*, not a limitation — audit trail, compliance, quality control. |
| **EU AI Act compliance-ready** | Neither competitor mentions it. The August 2026 deadline is a live threat for agencies with EU operations. Cura is built for it from day one. |
| **Keyboard-first speed UX** | Both have standard point-and-click UIs. No competitor offers Superhuman-style keyboard navigation and command palette. |
| **Natural language search** | Loxo has it (Professional tier, expensive). We include it as standard. |
| **Boutique-agency pricing** | Loxo Basic: **$169/seat/month**. RecruitCRM is volume-focused. Boutique executive search firms are underserved on pricing. |

### Competitor pricing anchor (for our page copy)
- **Loxo Basic:** $169/user/month (annual billing) — AI features only on Professional (custom, higher)
- **RecruitCRM:** Volume/scale focus; per-seat pricing not publicly listed
- **Cura positioning:** Fair, transparent, boutique-first — no per-seat traps, no custom-quote walls

---

## Design Philosophy

| Principle | Implementation |
|-----------|---------------|
| **Dark by default** | Near-black `#0A0A0A` background, off-white `#F5F5F3` text — feels fast and premium |
| **Bold, sparse typography** | Large display serif/sans mix (inspired by Superhuman's Super Serif); every section has one headline, one subline |
| **Motion with purpose** | Subtle entrance animations (fade-up), no decorative spinners; speed is felt, not performed |
| **Conversion at every scroll** | Primary CTA ("Get Early Access") persists in nav and recurs at section boundaries |
| **No clutter** | Zero sidebars, zero badges, zero stock-photo humans — just sharp copy, sharp visuals |

---

## 📋 EPICs

### EPIC-HP-001: 🏗️ Page Foundation
**Objective:** Design system tokens, layout skeleton, and navigation that establish the aesthetic
**Priority:** P0 — everything else builds on this
**Sections:** Global nav, page shell, fonts, color/spacing tokens

### EPIC-HP-002: 🦸 Hero Section
**Objective:** Full-viewport opening punch — headline, subline, animated background, waitlist CTA
**Priority:** P0 — first impression, highest conversion impact

### EPIC-HP-003: 😤 The Problem Section
**Objective:** Mirror the recruiter's daily frustration so precisely they feel seen
**Priority:** P0 — establishes emotional hook before the pitch

### EPIC-HP-004: ⚡ Core Value Propositions
**Objective:** Three-pillar feature showcase (Autonomous Pipeline, Zero-Loss Memory, Human-in-the-Loop)
**Priority:** P0 — product differentiation

### EPIC-HP-004B: 🗂️ Replace Your Stack Section
**Objective:** Show explicitly what tools Cura replaces — single-platform consolidation with a thinking AI layer on top
**Priority:** P1 — directly counters Loxo's "one platform" pitch by going further

### EPIC-HP-005: 🤖 AI Intelligence Showcase
**Objective:** Visual demo of Cura's AI in action — pipeline movement, briefing notes, match scoring
**Priority:** P1 — proof the AI is real and useful

### EPIC-HP-006: 📊 Competitive Moat Section
**Objective:** Subtle comparison table positioning Cura against Bullhorn/Loxo/Gem without naming them negatively
**Priority:** P1 — justifies switching for agency owners

### EPIC-HP-007: 🗣️ Social Proof
**Objective:** Testimonials, recruiter quotes, trusted-by logos
**Priority:** P1 — credibility and trust

### EPIC-HP-008: 📬 Conversion & Footer
**Objective:** Early-access waitlist form, pricing teaser, footer links
**Priority:** P0 — primary revenue goal of the page

---

## 📖 Stories & Tasks

---

### EPIC-HP-001: 🏗️ Page Foundation

#### Story HP-1.1: Design Tokens & Global Styles
- [x] **HP-001:** Define color palette — `--cura-black: #0A0A0A`, `--cura-white: #F5F5F3`, `--cura-accent: #6366F1` (electric indigo), `--cura-muted: #3F3F46` as Tailwind CSS variables in `globals.css`
- [x] **HP-002:** Configure custom fonts — load `Inter` (body) + `Playfair Display` or `Instrument Serif` (display headlines) via `next/font`; mirror the Superhuman serif/sans pairing
- [ ] **HP-003:** Set up base spacing scale, max-width container (`max-w-6xl`), and section padding utilities (`section-padding` class)
- [ ] **HP-004:** Create `<GradientBackground>` component — radial gradient blobs (indigo/violet, low opacity) layered over `#0A0A0A`; subtle CSS `@keyframes` float animation

#### Story HP-1.2: Navigation
- [ ] **HP-005:** Build sticky `<NavBar>` — logo left, links centre (`Product`, `Why Cura`, `Pricing`), CTA button right (`Get Early Access` → scrolls to waitlist); transparent on top of hero, blurs to `bg-black/80 backdrop-blur` on scroll
- [ ] **HP-006:** Add mobile hamburger nav with slide-down drawer; all nav items accessible at ≤ 768 px
- [ ] **HP-007:** Implement scroll-spy to highlight active nav section as user scrolls

#### Story HP-1.3: Page Shell & SEO
- [ ] **HP-008:** Create `/app/page.tsx` home page route that composes all section components
- [ ] **HP-009:** Add `<head>` metadata — title `"Cura — AI-First Recruitment CRM"`, OG image (dark-themed card with tagline), Twitter card
- [ ] **HP-010:** Add `robots.txt` and `sitemap.xml` for the marketing site

---

### EPIC-HP-002: 🦸 Hero Section

#### Story HP-2.1: Hero Copy & Layout
- [ ] **HP-011:** Build `<HeroSection>` full-viewport (`min-h-screen`) layout — vertically centred, left-aligned text column, right-side animated visual panel
- [ ] **HP-012:** Implement headline: `"Stop Clicking."` (display serif, white, ~96 px) / `"Start Connecting."` (display serif, indigo gradient, ~96 px) — two lines, separate color treatment
- [ ] **HP-013:** Add subheadline: `"The AI-first recruitment platform that moves the deal — from first signal to signed offer — so you can focus on the relationships only you can build."` (~20 px, muted white, max-width 520 px); `"from first signal to signed offer"` counters RecruitCRM's "sourcing to placements" full-lifecycle claim
- [ ] **HP-014:** Add supporting stat bar below subheadline: four micro-stats with dividers — `"3 hrs saved/day"` · `"5 tools replaced"` · `"Zero lost context"` · `"Human always in control"`; each stat in indigo, label in muted white; `"5 tools replaced"` is the stack-consolidation hook

#### Story HP-2.2: Hero CTA
- [ ] **HP-015:** Primary CTA button: `"Get Early Access →"` — indigo background, white text, pill-shaped, hover scale; clicking scrolls to `#waitlist`
- [ ] **HP-016:** Secondary ghost link below: `"Watch 90-second demo ▶"` — opens a modal with embedded demo video placeholder
- [ ] **HP-017:** Add social-proof micro-copy beneath CTAs: `"Trusted by 40+ recruitment agencies in beta"` with three avatar circles (placeholder)

#### Story HP-2.3: Hero Visual
- [ ] **HP-018:** Build `<HeroVisual>` right panel — dark frosted-glass card mockup of the Cura pipeline Kanban; populate with placeholder candidate cards with stage labels (`Sourced`, `Screened`, `Interviewing`, `Offer`)
- [ ] **HP-019:** Animate a candidate card auto-advancing from `Screened → Interviewing` with a subtle AI badge ("AI moved · just now") — CSS keyframe loop, 4 s interval
- [ ] **HP-020:** Add floating tooltip over the moving card: `"Cura detected calendar invite. Briefing note drafted."` — appears and fades after 2 s

---

### EPIC-HP-003: 😤 The Problem Section

#### Story HP-3.1: Pain-Point Narrative
- [ ] **HP-021:** Build `<ProblemSection>` with dark grey background (`#111111`) — differentiated from hero but still dark
- [ ] **HP-022:** Section headline: `"Your competitors close deals while you're updating spreadsheets."` — large serif, centred
- [ ] **HP-023:** Four-column pain cards, each with an icon, bold label, and one-sentence description:
  - **"The Endless Click"** — `"11 clicks to move a candidate in most ATS tools. We counted."` (⚡)
  - **"Context Amnesia"** — `"You switch between email, LinkedIn, and CRM and lose the thread every single time."` (🧠)
  - **"Slow = Lost"** — `"The recruiter who replies in minutes places the candidate. You're still searching the inbox."` (⏱)
  - **"The Tool Tax"** — `"ATS. Outreach tool. Enrichment API. LinkedIn Recruiter. You're paying for four tools and managing five context switches — daily."` (💸) — directly counters Loxo's "Headache Tax" framing with our own sharper version
- [ ] **HP-024:** Below the cards: italic pull-quote `"Your instinct is your edge. But admin is eating it alive."` — large, low-opacity white, centred

---

### EPIC-HP-004: ⚡ Core Value Propositions

#### Story HP-4.1: Three-Pillar Feature Grid
- [ ] **HP-025:** Build `<ValuePropsSection>` — alternating left/right layout, each pillar takes a full screen row
- [ ] **HP-026:** **Pillar 1 — Autonomous Pipeline:** Headline `"AI that moves the deal."` Subtext: `"Cura agents watch your calendar syncs and emails. When a candidate is interviewed, their stage advances and a briefing note is ready — before you've had coffee."` Visual: animated pipeline with stage-advance arrow
- [ ] **HP-027:** **Pillar 2 — Zero-Loss Memory:** Headline `"Every signal. One timeline."` Subtext: `"LinkedIn replies, Zoom transcripts, email opens — everything is synthesized into a single, permanent record. Enter every conversation knowing exactly where things stand."` Visual: stacked timeline feed (mock entries)
- [ ] **HP-028:** **Pillar 3 — Human-in-the-Loop:** Headline `"AI drafts. You decide."` Subtext: `"No autonomous sending. No hallucination risk. For every high-stakes action — client submission, offer, key message — Cura presents a draft and waits for your approval."` Visual: approval modal mockup with `Approve & Send` button
- [ ] **HP-029:** Each pillar section has a subtle indigo accent line (left border on the text block) and an icon badge top-left of the visual panel

#### Story HP-4.2: Speed Statistic Interlude
- [ ] **HP-030:** Build `<SpeedBanner>` full-width stripe between pillars 1 and 2 — dark indigo gradient, single bold stat: `"Recruiters using Cura reclaim an average of 3 hours per day."` with source footnote
- [ ] **HP-031:** Add animated counter that counts up (`0 → 3 hrs`) when the stripe enters the viewport (Intersection Observer)

---

### EPIC-HP-004B: 🗂️ Replace Your Stack Section

#### Story HP-4B.1: Stack Replacement Visual
- [ ] **HP-060:** Build `<ReplaceStackSection>` — headline `"One brain. Not five tools."` (serif, centred); subline: `"Cura replaces your entire patchwork of ATS, outreach tool, enrichment API, and calendar sync — and adds an AI layer that actually acts on what it learns."`
- [ ] **HP-061:** Create a visual "old stack vs Cura" comparison — left side shows 5 greyed-out tool-pill logos (generic: `ATS`, `LinkedIn Recruiter`, `Email Sequencer`, `Enrichment API`, `Calendar Sync`) with a red "×" strike; right side shows a single Cura logo with a glowing indigo halo; an animated arrow sweeps left → right
- [ ] **HP-062:** Add cost implication subtext beneath the visual: `"Five subscriptions. Five logins. Five sources of truth. Or one."` — muted, italic; aligns with anti-$169/seat-Loxo sentiment without naming names
- [ ] **HP-063:** Add natural language search callout chip within this section: `"Ask Cura anything: 'Show me CFO candidates in London who interviewed in the last 90 days'"` — styled as a terminal / command input with a blinking cursor; demonstrates NLP search is standard, not a $169/month add-on

---

### EPIC-HP-005: 🤖 AI Intelligence Showcase

#### Story HP-5.1: Live Demo Preview
- [ ] **HP-032:** Build `<AIShowcase>` section — headline `"Intelligence that compounds."` — dark background, centred
- [ ] **HP-033:** Create tabbed showcase with three tabs (`📋 Match`, `✉️ Draft`, `📅 Brief`) — clicking each swaps the displayed mock UI panel:
  - **Match tab:** Candidate match score card (87% fit, skill chips, "Why this match" explainer)
  - **Draft tab:** AI-generated outreach email draft in a text editor chrome; cursor blinking at end
  - **Brief tab:** Auto-generated candidate briefing note with sections (Background, Salary, Availability, Next Step)
- [ ] **HP-034:** Animate the Draft tab typewriter effect — text types in at ~40 chars/sec on first enter-viewport; only plays once
- [ ] **HP-035:** Add caption beneath showcase: `"AI does the thinking. You make the call."` — muted, italic

#### Story HP-5.2: Keyboard-First UI Callout
- [ ] **HP-036:** Build `<KeyboardBadge>` component — small dark card showing keyboard shortcut examples: `⌘K` (command palette), `G C` (go to candidates), `A` (approve draft) — styled like a terminal / OS key-cap UI
- [ ] **HP-037:** Embed badge in a callout box: `"Built for speed. Every action has a shortcut."` — Superhuman-philosophy nod

---

### EPIC-HP-006: 📊 Competitive Moat Section

#### Story HP-6.1: Comparison Table
- [ ] **HP-038:** Build `<ComparisonSection>` — headline `"Recruitment CRMs were built for the 2010s. Cura is built for now."` — centred, serif
- [ ] **HP-039:** Render comparison table. Use archetypes (no direct competitor names) — `"Legacy Enterprise"` (Bullhorn), `"Talent Intelligence"` (Loxo), `"Scale & Volume"` (RecruitCRM), `"Cura"`. Rows derived from actual feature gaps identified in Q1 2026 research:

  | Capability | Legacy Enterprise | Talent Intelligence | Scale & Volume | **Cura** |
  |------------|:-----------------:|:-------------------:|:--------------:|:--------:|
  | Autonomous pipeline movement | ✗ | partial | ✗ | ✅ |
  | Zero-loss engagement memory | ✗ | ✗ | ✗ | ✅ |
  | Unified context (Zoom + email + LinkedIn) | ✗ | ✗ | ✗ | ✅ |
  | Human-in-the-loop approval gates | ✗ | ✗ | ✗ | ✅ |
  | Natural language search | ✗ | paid add-on | ✗ | ✅ |
  | Keyboard-first speed UX | ✗ | ✗ | ✗ | ✅ |
  | EU AI Act compliance-ready | ✗ | ✗ | ✗ | ✅ |
  | Boutique-friendly pricing | ✗ | ✗ | ✗ | ✅ |
  | Full lifecycle: source → offer | partial | partial | ✅ | ✅ |

- [ ] **HP-040:** Style the `Cura` column with indigo header and checkmarks in indigo — visually dominant; other columns greyed out
- [ ] **HP-041:** Add footnote: `"*Based on publicly documented product capabilities as of Q1 2026. 'Talent Intelligence' Basic plan starts at $169/seat/month; AI features require Professional (custom pricing)."`

#### Story HP-6.2: Compliance Moat Callout
- [ ] **HP-042:** Build `<ComplianceBadge>` — small section or sidebar card: `"EU AI Act compliant by design. Built-in audit trails, transparent decision logic, and bias safeguards — before the August 2026 deadline."` with a shield icon
- [ ] **HP-043:** Link to a `/compliance` page placeholder (can be empty for now)

---

### EPIC-HP-007: 🗣️ Social Proof

#### Story HP-7.1: Testimonials
- [ ] **HP-044:** Build `<TestimonialsSection>` — horizontal scroll of 3–4 quote cards on desktop, stacked on mobile
- [ ] **HP-045:** Each card: large open-quote glyph (indigo), 2–3 sentence quote, avatar circle + name + firm (placeholders OK for launch)
  - Example: `"We moved 40% more candidates to second interview in month one. Cura found the context I always lost between meetings."` — *Sarah K., MD, boutique search firm*
- [ ] **HP-046:** Add `"Trusted by"` logo row above testimonials — 5–6 placeholder agency names in muted white; update with real logos post-beta
- [ ] **HP-047:** Add star rating micro-element (5 stars, `"4.9 / 5 across beta cohort"`) beneath logo row

---

### EPIC-HP-008: 📬 Conversion & Footer

#### Story HP-8.1: Early Access Waitlist
- [ ] **HP-048:** Build `<WaitlistSection id="waitlist">` — full-width, indigo-to-violet gradient background (`from-indigo-900 to-violet-950`)
- [ ] **HP-049:** Headline: `"Your pipeline won't move itself."` (serif, white, 64 px) / subline: `"Join the waitlist. Be first when we open the doors."` (muted white, 18 px)
- [ ] **HP-050:** Email capture form: single input (`"Your work email"`) + submit button (`"Request Early Access"`); success state shows `"You're on the list. We'll be in touch."` with a checkmark animation
- [ ] **HP-051:** Connect form to a backend endpoint `POST /api/waitlist` that persists email + timestamp to DB (or a simple table; can use Prisma `WaitlistEntry` model)
- [ ] **HP-052:** Add form validation: email format, required; rate-limit client-side (disable button for 5 s after submit)
- [ ] **HP-053:** Show social-proof beneath form: `"Join 200+ agency leaders already on the list"` — update number manually as list grows

#### Story HP-8.2: Pricing Teaser
- [ ] **HP-054:** Build `<PricingTeaser>` — simple two-column card layout above the waitlist:
  - **Boutique** (`"For teams of 1–5"`) — price TBD, key features list
  - **Agency** (`"For growing firms"`) — price TBD, key features list
- [ ] **HP-055:** Both cards show `"Pricing announced at launch"` placeholder with an email-notify CTA linking to the waitlist
- [ ] **HP-056:** Add `"No contracts. No per-seat traps."` subline beneath pricing cards — direct shot at Gem's `$4,000/seat` positioning

#### Story HP-8.3: Footer
- [ ] **HP-057:** Build `<Footer>` — dark `#0A0A0A`, three-column: brand (logo + tagline), links (Product, Company, Legal), social icons (LinkedIn, X/Twitter)
- [ ] **HP-058:** Add `"© 2026 Cura. Built for the humans who build careers."` copyright line — small, muted
- [ ] **HP-059:** Add GDPR cookie-consent banner component (minimal, bottom-bar, dark-styled); consent state stored in `localStorage`

---

## 🎯 Section Map (Scroll Order)

```
1.  [NAV]           Sticky nav — logo · links · "Get Early Access" CTA
2.  [HERO]          "Stop Clicking. Start Connecting." — pipeline animation · 4 micro-stats · waitlist CTA
3.  [PROBLEM]       "Your competitors close deals while you're updating spreadsheets."
                    4 pain cards: Endless Click · Context Amnesia · Slow=Lost · Tool Tax
4.  [VALUE PROP 1]  "AI that moves the deal." — autonomous pipeline
    [SPEED BANNER]  "3 hours reclaimed per day."
5.  [VALUE PROP 2]  "Every signal. One timeline." — zero-loss memory
6.  [VALUE PROP 3]  "AI drafts. You decide." — human-in-the-loop
7.  [REPLACE STACK] "One brain. Not five tools." — stack consolidation visual + NLP search demo
8.  [AI SHOWCASE]   Match · Draft · Brief tabs · keyboard shortcuts
9.  [COMPARISON]    Feature table (9 rows) · compliance badge
10. [SOCIAL PROOF]  Testimonials · logos · rating
11. [PRICING]       Plan teaser — "No per-seat traps" · "Pricing at launch"
12. [WAITLIST]      "Your pipeline won't move itself." — email capture
13. [FOOTER]        Links · copyright
```

---

## 🔗 Dependencies & Notes

- **Font loading:** Use `next/font` for zero-CLS; subset to Latin only
- **Animations:** Prefer `CSS @keyframes` + Intersection Observer over heavy animation libraries; keep bundle lean
- **Images:** All visuals are CSS/code-driven mock UIs — no stock photography; reduces asset overhead and keeps the Superhuman aesthetic
- **Forms:** Waitlist endpoint wired to NestJS `apps/api` — add `WaitlistEntry` to Prisma schema
- **Responsive:** All sections must work at 320 px (mobile) through 1440 px (desktop); hero visual hides on < 768 px
- **Performance target:** Lighthouse score ≥ 90 on Performance, 100 on Accessibility
- **Analytics:** Add Plausible or Vercel Analytics for waitlist conversion tracking (privacy-first, no cookie consent required for basic analytics)
