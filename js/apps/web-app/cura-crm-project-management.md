# Cura CRM — Web App (Phase 1) Project Management

## Project Status: Planning

**Phase 1 Goal:** Build the CRM frontend — app shell, authentication, and full CRUD for Candidates, Clients, and Jobs
**Design Philosophy:** Superhuman-inspired — keyboard-first, fast, minimal clicks, zero clutter
**Depends on:** API backend (GraphQL at port 8000), Clerk (auth), Prisma schema (entities)
**Current state:** Blank Next.js 16 app with shadcn/ui components. No routes, no layouts, no API integration.

---

## EPICs

### EPIC-WA-001: App Shell & Navigation

**Objective:** Build the persistent layout — sidebar, topbar, and page structure
**Priority:** P0 — everything else builds on this
**Depends on:** Nothing (can start immediately)

### EPIC-WA-002: GraphQL Client & Data Layer

**Objective:** Connect frontend to NestJS GraphQL API with typed hooks
**Priority:** P0 — all CRUD pages depend on this
**Depends on:** API resolvers for target entities

### EPIC-WA-003: Authentication & Multi-tenancy UI

**Objective:** Clerk login, signup, org switching, and route protection
**Priority:** P0 — security critical
**Depends on:** Clerk account setup, API Clerk integration (TASK-048–052 in main plan)

### EPIC-WA-004: Candidate Management UI

**Objective:** Full CRUD interface for candidate profiles
**Priority:** P0 — core feature
**Depends on:** EPIC-WA-001, EPIC-WA-002, API Candidate resolvers

### EPIC-WA-005: Client Management UI

**Objective:** Full CRUD interface for client/company records
**Priority:** P1
**Depends on:** EPIC-WA-001, EPIC-WA-002, API Client resolvers

### EPIC-WA-006: Job Management UI

**Objective:** Full CRUD interface for job orders with client relationship
**Priority:** P1
**Depends on:** EPIC-WA-001, EPIC-WA-002, EPIC-WA-005 (client selector), API Job resolvers

### EPIC-WA-007: Dashboard & Overview

**Objective:** Landing page with pipeline summary and key metrics
**Priority:** P2 — polish after CRUD is working
**Depends on:** EPIC-WA-004, EPIC-WA-005, EPIC-WA-006

---

## Stories & Tasks

### EPIC-WA-001: App Shell & Navigation

#### Story WA-1.1: Sidebar Navigation

> Persistent left sidebar with links to all CRM sections. Collapsible on smaller screens.

- [x] **WA-001:** Create app shell layout (`(app)/layout.tsx`) with sidebar + main content area
- [x] **WA-002:** Build `Sidebar` component with navigation links (Dashboard, Candidates, Clients, Jobs, Settings)
- [x] **WA-003:** Add active route highlighting using `usePathname`
- [x] **WA-004:** Implement sidebar collapse/expand toggle with persistent state (localStorage)
- [x] **WA-005:** Add keyboard shortcut for sidebar toggle (e.g., `Cmd+b`)

#### Story WA-1.2: Top Bar & Page Header

> Consistent top bar with breadcrumbs, search, and user menu.

- [x] **WA-006:** Build `TopBar` component with breadcrumb trail and user avatar area
- [x] **WA-007:** Create `PageHeader` component (title, description, action buttons) — reusable across all pages
- [x] **WA-008:** Add global command palette trigger (Cmd+K) — placeholder, wired in EPIC-WA-007

#### Story WA-1.3: Responsive Layout

> Sidebar becomes a mobile drawer on small screens. Layout adapts gracefully.

- [x] **WA-009:** Implement mobile drawer variant of sidebar (slide-over with overlay)
- [x] **WA-010:** Add responsive breakpoint handling for sidebar collapse

---

### EPIC-WA-002: GraphQL Client & Data Layer

#### Story WA-2.1: Apollo Client Setup

> Configure Apollo Client to talk to the NestJS GraphQL API.

- [x] **WA-011:** Install `@apollo/client` and configure `ApolloProvider` in root layout
- [x] **WA-012:** Set up Apollo link with auth header injection (Clerk JWT)
- [x] **WA-013:** Configure Apollo cache with type policies (ULID-based key fields)
- [x] **WA-014:** Add error handling link (network errors, GraphQL errors → toast notifications)

#### Story WA-2.2: GraphQL Codegen & Typed Hooks

> Auto-generate TypeScript types and React hooks from GraphQL schema.

- [x] **WA-015:** Install and configure `@graphql-codegen/cli` with `typescript`, `typescript-operations`, and `typescript-react-apollo` plugins
- [x] **WA-016:** Write `.graphql` query/mutation files for Candidate operations
- [x] **WA-017:** Write `.graphql` query/mutation files for Client operations
- [x] **WA-018:** Write `.graphql` query/mutation files for Job operations
- [x] **WA-019:** Add `codegen` script to `package.json` and verify generated hooks compile

---

### EPIC-WA-003: Authentication & Multi-tenancy UI

#### Story WA-3.1: Clerk Authentication Integration

