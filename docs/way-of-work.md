# Way of Work

## Core Philosophy: Repo as the Brain

We are an AI-first company. Every decision, every trade-off, every "why we chose X over Y" lives in this repository. The repo is not just code — it is the institutional memory of the entire company.

This means any AI agent (or new team member) reading the repo should be able to answer:
- What are we building and why?
- What decisions have been made and why?
- What is in scope right now and what is not?
- How do we work?

If the answer isn't in the repo, it doesn't exist.

---

## Document Structure Rules

### Rule 1: First 100 lines tell you what the doc is about

Every document must open with a clear summary of its purpose and scope — enough that an AI agent or engineer can decide whether to read further without scrolling through the whole file. This includes:
- What the document covers
- What it does NOT cover
- Links to related documents

### Rule 2: CLAUDE.md first 100 lines = master table of contents (Dynamic Context Injection)

`CLAUDE.md` is always loaded first into AI context. Its opening 100 lines must function as a **navigational map** of the entire repo — a table of all canonical documents with a one-line description of each.

This is the **dynamic context injection** technique: by front-loading a structured TOC, every AI session immediately knows what exists, where decisions live, and where to write new ones — without reading every file.

```
CLAUDE.md (first 100 lines)
├── All strategy docs         → what they cover, one line each
├── All technical design docs → what they cover, one line each
├── All project management    → what they cover, one line each
└── Working agreements        → what they cover, one line each
```

The rule: **if a document is not in the CLAUDE.md TOC, the AI will not know it exists.**

### Rule 3: Break long documents, but link everything

When a document grows unwieldy, split it into focused sub-documents. Always:
1. Keep the parent document as a brief overview + links to sub-documents
2. Register all sub-documents in `CLAUDE.md`
3. Each sub-document must open with a link back to its parent and to `CLAUDE.md`

Never let a document become a dead end. Every doc is part of the navigable graph.

### Rule 4: `@link` = required context, plain link = optional context

Links in documents come in two forms:

| Syntax | Behaviour | Use when |
|--------|-----------|----------|
| `@docs/some-file.md` | **Always fetched** — loaded into AI context automatically whenever the current doc is read | The linked doc is essential to understand or act on this doc correctly |
| `docs/some-file.md` | **Fetched on demand** — AI reads it only if the current task makes it relevant | The linked doc is supplementary or only needed for specific scenarios |

**Practical rule:** if an AI agent would make a wrong decision without reading the linked doc, use `@`. If it's reference material the agent can pull when needed, use a plain link.

Example — a technical design doc that depends on the working agreements:
```markdown
<!-- Always load way-of-work because every decision must follow its format -->
See @docs/way-of-work.md for the decision format.

<!-- Load the north star only when discussing strategy -->
See docs/product-north-star.md for product context.
```

---

## What Lives in the Repo

### 1. Business Decisions
Strategic choices that shape the product — target market, positioning, pricing model, feature prioritisation, non-goals. These belong in `docs/product-north-star.md` or linked strategy documents.

### 2. Technical Decisions
Architecture choices, technology selections, trade-offs considered and rejected. Every decision that affects how the system is built must include:
- **What** was decided
- **Why** this option was chosen
- **What alternatives were considered** and why they were rejected
- **Known trade-offs** accepted

These live in the relevant technical design doc (e.g., `docs/crm-technical-plan.md`) under a numbered decision section with a comparison table.

### 3. Project Management
EPICs, Stories, and Tasks live in the repo alongside the code they describe. No external project management tool is the source of truth. See `js/cura-crm-project-management.md` for the current format.

### 4. Working Agreements
How we operate — this document.

---

## How to Document a Decision

When any meaningful decision is made — technical or business — capture it before or immediately after implementation using this structure:

```markdown
### [Section number] [Decision topic]
**Decision:** [What was chosen]

**Rationale:**
- [Key reason 1]
- [Key reason 2]

| Factor | Option A | Option B |
|--------|----------|----------|
| ...    | ...      | ...      |

**Alternatives considered:** [Option(s) and why rejected]
```

Decisions belong in the most relevant existing document. If no document fits, create one and register it in `CLAUDE.md`.

---

## AI-First Principles

### Context completeness
AI agents have no memory between sessions beyond what is in the repo. Write docs as if the reader has zero prior context. Assume the AI will re-read everything from scratch each time.

### Link everything
Every document should link to related documents. `CLAUDE.md` is the entry point — all canonical documents must be registered there.

### Decisions over summaries
A summary of a meeting is useless. The **decision reached** and its **rationale** is what matters. Capture outcomes, not discussions.

### Keep docs close to the code
Technical decisions live near the code they govern. The `js/` directory has its own project management file. Future packages or services should carry their own decision logs if they diverge significantly from the top-level design.

---

## Document Registry

All canonical documents must be registered in `CLAUDE.md`. When you create a document that captures decisions or working agreements, add it to the relevant table in `CLAUDE.md` immediately.

| Type | Where it lives | Registered in |
|------|---------------|---------------|
| Strategy & vision | `docs/` | `CLAUDE.md` → Related Documents |
| Technical design | `docs/` | `CLAUDE.md` → Related Documents |
| Project management | Alongside the code (e.g., `js/`) | `CLAUDE.md` → Project Management |
| Working agreements | `docs/` | `CLAUDE.md` → Related Documents |
