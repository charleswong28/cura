# Cura CRM — Phase 1 Project Management

## Project Status: In Progress

**Phase 1 Goal:** Full CRUD for Candidates, Clients, and Jobs — backend API + frontend web app
**Design Philosophy:** Superhuman-inspired — keyboard-first, fast, minimal clicks, zero clutter
**Kanban Board:** Out of scope for Phase 1
**Services:** API (NestJS GraphQL, port 8000) · Web App (Next.js, port 3001)

---

## EPICs

### EPIC-001: Foundation & Infrastructure

**Objective:** Dev environment, database schema, API foundation, app shell, GraphQL client
**Priority:** P0 — everything else builds on this

### EPIC-002: Authentication & Multi-tenancy

**Objective:** First-party authn/authz — email + password login, JWT sessions, TOTP MFA, role-based functional permissions, row-level `Permission` model, team-based access, multi-tenancy via `Tenant` model, route protection
**Priority:** P0 — security critical
**Design Reference:** `docs/authn-authz-technical-plan.md`

### EPIC-003: Candidate Management

**Objective:** Full candidate CRUD — API resolvers + frontend UI with search, filter, pagination
**Priority:** P0 — core feature
**Depends on:** EPIC-001, EPIC-002

### EPIC-004: Client Management

**Objective:** Full client/company CRUD — API resolvers + frontend UI
**Priority:** P1
**Depends on:** EPIC-001, EPIC-002

### EPIC-005: Job Management

**Objective:** Full job order CRUD — API resolvers + frontend UI with client relationship
**Priority:** P1
**Depends on:** EPIC-001, EPIC-002, EPIC-004 (client selector)

### EPIC-006: Dashboard & Command Palette

**Objective:** Landing page with pipeline summary, Cmd+K global search and quick actions
**Priority:** P2 — polish after CRUD is working
**Depends on:** EPIC-003, EPIC-004, EPIC-005

---

## Stories & Tasks

### EPIC-001: Foundation & Infrastructure

#### Story 1.1: Development Environment Setup

- [x] **TASK-001:** Set up Docker Compose (PostgreSQL, Redis, Soketi)
- [x] **TASK-002:** Configure NestJS project with GraphQL
- [x] **TASK-003:** Set up Prisma with ULID primary keys
- [x] **TASK-004:** Configure Next.js frontend with TypeScript
- [x] **TASK-005:** Set up Shadcn/ui component library

#### Story 1.2: Database Schema Foundation

- [x] **TASK-006:** Create core Prisma schema (Tenant, User, Candidate, Client, Job)
- [x] **TASK-007:** Implement tenant isolation with Prisma extension
- [x] **TASK-008:** Set up database migrations
- [x] **TASK-009:** Create seed data for development

#### Story 1.3: API Foundation

- [x] **TASK-010:** Set up GraphQL schema generation (code-first)
- [x] **TASK-011:** Configure GraphQL Codegen for frontend
- [x] **TASK-012:** Implement DataLoader for N+1 query prevention
- [x] **TASK-013:** Set up API error handling and validation

#### Story 1.4: App Shell — Sidebar Navigation (FE)

> Persistent left sidebar with links to all CRM sections. Collapsible on smaller screens.

- [x] **WA-001:** Create app shell layout (`(app)/layout.tsx`) with sidebar + main content area
- [x] **WA-002:** Build `Sidebar` component with navigation links (Dashboard, Candidates, Clients, Jobs, Settings)
- [x] **WA-003:** Add active route highlighting using `usePathname`
- [x] **WA-004:** Implement sidebar collapse/expand toggle with persistent state (localStorage)
- [x] **WA-005:** Add keyboard shortcut for sidebar toggle (e.g., `Cmd+b`)

#### Story 1.5: App Shell — Top Bar & Page Header (FE)

> Consistent top bar with breadcrumbs, search, and user menu.

- [x] **WA-006:** Build `TopBar` component with breadcrumb trail and user avatar area
- [x] **WA-007:** Create `PageHeader` component (title, description, action buttons) — reusable across all pages
- [x] **WA-008:** Add global command palette trigger (Cmd+K) — placeholder, wired in EPIC-006

