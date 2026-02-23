# Claude Code Configuration
# This file is the AI entry point. First 100 lines = navigational map of the entire repo.
# Every canonical document must be registered here. If it's not listed, the AI won't know it exists.

---

## Documents

| Document | Category | Description |
|----------|----------|-------------|
| `docs/way-of-work.md` | Working Agreements | How we work: repo-as-brain, document structure rules, AI-first principles, dynamic context injection, `@link` vs plain link, decision format |
| `docs/product-north-star.md` | Strategy & Vision | Product vision, target market, competitive positioning, and north star for the Cura recruitment platform |
| `docs/project-plan.md` | Project Planning | Phase-by-phase implementation plan, human verification gates, module responsibilities, and architectural principles |
| `docs/crm-technical-plan.md` | Technical Design | Phase 1 system architecture, core technical decisions (multi-tenancy, IDs, GraphQL, real-time, monorepo tooling), and database schema |
| `js/cura-crm-project-management.md` | Project Management | EPIC/Story/Task breakdown for Phase 1 CRM (Candidates, Clients, Jobs CRUD). 5 EPICs, 11 Stories, 56 Tasks |
| `USAGE.md` | Developer Guide | How to start the project locally, bin scripts reference, service ports, and Docker Compose commands |

---

## Decision Documentation Rule

Whenever a meaningful technical or business decision is made, document it **before closing the task**:

1. Find the most relevant existing document (`docs/crm-technical-plan.md` for technical, `docs/product-north-star.md` for product)
2. Add a decision section: **what** was chosen, **why**, **alternatives considered**, **trade-offs** — comparison table where options exist
3. If no document fits, create one and register it in this file under the correct section above
4. See `docs/way-of-work.md` for the full decision format and document structure rules

---

## AI Behaviour Rules

- **Never auto-commit.** Do not run `git commit` unless the prompt explicitly says to commit. Always let the human review changes before committing.
