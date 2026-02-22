# Cura CRM - Phase 1 Project Management

## Project Status: 🔄 In Planning
**Phase 1 Goal:** Basic CRUD operations for CRM core entities (Candidates, Clients, Jobs)
**Kanban Board:** Out of scope for Phase 1

---

## 📋 EPICs

### EPIC-001: 🏗️ Foundation Setup
**Objective:** Establish core technical infrastructure
**Priority:** P0 - Critical Path
**Estimated Effort:** 2-3 sprints

### EPIC-002: 👤 Candidate Management  
**Objective:** Complete CRUD operations for candidate profiles
**Priority:** P0 - Core Feature
**Estimated Effort:** 2-3 sprints

### EPIC-003: 🏢 Client Management
**Objective:** Complete CRUD operations for client/company records  
**Priority:** P1 - High
**Estimated Effort:** 1-2 sprints

### EPIC-004: 💼 Job Management
**Objective:** Complete CRUD operations for job orders
**Priority:** P1 - High  
**Estimated Effort:** 1-2 sprints

### EPIC-005: 🔐 Authentication & Multi-tenancy
**Objective:** Secure access with Clerk Organizations
**Priority:** P0 - Security Critical
**Estimated Effort:** 1-2 sprints

---

## 📖 Stories & Tickets

### EPIC-001: 🏗️ Foundation Setup

#### Story 1.1: Development Environment Setup
- [x] **TASK-001:** Set up Docker Compose (PostgreSQL, Redis, Soketi)
- [ ] **TASK-002:** Configure NestJS project with GraphQL
- [ ] **TASK-003:** Set up Prisma with ULID primary keys
- [ ] **TASK-004:** Configure Next.js frontend with TypeScript
- [ ] **TASK-005:** Set up Shadcn/ui component library

#### Story 1.2: Database Schema Foundation  
- [ ] **TASK-006:** Create core Prisma schema (Tenant, User, Candidate, Client, Job)
- [ ] **TASK-007:** Implement tenant isolation with Prisma extension
- [ ] **TASK-008:** Set up database migrations
- [ ] **TASK-009:** Create seed data for development

#### Story 1.3: API Foundation
- [ ] **TASK-010:** Set up GraphQL schema generation (code-first)
- [ ] **TASK-011:** Configure GraphQL Codegen for frontend
- [ ] **TASK-012:** Implement DataLoader for N+1 query prevention
- [ ] **TASK-013:** Set up API error handling and validation

---

### EPIC-002: 👤 Candidate Management

#### Story 2.1: Candidate Profile CRUD
- [ ] **TASK-014:** Create Candidate GraphQL schema (queries/mutations)
- [ ] **TASK-015:** Implement Candidate service layer with validation
- [ ] **TASK-016:** Build Candidate list page with pagination
- [ ] **TASK-017:** Build Candidate detail/edit form
- [ ] **TASK-018:** Implement Candidate creation workflow
- [ ] **TASK-019:** Add Candidate deletion with confirmation

#### Story 2.2: Candidate Data Validation
- [ ] **TASK-020:** Implement email validation and uniqueness check
- [ ] **TASK-021:** Add phone number formatting and validation
- [ ] **TASK-022:** Create required field validation
- [ ] **TASK-023:** Implement data sanitization

#### Story 2.3: Candidate Search & Filtering
- [ ] **TASK-024:** Implement basic text search across candidate fields
- [ ] **TASK-025:** Add filtering by company, title, location
- [ ] **TASK-026:** Create sorting options (name, created date, updated date)
- [ ] **TASK-027:** Implement pagination with proper GraphQL cursors

---

### EPIC-003: 🏢 Client Management

#### Story 3.1: Client/Company CRUD
- [ ] **TASK-028:** Create Client GraphQL schema
- [ ] **TASK-029:** Implement Client service layer
- [ ] **TASK-030:** Build Client list page with company info
- [ ] **TASK-031:** Build Client detail/edit form
- [ ] **TASK-032:** Implement Client creation workflow
- [ ] **TASK-033:** Add Client deletion with cascade rules