#### Story 1.6: Responsive Layout (FE)

> Sidebar becomes a mobile drawer on small screens. Layout adapts gracefully.

- [x] **WA-009:** Implement mobile drawer variant of sidebar (slide-over with overlay)
- [x] **WA-010:** Add responsive breakpoint handling for sidebar collapse

#### Story 1.7: Apollo Client Setup (FE)

> Configure Apollo Client to talk to the NestJS GraphQL API.

- [x] **WA-011:** Install `@apollo/client` and configure `ApolloProvider` in root layout
- [x] **WA-012:** Set up Apollo link with auth header injection (Clerk JWT)
- [x] **WA-013:** Configure Apollo cache with type policies (ULID-based key fields)
- [x] **WA-014:** Add error handling link (network errors, GraphQL errors → toast notifications)

#### Story 1.8: GraphQL Codegen & Typed Hooks (FE)

> Auto-generate TypeScript types and React hooks from GraphQL schema.

- [x] **WA-015:** Install and configure `@graphql-codegen/cli` with `typescript`, `typescript-operations`, and `typescript-react-apollo` plugins
- [x] **WA-016:** Write `.graphql` query/mutation files for Candidate operations
- [x] **WA-017:** Write `.graphql` query/mutation files for Client operations
- [x] **WA-018:** Write `.graphql` query/mutation files for Job operations
- [x] **WA-019:** Add `codegen` script to `package.json` and verify generated hooks compile

---

### EPIC-002: Authentication & Multi-tenancy

#### Story 2.1: Auth & Permission Database Schema (BE)

> Prisma models for identity, sessions, MFA, roles, teams, permissions, and audit log.
> Spec: `authn-authz-technical-plan.md §1, §3, §4, §5, §8`

- [x] **TASK-065:** Add `AuthIdentity`, `Session`, `MfaDevice`, `PasswordResetToken`, `PasswordHistory` models to Prisma schema
- [x] **TASK-066:** Add `Role`, `UserRole`, `RoleDataScope` models to Prisma schema (including `tenantId?` for custom tenant roles)
- [x] **TASK-067:** Add `Team` (self-referential, `TeamKind` enum, `shortId` auto-increment) and `TeamMember` (`LEAD | MEMBER` role) models to Prisma schema
- [x] **TASK-068:** Add `Permission`, `PermissionGrant`, `PermissionCascadeRule`, `PermissionInheritance`, `ShareToken` models to Prisma schema
- [x] **TASK-069:** Add `AuditLog` model to Prisma schema with required indexes
- [x] **TASK-070:** Run and verify migrations; update seed data
- [x] **TASK-071:** Seed built-in roles (`admin`, `senior_recruiter`, `recruiter`, `viewer`) with permission strings and `RoleDataScope` rows per §4.2 and §5.1
- [x] **TASK-072:** Seed built-in `PermissionCascadeRule` rows (`JobApplication→Candidate`, `JobApplication→Job`, `Offer→JobApplication`, `Interview→JobApplication`, `Client→Job`) per §5.4

#### Story 2.2: Auth Service — Login, Sessions & Password Reset (BE)

> Core authentication flows per `authn-authz-technical-plan.md §2`.

- [x] **TASK-073:** Implement `AuthService.login()` — Argon2id verify, account lockout (5 consecutive fails → `lockedUntil`), tenant resolution by `tenantSlug`, `loginable`/`deletedAt` check, `Session` insert, JWT sign (HS512, 15 min access token, 90-day refresh token)
- [x] **TASK-074:** Implement `POST /auth/refresh` — look up `Session` by `refreshTokenHash`, check `revokedAt`/`expiresAt`/`loginable`, rotate refresh token atomically, detect reuse (revoke all sessions on reuse), issue new JWT with latest `user_ver` from Redis
- [x] **TASK-075:** Implement `POST /auth/logout` and `POST /auth/logout-all` — set `Session.revokedAt`, `INCR user_ver:{userId}` in Redis
- [x] **TASK-076:** Implement `POST /auth/password-reset/request` — rate-limited (3 req/hr per email), ULID+random token, store hash in `PasswordResetToken`, send email magic link
- [x] **TASK-077:** Implement `POST /auth/password-reset/confirm` — verify token, `PasswordPolicy` validation, `PasswordHistory` check (cap at policy size), Argon2id hash, revoke all sessions, `INCR user_ver`
- [x] **TASK-078:** Implement `PasswordService` — Argon2id hash/verify, complexity rules, history enforcement