> Protect all CRM routes behind Clerk login. Show sign-in/sign-up pages for unauthenticated users.

- [ ] **WA-020:** Install `@clerk/nextjs` and configure `ClerkProvider` in root layout
- [ ] **WA-021:** Create sign-in page (`/sign-in/[[...sign-in]]/page.tsx`)
- [ ] **WA-022:** Create sign-up page (`/sign-up/[[...sign-up]]/page.tsx`)
- [ ] **WA-023:** Add `clerkMiddleware` in `middleware.ts` to protect `(app)` routes
- [ ] **WA-024:** Display user name + avatar in sidebar/topbar from Clerk session

#### Story WA-3.2: Organization Switching

> Recruiters can switch between tenants (Clerk Organizations). Active org determines tenant context.

- [ ] **WA-025:** Add Clerk `<OrganizationSwitcher>` to sidebar
- [ ] **WA-026:** Create organization setup page for first-time users (create or join org)
- [ ] **WA-027:** Ensure Apollo Client re-fetches data on org switch (cache clear + refetch)

---

### EPIC-WA-004: Candidate Management UI

#### Story WA-4.1: Candidate List Page

> Paginated table of candidates with key columns. Entry point for candidate management.

- [ ] **WA-028:** Create `/candidates` route with `PageHeader` ("Candidates" + "Add Candidate" button)
- [ ] **WA-029:** Build `CandidateTable` using shadcn `Table` — columns: name, email, company, title, location, status, updated
- [ ] **WA-030:** Connect to `candidates` GraphQL query with loading skeleton and empty state
- [ ] **WA-031:** Add pagination controls (cursor-based, matching API)
- [ ] **WA-032:** Add row click → navigate to candidate detail page

#### Story WA-4.2: Candidate Search & Filtering

> Text search and field-based filters to find candidates quickly.

- [ ] **WA-033:** Add search input to candidate list page (debounced, searches name/email/company/title)
- [ ] **WA-034:** Add filter controls: status dropdown, location text filter
- [ ] **WA-035:** Add sort controls: name, created date, updated date (toggle asc/desc)
- [ ] **WA-036:** Sync filter/sort/search state to URL query params (shareable links, back-button friendly)

#### Story WA-4.3: Candidate Create & Edit

> Form to create a new candidate or edit an existing one.

- [ ] **WA-037:** Create `/candidates/new` route with candidate form
- [ ] **WA-038:** Build `CandidateForm` component — fields: first name, last name, email, phone, current company, current title, location, LinkedIn URL, GitHub URL, notes, status
- [ ] **WA-039:** Add form validation (required fields, email format, URL format)
- [ ] **WA-040:** Wire form submit to `createCandidate` mutation with optimistic UI update
- [ ] **WA-041:** Create `/candidates/[id]` detail route showing full candidate profile
- [ ] **WA-042:** Add inline edit mode on detail page — toggle between view and edit
- [ ] **WA-043:** Wire edit form to `updateCandidate` mutation with optimistic cache update

#### Story WA-4.4: Candidate Delete

> Delete a candidate with confirmation dialog.

- [ ] **WA-044:** Add delete button on candidate detail page
- [ ] **WA-045:** Build confirmation dialog (shadcn `AlertDialog`) — "Delete [Name]? This cannot be undone."
- [ ] **WA-046:** Wire to `deleteCandidate` mutation and redirect to candidate list on success

---

### EPIC-WA-005: Client Management UI

#### Story WA-5.1: Client List Page

> Paginated table of clients with company info.

- [ ] **WA-047:** Create `/clients` route with `PageHeader` ("Clients" + "Add Client" button)
- [ ] **WA-048:** Build `ClientTable` — columns: name, industry, website, status, jobs count, updated
- [ ] **WA-049:** Connect to `clients` GraphQL query with loading skeleton and empty state
- [ ] **WA-050:** Add pagination, search (name/industry), status filter, and sort controls
- [ ] **WA-051:** Add row click → navigate to client detail page

#### Story WA-5.2: Client Create & Edit

> Form to create or edit a client.

- [ ] **WA-052:** Create `/clients/new` route with client form
- [ ] **WA-053:** Build `ClientForm` component — fields: name, industry, website, phone, address, status, notes
- [ ] **WA-054:** Add form validation and wire to `createClient` mutation
- [ ] **WA-055:** Create `/clients/[id]` detail route with client profile + linked jobs section
- [ ] **WA-056:** Add inline edit mode on detail page, wired to `updateClient` mutation

#### Story WA-5.3: Client Delete

- [ ] **WA-057:** Add delete button with confirmation dialog (warn about linked jobs)
- [ ] **WA-058:** Wire to `deleteClient` mutation with cascade handling

---

### EPIC-WA-006: Job Management UI

#### Story WA-6.1: Job List Page

> Paginated table of jobs with client relationship and status.

- [ ] **WA-059:** Create `/jobs` route with `PageHeader` ("Jobs" + "Add Job" button)
- [ ] **WA-060:** Build `JobTable` — columns: title, client name, status, priority, assigned recruiter, created
- [ ] **WA-061:** Connect to `jobs` GraphQL query with loading skeleton and empty state
- [ ] **WA-062:** Add pagination, search (title/client), status filter, priority filter, and sort controls
- [ ] **WA-063:** Add row click → navigate to job detail page

