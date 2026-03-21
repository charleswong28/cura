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
| `docs/crm-technical-plan.md` | Technical Design | Phase 1 system architecture, core technical decisions (multi-tenancy, IDs, GraphQL, real-time, monorepo tooling), database schema. **Phase 3:** Cowork task queue design (CoworkTask model, MCP tools, scheduled 30-min execution, stale detection & alerting, session history) |
| `docs/outreaching-technical-plan.md` | Technical Design | LinkedIn outreach HOW — interaction patterns (connection request, message, InMail, inbox scan, profile search steps), LinkedIn rate limits & enforcement, reply detection pipeline (email notifications → inbox scan → CRM nudges), error handling, recruiter onboarding. Task queue/scheduling lives in crm-technical-plan.md |
| `docs/talon-technical-plan.md` | Technical Design | Talon browser task executor — deterministic browser automation design: permission model (Orchestrator/Approver/Runner separation), human approval gate, site isolation (one site per session), credential fetch-and-discard flow, swappable BrowserBackend (browser-use default / page-agent alternative + security risk), A2A integration (Talon as A2A Server, CRM as A2A Client, SSE streaming, agent card), no-task-no-action guarantee, data model (TalonTask, TalonCredential, TalonAuditLog). **Session persistence:** browser state encrypted in S3 for ephemeral process model; IP consistency design. |
| `docs/ai-playbook.md` | AI Operations | AI behaviour rules, decision documentation protocol, and server validation steps |
| `js/cura-crm-project-management.md` | Project Management | Unified Phase 1 CRM plan — backend API + frontend web app. 6 EPICs, 27 Stories, 121 Tasks (TASK-001–056 BE, WA-001–079 FE) |
| `js/apps/web-home-page/home-page-project-management.md` | Project Management | Marketing home page plan (cura.com) — Superhuman-inspired design, 8 EPICs, 12 Stories, 63 Tasks (HP-001–HP-063) |
| `USAGE.md` | Developer Guide | How to start the project locally, bin scripts reference, service ports, and Docker Compose commands |
| `docs/customer_interview/2026-02-27-interview-with-man.md` | Customer Research | Sourcing-first recruiter interview. Key themes: job spec auto-generation, multi-channel sourcing, one-click outreach, auto-enrichment. Gap analysis vs. current north star included. |

---

## AI Rules

See @docs/ai-playbook.md for all AI behaviour rules, decision documentation requirements, and the server validation protocol.
