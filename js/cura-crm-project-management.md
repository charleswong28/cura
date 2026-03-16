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

**Objective:** Clerk login/signup, org switching, route protection, JWT tenant context, role-based access
**Priority:** P0 — security critical
**Depends on:** Clerk account setup

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

#### Story 2.1: Clerk Backend Integration (BE)

- [x] **TASK-048:** Set up Clerk Organizations for multi-tenancy
- [x] **TASK-049:** Configure JWT with tenant_id custom claims
- [x] **TASK-050:** Implement ClerkAuthGuard for NestJS
- [x] **TASK-052:** Test tenant data isolation

#### Story 2.2: Clerk Frontend Integration (FE)

> Protect all CRM routes behind Clerk login. Show sign-in/sign-up pages for unauthenticated users.

- [x] **WA-020:** Install `@clerk/nextjs` and configure `ClerkProvider` in root layout
- [x] **WA-021:** Create sign-in page (`/sign-in/[[...sign-in]]/page.tsx`)
- [x] **WA-022:** Create sign-up page (`/sign-up/[[...sign-up]]/page.tsx`)
- [x] **WA-023:** Add `clerkMiddleware` in `middleware.ts` to protect `(app)` routes
- [x] **WA-024:** Display user name + avatar in sidebar/topbar from Clerk session

#### Story 2.2.1: Clerk Webhook Sync (BE)

> Provision Tenant and User records automatically when orgs/users are created or updated in Clerk.

- [x] **TASK-057:** Install `svix` package for webhook signature verification
- [x] **TASK-058:** Create `/webhooks/clerk` REST endpoint (WebhookController) with raw body parsing and Svix signature verification
- [x] **TASK-059:** Handle `organization.created` event — create Tenant row with `clerkOrgId` + org name
- [x] **TASK-060:** Handle `organization.updated` event — update Tenant name
- [x] **TASK-061:** Handle `organizationMembership.created` event — create User row linked to Tenant (resolve clerkOrgId → tenantId, set email/name/role from Clerk)
- [x] **TASK-062:** Handle `organizationMembership.deleted` event — delete User row
- [x] **TASK-063:** Handle `user.updated` event — update User email/name
- [x] **TASK-064:** Add `CLERK_WEBHOOK_SECRET` to `.env.example` and document Clerk Dashboard webhook setup

#### Story 2.3: Organization Switching (FE)

> Recruiters can switch between tenants (Clerk Organizations). Active org determines tenant context.

- [x] **WA-025:** Add Clerk `<OrganizationSwitcher>` to sidebar
- [x] **WA-026:** Create organization setup page for first-time users (create or join org)
- [x] **WA-027:** Ensure Apollo Client re-fetches data on org switch (cache clear + refetch)

#### Story 2.4: User Management (BE)

- [ ] **TASK-053:** Create user profile management
- [ ] **TASK-054:** Implement role-based permissions (admin, recruiter)
- [ ] **TASK-055:** Add user invitation workflow
- [ ] **TASK-056:** Create user activity tracking foundation

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

### Sprint 2: Database, API Foundation & Auth

**Goal:** Migrations, seed data, API foundation, Clerk auth on both ends

- Story 1.2 (Database Schema Foundation)
- Story 1.3 (API Foundation)
- Story 2.1 (Clerk Backend Integration)
- Story 2.2 (Clerk Frontend Integration)
- Story 2.3 (Organization Switching)

### Sprint 3: Candidate Management

**Goal:** Full candidate CRUD — backend API + frontend UI

- Story 3.1 (Candidate API — CRUD)
- Story 3.2 (Candidate API — Validation)
- Story 3.4 (Candidate List Page)
- Story 3.6 (Candidate Create & Edit)

### Sprint 4: Candidate Polish + Client Management

**Goal:** Candidate search/filter/delete, client CRUD

- Story 3.3 (Candidate API — Search & Filtering)
- Story 3.5 (Candidate Search & Filtering)
- Story 3.7 (Candidate Delete)
- Story 4.1 (Client API — CRUD)
- Story 4.2 (Client API — Relationships)
- Story 4.3 (Client List Page)
- Story 4.4 (Client Create & Edit)

### Sprint 5: Job Management + Polish

**Goal:** Job CRUD, client delete, dashboard, command palette

- Story 4.5 (Client Delete)
- Story 5.1 (Job API — CRUD)
- Story 5.2 (Job API — Status Management)
- Story 5.3 (Job List Page)
- Story 5.4 (Job Create & Edit)
- Story 5.5 (Job Delete & Status)

### Sprint 6: Dashboard, User Management & Polish

**Goal:** Dashboard, command palette, user management, bug fixes

- Story 2.4 (User Management)
- Story 6.1 (Dashboard Page)
- Story 6.2 (Command Palette)

---

## Progress

### Completion Status

- **EPICs:** 0/6 Complete
- **Stories:** 11/28 Complete
- **Tasks:** 52/129 Complete (25 BE + 27 FE)

### Current Sprint

**Sprint:** Sprint 2
**Active Stories:** Story 2.1 ✅, Story 2.2 ✅, Story 2.2.1 ✅, Story 2.3 ✅, Story 2.4 (next)
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

| Date       | Change                                      | Impact                         |
| ---------- | ------------------------------------------- | ------------------------------ |
| 2026-02-22 | Initial backend project breakdown           | 5 EPICs, 11 Stories, 56 Tasks  |
| 2026-03-15 | Web-app frontend task breakdown             | 7 EPICs, 17 Stories, 79 Tasks  |
| 2026-03-15 | Merged backend + frontend into unified plan | 6 EPICs, 27 Stories, 121 Tasks |

---

**Next Phase Preview:** Phase 2 will add Kanban pipeline management and real-time collaborative features.