#### Story 3.2: Client Relationship Management
- [ ] **TASK-034:** Add client status tracking (prospect, active, inactive)
- [ ] **TASK-035:** Implement primary contact assignment
- [ ] **TASK-036:** Add client industry categorization
- [ ] **TASK-037:** Create client relationship timeline foundation

---

### EPIC-004: 💼 Job Management  

#### Story 4.1: Job Order CRUD
- [ ] **TASK-038:** Create Job GraphQL schema with Client relationship
- [ ] **TASK-039:** Implement Job service layer
- [ ] **TASK-040:** Build Job list page with client info
- [ ] **TASK-041:** Build Job detail/edit form
- [ ] **TASK-042:** Implement Job creation workflow
- [ ] **TASK-043:** Add Job deletion and archiving

#### Story 4.2: Job Status Management
- [ ] **TASK-044:** Implement job status workflow (open, on-hold, filled, closed)
- [ ] **TASK-045:** Add job priority levels
- [ ] **TASK-046:** Create recruiter assignment functionality
- [ ] **TASK-047:** Add job requirements and description rich text editor

---

### EPIC-005: 🔐 Authentication & Multi-tenancy

#### Story 5.1: Clerk Integration
- [ ] **TASK-048:** Set up Clerk Organizations for multi-tenancy
- [ ] **TASK-049:** Configure JWT with tenant_id custom claims
- [ ] **TASK-050:** Implement ClerkAuthGuard for NestJS
- [ ] **TASK-051:** Add organization switching UI in frontend
- [ ] **TASK-052:** Test tenant data isolation

#### Story 5.2: User Management
- [ ] **TASK-053:** Create user profile management
- [ ] **TASK-054:** Implement role-based permissions (admin, recruiter)
- [ ] **TASK-055:** Add user invitation workflow
- [ ] **TASK-056:** Create user activity tracking foundation

---

## 🎯 Sprint Planning

### Sprint 1 (Week 1-2): Foundation
**Goal:** Get basic infrastructure running
- Complete Story 1.1 (Dev Environment Setup)
- Complete Story 1.2 (Database Schema)
- Start Story 1.3 (API Foundation)

### Sprint 2 (Week 3-4): Authentication & API Core
**Goal:** Secure multi-tenant API foundation
- Complete Story 1.3 (API Foundation)  
- Complete Story 5.1 (Clerk Integration)
- Start Story 2.1 (Candidate CRUD)

### Sprint 3 (Week 5-6): Candidate Management
**Goal:** Full candidate CRUD functionality
- Complete Story 2.1 (Candidate Profile CRUD)
- Complete Story 2.2 (Candidate Data Validation)
- Start Story 2.3 (Candidate Search)

### Sprint 4 (Week 7-8): Client & Job Management
**Goal:** Complete core entity CRUD operations
- Complete Story 2.3 (Candidate Search)
- Complete Story 3.1 (Client CRUD)
- Start Story 4.1 (Job CRUD)

### Sprint 5 (Week 9-10): Polish & Integration
**Goal:** Complete Phase 1 scope
- Complete Story 4.1 (Job CRUD)
- Complete Story 4.2 (Job Status Management)
- Complete Story 5.2 (User Management)

---

## 📊 Progress Tracking

### Completion Status
- **EPICs:** 0/5 Complete
- **Stories:** 0/11 Complete  
- **Tasks:** 1/56 Complete

### Current Sprint Focus
**Sprint:** Not Started
**Active Stories:** None
**Blocked Items:** None

---

## 🚀 Definition of Done

### For Stories:
- [ ] All tasks completed and tested
- [ ] Code reviewed and approved
- [ ] GraphQL schema updated and documented
- [ ] Frontend components styled with Shadcn/ui
- [ ] Manual testing completed
- [ ] No critical bugs or security issues

### For EPICs:
- [ ] All stories completed
- [ ] Integration testing passed
- [ ] Performance meets requirements (< 200ms API response)
- [ ] Multi-tenant data isolation verified
- [ ] Documentation updated

---

## 🔄 Change Log

| Date | Change | Impact |
|------|---------|---------|
| 2026-02-22 | Initial project breakdown | Created baseline for Phase 1 |

---

**Next Phase Preview:** Phase 2 will add Kanban pipeline management and real-time collaborative features.