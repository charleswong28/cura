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
| `docs/crm-technical-plan.md` | Technical Design | Phase 1 system architecture, core technical decisions (first-party authn/authz, multi-tenancy, IDs, GraphQL, real-time, monorepo tooling), database schema (identity, Permission, Team, spine `JobApplication`, stage tables). **Phase 3:** Cowork/Browser Agent task queue design (CoworkTask model, CRM API/MCP tools, scheduled 30-min execution, stale detection & alerting, session history). **Reporting:** event-first warehouse layer (Event, facts, daily snapshots) |
| `docs/authn-authz-technical-plan.md` | Technical Design | Deep-dive authn/authz design. Covers: login/refresh/MFA/password-reset flows, JWT claims, team structure (self-referential `Team` with `kind`), functional permission strings + built-in roles, row-level `Permission` model, data scope defaults, team grant → member access resolution, cascade rules, system auto-grants, `PermissionGrant` audit log, `ShareToken` for magic links, NestJS guard stack (`JwtAuthGuard` → `FunctionalPermissionGuard` → `PermissionService`), request-scoped LRU cache, end-to-end resolution algorithm. |
| `docs/gllue_anaylsis/gllue-research.md` | Reverse-Engineering Reference | Gllue ATS/CRM architecture distilled from a 22 GB MySQL dump (1,073 tables). Maps 7 subsystems (identity, candidate, client, job-pipeline-as-spine, workflow/approval, permissions, acquisition channels), cross-cutting patterns (`*privilege` + `*uniqueprivilege`, `gllueext_*` custom fields, `dbtriggerlog`), gap analysis (sessions, MFA, audit, reporting), and concrete prescriptions Cura adopts vs. avoids. Companion file: `docs/gllue_anaylsis/sample.sql` (1.9 MB schema + sample data). |
| `docs/outreaching-technical-plan.md` | Technical Design | LinkedIn outreach HOW — Cura Browser Agent (Browser-Use + Claude API), interaction patterns (connection request, message, InMail, inbox scan, profile search), LinkedIn rate limits & enforcement, CDP detection risk & mitigation, reply detection pipeline (email notifications → inbox scan → CRM nudges), error handling, recruiter onboarding. Task queue/scheduling lives in crm-technical-plan.md |
| `docs/talon-technical-plan.md` | Technical Design | Talon browser task executor — deterministic browser automation design: permission model (Orchestrator/Approver/Runner separation), human approval gate, site isolation (one site per session), credential fetch-and-discard flow, swappable BrowserBackend (browser-use default / page-agent alternative + security risk), A2A integration (Talon as A2A Server, CRM as A2A Client, SSE streaming, agent card), no-task-no-action guarantee, data model (TalonTask, TalonCredential, TalonAuditLog). **Session persistence:** browser state encrypted in S3 for ephemeral process model; IP consistency design. |
| `docs/DESIGN.md` | Design System | Design tokens and component specs: color palette (neutrals + spectrum gradient), ABC Oracle typography scale, spacing, border radius, surface elevation, frosted card / button components, Do/Don't rules. Source: Refero style reference. |
| `docs/ai-playbook.md` | AI Operations | AI behaviour rules, decision documentation protocol, and server validation steps |
| `js/cura-crm-project-management.md` | Project Management | Unified Phase 1 CRM plan — backend API + frontend web app. 6 EPICs, 27 Stories, 121 Tasks (TASK-001–056 BE, WA-001–079 FE) |
| `js/apps/web-home-page/home-page-project-management.md` | Project Management | Marketing home page plan (cura.com) — Superhuman-inspired design, 8 EPICs, 12 Stories, 63 Tasks (HP-001–HP-063) |
| `python/apps/talon/talon-project-management.md` | Project Management | Talon browser executor plan — Phase 3 sourcing automation. 7 EPICs, 32 Stories, 78 Tasks (TALON-001–TALON-078). Covers: scaffold, A2A server, browser backend, session persistence, credential vault, proxy management, CRM integration. |
| `js/apps/home-proxy/home-proxy-project-management.md` | Project Management | Cura Proxy Agent desktop app (Tauri 2.0, macOS) — routes Talon browser traffic through recruiter's home ISP via frp SOCKS5 tunnel. 8 EPICs, 54 Tasks (HP-001–HP-054). Phase 3. |
| `USAGE.md` | Developer Guide | How to start the project locally, bin scripts reference, service ports, and Docker Compose commands |
| `docs/customer_interview/2026-02-27-interview-with-man.md` | Customer Research | Sourcing-first recruiter interview. Key themes: job spec auto-generation, multi-channel sourcing, one-click outreach, auto-enrichment. Gap analysis vs. current north star included. |

---

## AI Rules

See @docs/ai-playbook.md for all AI behaviour rules, decision documentation requirements, and the server validation protocol.