#### Story WA-6.2: Job Create & Edit

> Form to create or edit a job with client selector.

- [ ] **WA-064:** Create `/jobs/new` route with job form
- [ ] **WA-065:** Build `JobForm` component — fields: title, client (searchable selector), description (rich text or textarea), status, priority, assigned recruiter
- [ ] **WA-066:** Build `ClientSelector` — searchable dropdown that queries clients, shows selected client info
- [ ] **WA-067:** Add form validation and wire to `createJob` mutation
- [ ] **WA-068:** Create `/jobs/[id]` detail route with job info + linked candidates section (placeholder for Phase 2 pipeline)
- [ ] **WA-069:** Add inline edit mode on detail page, wired to `updateJob` mutation

#### Story WA-6.3: Job Delete & Status Management

- [ ] **WA-070:** Add delete button with confirmation dialog
- [ ] **WA-071:** Add status change controls on detail page (Open → On Hold → Filled → Closed) with one-click transitions

---

### EPIC-WA-007: Dashboard & Overview

#### Story WA-7.1: Dashboard Page

> Landing page after login showing pipeline summary.

- [ ] **WA-072:** Create `/dashboard` route as default landing page (redirect `/` → `/dashboard`)
- [ ] **WA-073:** Build summary cards: total candidates, total clients, open jobs, candidates by status
- [ ] **WA-074:** Add recent activity list (last 10 created/updated candidates, clients, jobs)
- [ ] **WA-075:** Connect all cards to GraphQL aggregate queries

#### Story WA-7.2: Command Palette

> Cmd+K global search and quick actions — Superhuman-inspired speed.

- [ ] **WA-076:** Build command palette modal (shadcn `Dialog` + search input)
- [ ] **WA-077:** Add quick search across candidates, clients, jobs (federated query)
- [ ] **WA-078:** Add quick actions: "New Candidate", "New Client", "New Job", "Go to Settings"
- [ ] **WA-079:** Wire keyboard shortcut Cmd+K (global listener)

---

## Sprint Plan

### Sprint 1: App Shell + Data Layer

**Goal:** Navigable app with GraphQL connection — no CRUD yet, but the skeleton is real

- Story WA-1.1 (Sidebar Navigation)
- Story WA-1.2 (Top Bar & Page Header)
- Story WA-2.1 (Apollo Client Setup)
- Story WA-2.2 (GraphQL Codegen)

### Sprint 2: Authentication + Candidate CRUD

**Goal:** Authenticated app with full candidate management

- Story WA-3.1 (Clerk Auth Integration)
- Story WA-3.2 (Organization Switching)
- Story WA-4.1 (Candidate List)
- Story WA-4.3 (Candidate Create & Edit)

### Sprint 3: Candidate Polish + Client CRUD

**Goal:** Candidate search/filter, client management

- Story WA-4.2 (Candidate Search & Filtering)
- Story WA-4.4 (Candidate Delete)
- Story WA-5.1 (Client List)
- Story WA-5.2 (Client Create & Edit)

### Sprint 4: Job CRUD + Dashboard

**Goal:** Complete entity CRUD, dashboard overview

- Story WA-5.3 (Client Delete)
- Story WA-6.1 (Job List)
- Story WA-6.2 (Job Create & Edit)
- Story WA-6.3 (Job Delete & Status)

### Sprint 5: Polish & Integration

**Goal:** Dashboard, command palette, responsive layout, bug fixes

- Story WA-1.3 (Responsive Layout)
- Story WA-7.1 (Dashboard)
- Story WA-7.2 (Command Palette)

---

## Progress

### Completion Status

- **EPICs:** 0/7 Complete
- **Stories:** 0/17 Complete
- **Tasks:** 19/79 Complete

### Current Sprint

**Sprint:** Sprint 1
**Active Stories:** WA-1.2 (Top Bar & Page Header) ✅, WA-1.1 (Sidebar Navigation) ✅, WA-2.1 (Apollo Client Setup) ✅, WA-2.2 (GraphQL Codegen & Typed Hooks) ✅
**Blocked Items:** None

---

## Definition of Done

### For Tasks:

- Component renders correctly with no console errors
- Responsive at desktop (1280px+) and tablet (768px+) breakpoints
- Keyboard navigable (tab order, enter to submit, escape to cancel)
- Loading and empty states handled

### For Stories:

- All tasks completed
- Connected to real GraphQL API (not mocked)
- Shadcn/ui components used consistently
- No TypeScript errors

### For EPICs:

- All stories completed
- Cross-page navigation works correctly
- Data persists across page refreshes
- Multi-tenant isolation verified (no data leakage between orgs)

---

## Change Log

| Date       | Change                         | Impact                        |
| ---------- | ------------------------------ | ----------------------------- |
| 2026-03-15 | Initial web-app task breakdown | 7 EPICs, 17 Stories, 79 Tasks |