#### Story 2.3: MFA — TOTP & Backup Codes (BE)

> TOTP enrolment, verification, and backup codes per `authn-authz-technical-plan.md §2.2`.

- [x] **TASK-079:** Implement `MfaService.enrol()` — generate TOTP secret, encrypt with AES-256-GCM (key from env), store in `MfaDevice.secretEncrypted`, return QR code URI
- [x] **TASK-080:** Implement `POST /auth/mfa/verify` — validate `mfaChallengeToken`, TOTP code check against decrypted secret, lock challenge after 3 fails, on success proceed to session creation
- [x] **TASK-081:** Implement backup codes — generate 10 codes, store as `argon2id(code)` hashes in `MfaDevice.backupCodesHashed`, delete matching hash on use (single-use)

#### Story 2.4: JWT Guards & Principal Hydration (BE)

> `JwtAuthGuard` (APP_GUARD), Redis version check, team cache, DB-ETag permission cache per `authn-authz-technical-plan.md §9–10`.

- [x] **TASK-082:** Implement `JwtAuthGuard` — HS512 verify, Redis `GET user_ver:{sub}` version check (mismatch → `JWT_STALE` 401), resolve team shortIds → ULIDs, hydrate `permissions`, assemble `RequestUser` on `req.user`
- [x] **TASK-083:** Implement `TeamShortIdCache` — in-process permanent `Map<shortId, ULID>`, lazy DB load on miss (`SELECT id, short_id FROM teams WHERE short_id = ANY($1)`), never evicted
- [x] **TASK-084:** Implement `PermissionCacheService.getFunctionalPermissions()` — `SELECT MAX(GREATEST(ur.assigned_at, r.updated_at)) AS etag`, compare to in-process cache, full fetch only on ETag mismatch
- [x] **TASK-085:** Implement `FunctionalPermissionGuard` and `@RequirePermission('resource:action')` decorator
- [x] **TASK-086:** Implement `@Public()` and `@CurrentUser()` decorators; seed Redis `user_ver:{userId}` to `0` on first login (`SET NX`)

#### Story 2.5: Permission Service — Row-Level Checks (BE)

> `PermissionService` core methods, resolution algorithm, cascade rules, system auto-grants per `authn-authz-technical-plan.md §5`.

