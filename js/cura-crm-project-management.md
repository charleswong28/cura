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

- [x] **WA-086:** Create MFA enrolment page — display QR code URI as scannable image, confirm a TOTP code to activate enrolment
- [x] **WA-087:** Display backup codes after enrolment with one-time download prompt (plaintext list)
- [x] **WA-088:** Create forgot-password page (`/forgot-password`) — email input, submit to `POST /auth/password-reset/request`, show confirmation message
- [x] **WA-089:** Create reset-password page (`/reset-password?token=...`) — new password + confirm form, submit to `POST /auth/password-reset/confirm`, redirect to login on success

#### Story 2.10: Multi-tenancy & Org Switching (FE)

> Tenant context in JWT; UI for switching tenants (replaces Clerk `<OrganizationSwitcher>`).

- [x] **WA-090:** Build tenant switcher UI — list user's tenants (from `myTenants` query), selecting one re-issues JWT via `POST /auth/switch-tenant` with `tenantSlug`; `WA-025` superseded
- [x] **WA-091:** On tenant switch, clear Apollo cache and re-fetch with new `accessToken`; `WA-027` superseded
- [x] **WA-092:** Create org setup / first-login page — prompt user to create or join a tenant after first successful login; `WA-026` superseded

---

### EPIC-003: Candidate Management

#### Story 3.1: Candidate API — CRUD (BE)

- [x] **TASK-014:** Create Candidate GraphQL schema (queries/mutations)
- [x] **TASK-015:** Implement Candidate service layer with validation
- [x] **TASK-019:** Add Candidate deletion with confirmation

#### Story 3.2: Candidate API — Validation (BE)

- [x] **TASK-020:** Implement email validation and uniqueness check
- [x] **TASK-021:** Add phone number formatting and validation
- [x] **TASK-022:** Create required field validation
- [x] **TASK-023:** Implement data sanitization

#### Story 3.3: Candidate API — Search & Filtering (BE)

- [x] **TASK-024:** Implement basic text search across candidate fields
- [x] **TASK-025:** Add filtering by company, title, location
- [x] **TASK-026:** Create sorting options (name, created date, updated date)
- [x] **TASK-027:** Implement pagination with proper GraphQL cursors

#### Story 3.4: Candidate List Page (FE)

> Paginated table of candidates with key columns. Entry point for candidate management.

- [x] **WA-028:** Create `/candidates` route with `PageHeader` ("Candidates" + "Add Candidate" button)
- [x] **WA-029:** Build `CandidateTable` using shadcn `Table` — columns: name, email, company, title, location, status, updated
- [x] **WA-030:** Connect to `candidates` GraphQL query with loading skeleton and empty state
- [x] **WA-031:** Add pagination controls (cursor-based, matching API)
- [x] **WA-032:** Add row click → navigate to candidate detail page

#### Story 3.5: Candidate Search & Filtering (FE)

> Text search and field-based filters to find candidates quickly.

- [x] **WA-033:** Add search input to candidate list page (debounced, searches name/email/company/title)
- [x] **WA-034:** Add filter controls: status dropdown, location text filter
- [x] **WA-035:** Add sort controls: name, created date, updated date (toggle asc/desc)
- [x] **WA-036:** Sync filter/sort/search state to URL query params (shareable links, back-button friendly)

#### Story 3.6: Candidate Create & Edit (FE)

> Form to create a new candidate or edit an existing one.

- [x] **WA-037:** Create `/candidates/new` route with candidate form
- [x] **WA-038:** Build `CandidateForm` component — fields: first name, last name, email, phone, current company, current title, location, LinkedIn URL, GitHub URL, notes, status
- [x] **WA-039:** Add form validation (required fields, email format, URL format)
- [x] **WA-040:** Wire form submit to `createCandidate` mutation with optimistic UI update
- [x] **WA-041:** Create `/candidates/[id]` detail route showing full candidate profile
- [x] **WA-042:** Add inline edit mode on detail page — toggle between view and edit
- [x] **WA-043:** Wire edit form to `updateCandidate` mutation with optimistic cache update

#### Story 3.7: Candidate Delete (FE)

> Delete a candidate with confirmation dialog.

- [x] **WA-044:** Add delete button on candidate detail page
- [x] **WA-045:** Build confirmation dialog (shadcn `AlertDialog`) — "Delete [Name]? This cannot be undone."
- [x] **WA-046:** Wire to `deleteCandidate` mutation and redirect to candidate list on success

---

### EPIC-004: Client Management

#### Story 4.1: Client API — CRUD (BE)

- [x] **TASK-028:** Create Client GraphQL schema
- [x] **TASK-029:** Implement Client service layer
- [x] **TASK-033:** Add Client deletion with cascade rules

#### Story 4.2: Client API — Relationships (BE)

- [x] **TASK-034:** Add client status tracking (prospect, active, inactive)
- [x] **TASK-035:** Implement primary contact assignment
- [x] **TASK-036:** Add client industry categorization
- [x] **TASK-037:** Create client relationship timeline foundation

#### Story 4.3: Client List Page (FE)

> Paginated table of clients with company info.

- [x] **WA-047:** Create `/clients` route with `PageHeader` ("Clients" + "Add Client" button)
- [x] **WA-048:** Build `ClientTable` — columns: name, industry, website, status, jobs count, updated
- [x] **WA-049:** Connect to `clients` GraphQL query with loading skeleton and empty state
- [x] **WA-050:** Add pagination, search (name/industry), status filter, and sort controls
- [x] **WA-051:** Add row click → navigate to client detail page

#### Story 4.4: Client Create & Edit (FE)

> Form to create or edit a client.

- [x] **WA-052:** Create `/clients/new` route with client form
- [x] **WA-053:** Build `ClientForm` component — fields: name, industry, website, phone, address, status, notes
- [x] **WA-054:** Add form validation and wire to `createClient` mutation
- [x] **WA-055:** Create `/clients/[id]` detail route with client profile + linked jobs section
- [x] **WA-056:** Add inline edit mode on detail page, wired to `updateClient` mutation

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
- **Stories:** 18/34 Complete
- **Tasks:** 98/165 Complete (39 BE + 59 FE)

> Note: Sprint 1 FE stories remain complete. Clerk BE/FE work (Stories 2.1–2.3 old, TASK-048–064, WA-020–027) is superseded by the first-party auth plan. Task counts reset for EPIC-002 BE work.

### Current Sprint

**Sprint:** Sprint 5 — In Progress
**Active Stories:** Story 4.4 complete; Client Delete next (Story 4.5)
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