- [x] **TASK-087:** Implement `PermissionService.can()` — collect grantees (USER + TEAM ids + ROLE ids), `SELECT MAX(accessLevel)` query, TEAM-role adjustment (LEAD keeps granted level; MEMBER capped below OWNER), request-scoped LRU cache per `(userId, resourceType, resourceId)`
- [x] **TASK-088:** Implement `PermissionService.assertCan()` (throws `ForbiddenException`) and `effectiveLevel()` (returns `AccessLevel | null`)
- [x] **TASK-089:** Implement cascade rule resolution (Step 4 of algorithm) — check `PermissionCascadeRule` where `fromResourceType = resourceType`, recurse via `can()` on parent resource
- [x] **TASK-090:** Implement `PermissionService.grant()` and `revoke()` — upsert `Permission` row, append `PermissionGrant` audit row, `adjustLevel()` for upgrades/downgrades
- [x] **TASK-091:** Implement `getDataScope()` (resolve highest `DataScopeType` across user's roles) and `getExplicitlyGrantedIds()` (for list-query OR clause)
- [x] **TASK-092:** Implement system auto-grants on record creation — `Candidate` (OWNER to creator, VIEW to creator's teams), `Job` (OWNER to creator, EDIT to `ownerUserId`, VIEW to client BD owner), `Client` (OWNER to `bdUserId`), `JobApplication` (EDIT to `ownerUserId`) per §5.5

#### Story 2.6: Team Service & Resolver (BE)

> Team CRUD, hierarchy expansion, member management per `authn-authz-technical-plan.md §3`.

- [x] **TASK-093:** Implement `TeamService` — create/update/delete team; `expandTeamTree(teamIds)` via recursive CTE; `getMemberIds(teamIds)` via `SELECT user_id FROM team_members WHERE team_id = ANY($1)`
- [x] **TASK-094:** Implement `TeamResolver` — GraphQL queries (`teams`, `team`) and mutations (`createTeam`, `updateTeam`, `addTeamMember`, `removeTeamMember`)
- [x] **TASK-095:** Wire all team membership changes to `INCR user_ver:{userId}` in Redis (add member, remove member, change role)

#### Story 2.7: User & Role Management (BE)

> User invite, role assignment, deactivation, custom roles per `authn-authz-technical-plan.md §4`.

- [x] **TASK-096:** Implement user invite flow — create `AuthIdentity` + `User`, send email with temporary password link; `TASK-053` superseded
- [x] **TASK-097:** Implement `UserRole` assignment and removal — write DB row, `INCR user_ver:{userId}`; `TASK-054` superseded
- [x] **TASK-098:** Implement user deactivation — `User.loginable = false`, `Session.revokedAt = now` (all), `INCR user_ver`; `TASK-055` superseded
- [x] **TASK-099:** Implement tenant custom role CRUD — create/update `Role` with `tenantId` set; built-in roles (`tenantId = null`) are read-only
- [x] **TASK-100:** Add user activity tracking — `User.lastInactiveAt`, `User.firstLogin`; `TASK-056` superseded

#### Story 2.8: Frontend — Login & Session Management (FE)

> Replace Clerk with first-party auth pages and Apollo auth link.

- [x] **WA-080:** Create login page (`/login`) — email + password form, `POST /auth/login`, store `accessToken` in memory and `refreshToken` in httpOnly cookie
- [x] **WA-081:** Update Apollo auth link — inject `Authorization: Bearer <accessToken>`; intercept `JWT_STALE` (401 `code: 'JWT_STALE'`) → `POST /auth/refresh` → retry original request transparently
- [x] **WA-082:** Implement logout — `POST /auth/logout`, clear tokens, redirect to `/login`; add logout button to sidebar/topbar
- [x] **WA-083:** Update `middleware.ts` — protect `(app)` routes by checking access token cookie/presence (remove Clerk dependency)
- [x] **WA-084:** Display user name + avatar in sidebar/topbar from `me` GraphQL query (replaces Clerk session); `WA-020`–`WA-024` superseded
- [x] **WA-085:** Handle MFA challenge screen — after login, if `mfaRequired: true`, prompt TOTP code before proceeding

#### Story 2.9: Frontend — MFA Enrolment & Password Reset (FE)

> TOTP enrolment flow and password reset pages.

- [ ] **WA-086:** Create MFA enrolment page — display QR code URI as scannable image, confirm a TOTP code to activate enrolment
- [ ] **WA-087:** Display backup codes after enrolment with one-time download prompt (plaintext list)
- [ ] **WA-088:** Create forgot-password page (`/forgot-password`) — email input, submit to `POST /auth/password-reset/request`, show confirmation message
- [ ] **WA-089:** Create reset-password page (`/reset-password?token=...`) — new password + confirm form, submit to `POST /auth/password-reset/confirm`, redirect to login on success

#### Story 2.10: Multi-tenancy & Org Switching (FE)

> Tenant context in JWT; UI for switching tenants (replaces Clerk `<OrganizationSwitcher>`).

- [ ] **WA-090:** Build tenant switcher UI — list user's tenants (from `me` query), selecting one re-issues JWT via `POST /auth/login` with `tenantSlug`; `WA-025` superseded
- [ ] **WA-091:** On tenant switch, clear Apollo cache and re-fetch with new `accessToken`; `WA-027` superseded
- [ ] **WA-092:** Create org setup / first-login page — prompt user to create or join a tenant after first successful login; `WA-026` superseded

---

### EPIC-003: Candidate Management

#### Story 3.1: Candidate API — CRUD (BE)

- [ ] **TASK-014:** Create Candidate GraphQL schema (queries/mutations)
- [ ] **TASK-015:** Implement Candidate service layer with validation
- [ ] **TASK-019:** Add Candidate deletion with confirmation

#### Story 3.2: Candidate API — Validation (BE)

- [ ] **TASK-020:** Implement email validation and uniqueness check
- [ ] **TASK-021:** Add phone number formatting and validation
- [ ] **TASK-022:** Create required field validation
- [ ] **TASK-023:** Implement data sanitization

#### Story 3.3: Candidate API — Search & Filtering (BE)

- [ ] **TASK-024:** Implement basic text search across candidate fields
- [ ] **TASK-025:** Add filtering by company, title, location
- [ ] **TASK-026:** Create sorting options (name, created date, updated date)
- [ ] **TASK-027:** Implement pagination with proper GraphQL cursors

#### Story 3.4: Candidate List Page (FE)

> Paginated table of candidates with key columns. Entry point for candidate management.

- [ ] **WA-028:** Create `/candidates` route with `PageHeader` ("Candidates" + "Add Candidate" button)
- [ ] **WA-029:** Build `CandidateTable` using shadcn `Table` — columns: name, email, company, title, location, status, updated
- [ ] **WA-030:** Connect to `candidates` GraphQL query with loading skeleton and empty state
- [ ] **WA-031:** Add pagination controls (cursor-based, matching API)
- [ ] **WA-032:** Add row click → navigate to candidate detail page

#### Story 3.5: Candidate Search & Filtering (FE)

> Text search and field-based filters to find candidates quickly.

- [ ] **WA-033:** Add search input to candidate list page (debounced, searches name/email/company/title)
- [ ] **WA-034:** Add filter controls: status dropdown, location text filter
- [ ] **WA-035:** Add sort controls: name, created date, updated date (toggle asc/desc)
- [ ] **WA-036:** Sync filter/sort/search state to URL query params (shareable links, back-button friendly)

#### Story 3.6: Candidate Create & Edit (FE)

> Form to create a new candidate or edit an existing one.

- [ ] **WA-037:** Create `/candidates/new` route with candidate form
- [ ] **WA-038:** Build `CandidateForm` component — fields: first name, last name, email, phone, current company, current title, location, LinkedIn URL, GitHub URL, notes, status
- [ ] **WA-039:** Add form validation (required fields, email format, URL format)
- [ ] **WA-040:** Wire form submit to `createCandidate` mutation with optimistic UI update
- [ ] **WA-041:** Create `/candidates/[id]` detail route showing full candidate profile
- [ ] **WA-042:** Add inline edit mode on detail page — toggle between view and edit
- [ ] **WA-043:** Wire edit form to `updateCandidate` mutation with optimistic cache update

#### Story 3.7: Candidate Delete (FE)

> Delete a candidate with confirmation dialog.

- [ ] **WA-044:** Add delete button on candidate detail page
- [ ] **WA-045:** Build confirmation dialog (shadcn `AlertDialog`) — "Delete [Name]? This cannot be undone."
- [ ] **WA-046:** Wire to `deleteCandidate` mutation and redirect to candidate list on success

---

### EPIC-004: Client Management

#### Story 4.1: Client API — CRUD (BE)

- [ ] **TASK-028:** Create Client GraphQL schema
- [ ] **TASK-029:** Implement Client service layer
- [ ] **TASK-033:** Add Client deletion with cascade rules

#### Story 4.2: Client API — Relationships (BE)

- [ ] **TASK-034:** Add client status tracking (prospect, active, inactive)
- [ ] **TASK-035:** Implement primary contact assignment
- [ ] **TASK-036:** Add client industry categorization
- [ ] **TASK-037:** Create client relationship timeline foundation

#### Story 4.3: Client List Page (FE)

> Paginated table of clients with company info.

- [ ] **WA-047:** Create `/clients` route with `PageHeader` ("Clients" + "Add Client" button)
- [ ] **WA-048:** Build `ClientTable` — columns: name, industry, website, status, jobs count, updated
- [ ] **WA-049:** Connect to `clients` GraphQL query with loading skeleton and empty state
- [ ] **WA-050:** Add pagination, search (name/industry), status filter, and sort controls
- [ ] **WA-051:** Add row click → navigate to client detail page

#### Story 4.4: Client Create & Edit (FE)

> Form to create or edit a client.

- [ ] **WA-052:** Create `/clients/new` route with client form
- [ ] **WA-053:** Build `ClientForm` component — fields: name, industry, website, phone, address, status, notes
- [ ] **WA-054:** Add form validation and wire to `createClient` mutation
- [ ] **WA-055:** Create `/clients/[id]` detail route with client profile + linked jobs section
- [ ] **WA-056:** Add inline edit mode on detail page, wired to `updateClient` mutation

#### Story 4.5: Client Delete (FE)

- [ ] **WA-057:** Add delete button with confirmation dialog (warn about linked jobs)
- [ ] **WA-058:** Wire to `deleteClient` mutation with cascade handling

---

### EPIC-005: Job Management

#### Story 5.1: Job API — CRUD (BE)

- [ ] **TASK-038:** Create Job GraphQL schema with Client relationship
- [ ] **TASK-039:** Implement Job service layer
- [ ] **TASK-043:** Add Job deletion and archiving

#### Story 5.2: Job API — Status Management (BE)

- [ ] **TASK-044:** Implement job status workflow (open, on-hold, filled, closed)
- [ ] **TASK-045:** Add job priority levels
- [ ] **TASK-046:** Create recruiter assignment functionality
- [ ] **TASK-047:** Add job requirements and description rich text editor

#### Story 5.3: Job List Page (FE)

> Paginated table of jobs with client relationship and status.

- [ ] **WA-059:** Create `/jobs` route with `PageHeader` ("Jobs" + "Add Job" button)
- [ ] **WA-060:** Build `JobTable` — columns: title, client name, status, priority, assigned recruiter, created
- [ ] **WA-061:** Connect to `jobs` GraphQL query with loading skeleton and empty state
- [ ] **WA-062:** Add pagination, search (title/client), status filter, priority filter, and sort controls
- [ ] **WA-063:** Add row click → navigate to job detail page

#### Story 5.4: Job Create & Edit (FE)

> Form to create or edit a job with client selector.

- [ ] **WA-064:** Create `/jobs/new` route with job form
- [ ] **WA-065:** Build `JobForm` component — fields: title, client (searchable selector), description (rich text or textarea), status, priority, assigned recruiter
- [ ] **WA-066:** Build `ClientSelector` — searchable dropdown that queries clients, shows selected client info
- [ ] **WA-067:** Add form validation and wire to `createJob` mutation
- [ ] **WA-068:** Create `/jobs/[id]` detail route with job info + linked candidates section (placeholder for Phase 2 pipeline)
- [ ] **WA-069:** Add inline edit mode on detail page, wired to `updateJob` mutation

#### Story 5.5: Job Delete & Status (FE)

- [ ] **WA-070:** Add delete button with confirmation dialog
- [ ] **WA-071:** Add status change controls on detail page (Open → On Hold → Filled → Closed) with one-click transitions

---

### EPIC-006: Dashboard & Command Palette

#### Story 6.1: Dashboard Page (FE)

> Landing page after login showing pipeline summary.

- [ ] **WA-072:** Create `/dashboard` route as default landing page (redirect `/` → `/dashboard`)
- [ ] **WA-073:** Build summary cards: total candidates, total clients, open jobs, candidates by status
- [ ] **WA-074:** Add recent activity list (last 10 created/updated candidates, clients, jobs)
- [ ] **WA-075:** Connect all cards to GraphQL aggregate queries

#### Story 6.2: Command Palette (FE)

> Cmd+K global search and quick actions — Superhuman-inspired speed.

- [ ] **WA-076:** Build command palette modal (shadcn `Dialog` + search input)
- [ ] **WA-077:** Add quick search across candidates, clients, jobs (federated query)
- [ ] **WA-078:** Add quick actions: "New Candidate", "New Client", "New Job", "Go to Settings"
- [ ] **WA-079:** Wire keyboard shortcut Cmd+K (global listener)

---

## Sprint Plan

### Sprint 1: Foundation ✅

**Goal:** Dev environment, app shell, GraphQL client connected

- Story 1.1 (Dev Environment Setup) ✅
- Story 1.4 (Sidebar Navigation) ✅
- Story 1.5 (Top Bar & Page Header) ✅
- Story 1.6 (Responsive Layout) ✅
- Story 1.7 (Apollo Client Setup) ✅
- Story 1.8 (GraphQL Codegen) ✅

### Sprint 2: Database, API Foundation & Auth Core (BE)

**Goal:** Migrations, API foundation, first-party auth service (login, sessions, password reset, MFA)

- Story 1.2 (Database Schema Foundation)
- Story 1.3 (API Foundation)
- Story 2.1 (Auth & Permission Database Schema)
- Story 2.2 (Auth Service — Login, Sessions & Password Reset)
- Story 2.3 (MFA — TOTP & Backup Codes)

### Sprint 3: Auth Guards, Permissions, Teams & Frontend Auth

**Goal:** Guards wired, row-level permissions live, frontend login replacing Clerk

- Story 2.4 (JWT Guards & Principal Hydration)
- Story 2.5 (Permission Service — Row-Level Checks)
- Story 2.6 (Team Service & Resolver)
- Story 2.7 (User & Role Management)
- Story 2.8 (Frontend — Login & Session Management)
- Story 2.9 (Frontend — MFA Enrolment & Password Reset)
- Story 2.10 (Multi-tenancy & Org Switching)

### Sprint 4: Candidate Management

**Goal:** Full candidate CRUD — backend API + frontend UI

- Story 3.1 (Candidate API — CRUD)
- Story 3.2 (Candidate API — Validation)
- Story 3.4 (Candidate List Page)
- Story 3.6 (Candidate Create & Edit)

### Sprint 5: Candidate Polish + Client Management

**Goal:** Candidate search/filter/delete, client CRUD

- Story 3.3 (Candidate API — Search & Filtering)
- Story 3.5 (Candidate Search & Filtering)
- Story 3.7 (Candidate Delete)
- Story 4.1 (Client API — CRUD)
- Story 4.2 (Client API — Relationships)
- Story 4.3 (Client List Page)
- Story 4.4 (Client Create & Edit)

### Sprint 6: Job Management + Polish

**Goal:** Job CRUD, client delete

- Story 4.5 (Client Delete)
- Story 5.1 (Job API — CRUD)
- Story 5.2 (Job API — Status Management)
- Story 5.3 (Job List Page)
- Story 5.4 (Job Create & Edit)
- Story 5.5 (Job Delete & Status)

### Sprint 7: Dashboard & Command Palette

**Goal:** Dashboard, command palette, bug fixes

- Story 6.1 (Dashboard Page)
- Story 6.2 (Command Palette)

---

## Progress

### Completion Status

- **EPICs:** 0/6 Complete
- **Stories:** 12/34 Complete
- **Tasks:** 63/165 Complete (30 BE + 33 FE)

> Note: Sprint 1 FE stories remain complete. Clerk BE/FE work (Stories 2.1–2.3 old, TASK-048–064, WA-020–027) is superseded by the first-party auth plan. Task counts reset for EPIC-002 BE work.

### Current Sprint

**Sprint:** Sprint 3
**Active Stories:** Story 2.9 (Frontend — MFA Enrolment & Password Reset) — next up
**Blocked Items:** None

---

## Definition of Done

### For Tasks:

- Component renders correctly with no console errors
- Responsive at desktop (1280px+) and tablet (768px+) breakpoints
- Keyboard navigable (tab order, enter to submit, escape to cancel)
- Loading and empty states handled

### For Stories:

- All tasks completed and tested
- GraphQL schema updated and documented
- Frontend components styled with Shadcn/ui
- Connected to real GraphQL API (not mocked)
- No TypeScript errors

### For EPICs:

- All stories completed
- Integration testing passed
- Performance meets requirements (< 200ms API response)
- Cross-page navigation works correctly
- Data persists across page refreshes
- Multi-tenant data isolation verified

---

## Change Log

| Date       | Change                                                   | Impact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-22 | Initial backend project breakdown                        | 5 EPICs, 11 Stories, 56 Tasks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-03-15 | Web-app frontend task breakdown                          | 7 EPICs, 17 Stories, 79 Tasks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-03-15 | Merged backend + frontend into unified plan              | 6 EPICs, 27 Stories, 121 Tasks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-02 | Replaced Clerk with first-party auth system              | EPIC-002 rewritten: 10 stories (2.1–2.10), 36 new tasks (TASK-065–100, WA-080–092); Clerk stories/tasks superseded; Sprint 3 added for auth guards + FE auth; sprints renumbered 2–7; story count 34, task count 165                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-02 | Story 2.1 complete — Auth & Permission database schema   | Added 16 new models (AuthIdentity, Session, MfaDevice, PasswordResetToken, PasswordHistory, PasswordPolicy, Role, UserRole, RoleDataScope, Team, TeamMember, Permission, PermissionGrant, PermissionCascadeRule, PermissionInheritance, ShareToken, AuditLog) + 7 new enums; updated Tenant (slug), User (loginable, firstLogin, authIdentityId), Candidate/Client/Job (ownerUserId, createdById); seeded 4 built-in roles + 12 data scope rows + 5 cascade rules; TASK-065–072 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-02 | Stories 2.2 + 2.3 complete — Auth Service, MFA           | AuthService (login, refresh, logout×2, password-reset request+confirm), PasswordService (Argon2id hash/verify, complexity, history), MfaService (TOTP enrol, AES-256-GCM secret encryption, challenge-based verify, 10 single-use backup codes), RedisService (user_ver, rate-limit, challenge store); REST controller at `/auth/*`; deps: argon2, jsonwebtoken, ioredis, otplib; seed real Argon2id hash; TASK-073–081 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-05-03 | Story 2.7 complete — User & Role Management              | UserService (invite with PasswordResetToken invite link, assignRole + removeRole with INCR user_ver, deactivate + reactivate with session revocation); RoleModule (RoleService + RoleResolver: findAll/findById/create/update/delete for tenant-scoped custom roles, built-in guard, bumps user_ver for all role holders on update/delete); UserModel gains `firstLogin` + `lastInactiveAt` fields; `ActivityAction` enum extended with USER_DEACTIVATED + USER_REACTIVATED; PasswordService exported from AuthModule; TASK-096–100 complete                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-03 | Story 2.8 complete — Frontend Login & Session Management | Replaced Clerk with first-party auth across the web-app shell. Next.js route handlers (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/mfa-verify`) proxy to NestJS and own the httpOnly `cura_refresh` cookie lifecycle. `token-store.ts`: module-level access token (survives re-renders, readable by Apollo). `auth-context.tsx`: React context for user info + login/logout/completeMfa actions. Apollo auth link rebuilt — injects memory token, detects `JWT_STALE` GraphQL error, refreshes via `/api/auth/refresh`, retries once. `middleware.ts` replaced `clerkMiddleware` with refresh-cookie presence check. Sidebar `UserSection` shows initials avatar + display name + logout button. `/login` page with inline MFA TOTP step on `mfaRequired: true`. Old Clerk pages (`/sign-in`, `/sign-up`, `/org-setup`) redirect to `/login`/`/dashboard`. `me` query added to schema + codegen regenerated; WA-080–085 complete |

---

**Next Phase Preview:** Phase 2 will add Kanban pipeline management and real-time collaborative features.