| Date       | Change                                                                                       | Impact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-22 | Initial backend project breakdown                                                            | 5 EPICs, 11 Stories, 56 Tasks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-03-15 | Web-app frontend task breakdown                                                              | 7 EPICs, 17 Stories, 79 Tasks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-03-15 | Merged backend + frontend into unified plan                                                  | 6 EPICs, 27 Stories, 121 Tasks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-05-02 | Replaced Clerk with first-party auth system                                                  | EPIC-002 rewritten: 10 stories (2.1–2.10), 36 new tasks (TASK-065–100, WA-080–092); Clerk stories/tasks superseded; Sprint 3 added for auth guards + FE auth; sprints renumbered 2–7; story count 34, task count 165                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-02 | Story 2.1 complete — Auth & Permission database schema                                       | Added 16 new models (AuthIdentity, Session, MfaDevice, PasswordResetToken, PasswordHistory, PasswordPolicy, Role, UserRole, RoleDataScope, Team, TeamMember, Permission, PermissionGrant, PermissionCascadeRule, PermissionInheritance, ShareToken, AuditLog) + 7 new enums; updated Tenant (slug), User (loginable, firstLogin, authIdentityId), Candidate/Client/Job (ownerUserId, createdById); seeded 4 built-in roles + 12 data scope rows + 5 cascade rules; TASK-065–072 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-02 | Stories 2.2 + 2.3 complete — Auth Service, MFA                                               | AuthService (login, refresh, logout×2, password-reset request+confirm), PasswordService (Argon2id hash/verify, complexity, history), MfaService (TOTP enrol, AES-256-GCM secret encryption, challenge-based verify, 10 single-use backup codes), RedisService (user_ver, rate-limit, challenge store); REST controller at `/auth/*`; deps: argon2, jsonwebtoken, ioredis, otplib; seed real Argon2id hash; TASK-073–081 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-03 | Story 2.7 complete — User & Role Management                                                  | UserService (invite with PasswordResetToken invite link, assignRole + removeRole with INCR user_ver, deactivate + reactivate with session revocation); RoleModule (RoleService + RoleResolver: findAll/findById/create/update/delete for tenant-scoped custom roles, built-in guard, bumps user_ver for all role holders on update/delete); UserModel gains `firstLogin` + `lastInactiveAt` fields; `ActivityAction` enum extended with USER_DEACTIVATED + USER_REACTIVATED; PasswordService exported from AuthModule; TASK-096–100 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-03 | Story 2.8 complete — Frontend Login & Session Management                                     | Replaced Clerk with first-party auth across the web-app shell. Next.js route handlers (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/mfa-verify`) proxy to NestJS and own the httpOnly `cura_refresh` cookie lifecycle. `token-store.ts`: module-level access token (survives re-renders, readable by Apollo). `auth-context.tsx`: React context for user info + login/logout/completeMfa actions. Apollo auth link rebuilt — injects memory token, detects `JWT_STALE` GraphQL error, refreshes via `/api/auth/refresh`, retries once. `middleware.ts` replaced `clerkMiddleware` with refresh-cookie presence check. Sidebar `UserSection` shows initials avatar + display name + logout button. `/login` page with inline MFA TOTP step on `mfaRequired: true`. Old Clerk pages (`/sign-in`, `/sign-up`, `/org-setup`) redirect to `/login`/`/dashboard`. `me` query added to schema + codegen regenerated; WA-080–085 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-04 | Story 3.1 complete — Candidate API CRUD                                                      | `linkedinUrl` + `githubUrl` added to Prisma schema + migration; `CandidateModel` GraphQL type updated; `CreateCandidateInput` gains URL validation (https-only `IsUrl`), `MaxLength` guards, `status` field; `UpdateCandidateInput` simplified to pure `PartialType`; `CandidateService` refactored to accept `RequestUser` throughout — `findAll` applies data-scope filtering (ALL/TEAM_TREE/MY_TEAMS/MINE/EXPLICIT), `findById` + `update` + `softDelete` call `assertCan` for row-level checks, `create` + `update` enforce email uniqueness with `ConflictException`; `CandidateResolver` adds `@RequirePermission("candidate:create")` and `@RequirePermission("candidate:delete")`; TASK-014, TASK-015, TASK-019 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-04 | Story 3.2 complete — Candidate API Validation                                                | `@IsNotEmpty` on `firstName`/`lastName` (TASK-022); `@Matches(/^\+?[1-9][\d\s\-(). ]{5,28}$/)` replaces bare `@IsString` on `phone` (TASK-021); `@Transform` on all string inputs — trim whitespace, lowercase email, blank optional strings normalised to `undefined` (TASK-023); email uniqueness queries use Prisma `mode:'insensitive'` in both `create` and `update` paths; email stored pre-lowercased by DTO transform (TASK-020); TASK-020–023 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-05-17 | Story 3.3 complete — Candidate API Search & Filtering                                        | `candidates` query now returns Relay-style `CandidateConnection` (`edges{cursor node}`, `pageInfo{hasNextPage,hasPreviousPage,startCursor,endCursor}`, `totalCount`). New shared `PageInfo` GraphQL model; new `CandidateConnection`/`CandidateEdge` types; new `CandidateFilterInput` (search, status, currentCompany, currentTitle, location — all case-insensitive contains except status); new `CandidateSortField` + `SortOrder` enums (NAME/CREATED_AT/UPDATED_AT × ASC/DESC, default UPDATED_AT DESC). Cursor = base64url(id), opaque to clients; pagination via Prisma `cursor`+`skip:1`+`take:N+1` to compute `hasNextPage` cheaply; backward pagination via inverted orderBy + reverse. Search spans firstName/lastName/email/currentCompany/currentTitle. Stable ordering enforced by tying every sort to a secondary `id` clause. Data-scope filter (ALL/TEAM_TREE/MY_TEAMS/MINE/EXPLICIT) preserved and AND-combined with user filters. Page size default 20, max 100; rejects `first`+`last` or `after`+`before` combos with `BadRequestException`. TASK-024–027 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-05-17 | Story 3.5 complete — Candidate Search & Filtering (FE)                                       | New `CandidateFilters` component (`src/components/candidates/candidate-filters.tsx`): debounced search input (300ms via new `useDebouncedValue` hook at `src/lib/use-debounced-value.ts`), status dropdown (`Any/Active/Inactive/Placed/Blacklisted` — `ANY` sentinel mapped to "filter omitted"), free-text location input (also debounced 300ms), sort-field dropdown (`Last updated/Date created/Name`) + ASC/DESC arrow-icon toggle button, "Clear" pill that resets to defaults (only shown when state differs from defaults). `/candidates` page rewritten as `<Suspense>`-wrapped inner component (required by `useSearchParams` in client components) — reads initial state once from URL (`q`/`status`/`loc`/`sort`/`order`), pushes state → URL via `router.replace` (default values omitted to keep URLs clean), resets cursor to `first` whenever the effective filter key changes so paging restarts on every filter mutation. Verified end-to-end with Playwright: typing "alice" → `?q=alice` (debounce honoured), status select → `?status=ACTIVE`, sort toggle → `&order=ASC`, sort change → `&sort=NAME&order=ASC`; reload of `?status=ACTIVE&sort=NAME&order=ASC` restores all three controls and re-runs the query (3 active candidates sorted by lastName ASC). WA-033–036 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-17 | Story 3.6 complete — Candidate Create & Edit (FE)                                            | New routes `/candidates/new` and `/candidates/[id]`. New `Textarea` UI primitive at `src/components/ui/textarea.tsx`. New `CandidateForm` component (`src/components/candidates/candidate-form.tsx`) — single reusable form for create + edit with all 11 fields (firstName/lastName required, email/phone/URL formats validated). Client validation mirrors API DTO: required name fields, RFC-style email regex, phone regex `/^\+?[1-9][\d\s\-(). ]{5,28}$/`, URLs must be valid AND `https://` only (matches `@IsUrl({protocols:["https"]})` on the API). Per-field inline error rendering + `aria-invalid`. `toCandidateInput()` helper trims everything, drops empty strings to `undefined`. **Create page (`/candidates/new`):** `useMutation(CreateCandidateDocument)`, `refetchQueries: [Candidates]` so list is fresh on return, sonner success toast `"Created <Name>"`, then `router.push("/candidates/<id>")`. **Detail page (`/candidates/[id]`):** Next.js 15 async params via `use(params)`, `useQuery(CandidateDocument)`, view mode is a 2-column `<dl>` of email (mailto), phone, location, title, LinkedIn (https, target=\_blank), GitHub, plus notes section. Edit toggle re-uses `CandidateForm` with `initial` values pre-filled from cache; `useMutation(UpdateCandidateDocument)` with `optimisticResponse` (full `CandidateModel` payload incl. `__typename` + bumped `updatedAt`) so the cache updates instantly via id-based normalization. Verified end-to-end with Playwright (single-session script at `/tmp/cura-pw/verify-3.6.js`): empty submit shows both name errors; `http://` LinkedIn shows "URL must use https://"; valid submission creates Pat Tester, redirects to `/candidates/<ulid>`, toast renders; Edit → set company → Save changes immediately shows "at Acme Corp" under the status badge; list now shows Pat Tester with "Acme Corp" and "just now" timestamp at the top. `tsc --noEmit` passes. WA-037–043 complete |
| 2026-05-17 | Story 3.4 complete — Candidate List Page                                                     | **Schema sync:** web-app `schema.graphql` replaced with API's authoritative `schema.gql` — type renames `Candidate`/`Client`/`Job`/`User`/`Tenant` → `*Model`; Apollo cache `typePolicies` updated to match. Stale `clients/` and `jobs/` `.graphql` document folders deleted (Stories 4.1/5.1 will recreate). `candidate-queries.graphql` rewritten to use `filter: CandidateFilterInput`, `sortBy: CandidateSortField`, `sortOrder: SortOrder` and new `pageInfo` shape (adds `hasPreviousPage`, `startCursor`). `DeleteCandidate` mutation updated to select `id, deletedAt` (API now returns `CandidateModel!`, not Boolean). **UI:** `CandidatesPage` (`/candidates`) — `useQuery(CandidatesDocument)` gated on `useAuth().user` to wait for refresh-cookie hydration before firing the request; new `CandidateTable` component with skeleton row loading state, empty state ("No candidates yet"), row click → `router.push("/candidates/<id>")`, columns: Name / Email / Company / Title / Location / Status / Updated (relative time formatter); new `CandidateStatusBadge` with per-status color (ACTIVE/INACTIVE/PLACED/BLACKLISTED); new `CandidatePagination` (Previous/Next disabled when at edges, "Showing N of M • 20 per page" counter). Cursor state machine: `first` → `forward(after)` → `backward(before)`. Verified end-to-end via Playwright: all 5 seeded candidates render with correct status badges, row click navigates. WA-028–032 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-17 | Stories 4.1 + 4.2 complete — Client API CRUD                                                 | `ClientService` rewritten with permission-aware data scoping (`getDataScope` + `bdUserId` as owner field), row-level `assertCan` checks on findById/update/softDelete, `@RequirePermission("client:create/delete")` on mutations. `softDelete` cascades to linked jobs. Relay-style `ClientConnection` pagination with `ClientFilterInput` (search/status/industry), `ClientSortField` enum. `notes` field added to Prisma schema + migration `20260517120000_add_client_notes`. `CreateClientInput` upgraded with `@IsNotEmpty`, `@Transform`, `status` and `notes` fields. TASK-028, TASK-029, TASK-033, TASK-034, TASK-035, TASK-036 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-17 | Story 4.2 TASK-037 + Story 4.3 complete — Client timeline foundation + Client List Page (FE) | **TASK-037:** `ClientTimelineEntry` ObjectType + `ClientTimelineEventType` enum (`CLIENT_CREATED`, `CONTACT_ADDED`, `JOB_OPENED`); `ClientService.getTimeline()` aggregates events from existing tables (client create, contacts, jobs) sorted newest-first; `clientTimeline(id: ID!)` query on `ClientResolver`. **Story 4.3:** `schema.graphql` updated — added `ClientConnection`/`ClientEdge`, `ClientFilterInput`, `ClientSortField` enum, `ClientTimelineEntry`/`EventType`, `notes` on `ClientModel`/`CreateClientInput`/`UpdateClientInput`, `clients` query upgraded to Relay pagination + `clientTimeline` query; client GraphQL documents (fragment/queries/mutations) + codegen run; `ClientStatusBadge` (ACTIVE emerald / PROSPECT blue / INACTIVE zinc); `ClientTable` (name, industry, website hostname, status badge, active/total jobs, relative time; skeleton + empty state); `ClientFilters` (debounced search, status dropdown, sort field/order toggle, clear); `ClientPagination` (prev/next cursor state machine); `/clients` page mirrors candidates pattern — `Suspense` wrapper, URL-synced filter state, skips query until auth hydrates, error banner. WA-047–051, TASK-037 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-04 | Story 2.10 complete — Multi-tenancy & Org Switching                                          | **Backend:** `TenantModel` GraphQL type; `myTenants` query on `UserResolver` (cross-tenant lookup via `authIdentityId`); `POST /auth/switch-tenant` endpoint (validates refresh token, resolves user in target tenant, revokes old session, issues new one); new `TenantModule` with `TenantService.create()` + `createTenant` GraphQL mutation for org setup. **Frontend:** `Tenant` type + `myTenants` query + `CreateTenant` mutation added to `schema.graphql` + codegen run; Apollo singleton extracted to `apollo-instance.ts` (shared by `ApolloProvider` and `auth-context`); `switchTenant(slug)` added to `auth-context` — calls `/api/auth/switch-tenant`, sets new token, calls `apolloClient.resetStore()` to re-fetch with new tenant; `/api/auth/switch-tenant` Next.js proxy route; `TenantSwitcher` Popover component in sidebar (shows org name + checkmark on current, lists all orgs, "Create organization" link); `/org-setup` page rebuilt — name + auto-slug form, `createTenant` mutation, then `switchTenant` to land in new org; WA-090–092 complete. Sprint 3 complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

| 2026-05-18 | Story 4.4 complete — Client Create & Edit (FE) | New routes `/clients/new` and `/clients/[id]`; reusable `ClientForm` (`src/components/clients/client-form.tsx`) with name (required), industry, website (URL-validated via `new URL()`), phone, address, status (PROSPECT default), notes; `toClientInput()` trims and drops empties. Create page: `useMutation(CreateClientDocument)` + `refetchQueries: [Clients]` + sonner toast + `router.push("/clients/<id>")`. Detail page: Next.js 15 async `params` via `use(params)`; view mode is 2-column `<dl>` (website/phone/address/industry) + status badge + Notes + **Jobs** section (`activeJobCount · totalJobCount` + dashed placeholder until Story 5.x) + **Activity** section wired to existing `clientTimeline` query; Edit toggle re-uses `ClientForm` pre-filled from cache; `useMutation(UpdateClientDocument)` with full `optimisticResponse`. **BE blocker fix:** `ClientService.create` now defaults `bdUserId` to `user.userId` when not provided, so `autoGrantOnClientCreate` actually grants OWNER to the creator (previously a no-op when `bdUserId` was null, leaving creators with `403 VIEW` on findById). Also: applied pending migration `20260517120000_add_client_notes` to local DB and re-ran `prisma generate`. Verified end-to-end with Playwright (`/tmp/cura-pw-4.4/verify.js`): empty submit → name error; "not-a-url" → URL error; valid submit creates, redirects, detail renders all fields + activity entry; edit → "Client updated" toast → view re-renders with new values. WA-052–056 complete |

---

**Next Phase Preview:** Phase 2 will add Kanban pipeline management and real-time collaborative features.
