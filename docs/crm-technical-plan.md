# CRM Technical Design Document: Cura (Phase 1)

> **Design context.** Cura's data model and access-control design draw directly on the reverse-engineered Gllue architecture in `@docs/gllue_anaylsis/gllue-research.md`. Where this plan adopts a Gllue pattern, the section notes which research finding it derives from; where this plan diverges (own auth, single Team table, single Permission table, event-first reporting), the rationale is in the research doc.

---

## 1. System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│   User Browser  │───▶│   Next.js        │───▶│   NestJS API    │───▶│ PostgreSQL   │
│   (React UI)    │    │   Frontend       │    │   (GraphQL)     │    │   Database   │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
         │                       │                        │                    ▲
         │                       │                  ┌─────┴─────┐              │
         │                       │                  │  AuthN /  │              │
         │                       │                  │  AuthZ    │──────────────┘
         │                       │                  │  Service  │   (sessions, ACL)
         │                       ▼                  └───────────┘
         │              ┌──────────────────┐              ▲
         └─────────────▶│   Soketi         │◀─────────────┘
                        │   (WebSocket)    │
                        └──────────────────┘
```

The auth service is a **first-party module inside the NestJS API** (not a separate process in Phase 1). It owns sessions, password hashing, MFA, role/permission resolution, and the audit log.

---

## 2. Core Technical Decisions

### 2.1 Identity, Authentication, Authorization — First-Party

**Decision:** Cura builds its own authn/authz layer. No Clerk, no Auth0, no third-party identity provider in the request path.

**Why first-party:**

| Driver | Implication |
|---|---|
| Recruiter SaaS handles sensitive PII (resumes, salaries, candidate identities) | We need full control of session lifecycle, MFA, audit, and data residency |
| Multi-tenant ACL is the core differentiator (per Gllue research §9) | Row-level permission logic must live next to the data, not behind a vendor abstraction |
| Subscription-cost scaling on a per-MAU vendor compounds with growth | Avoid permanent COGS line tied to seat count |
| Customers will demand SSO/SAML/SCIM at enterprise tier | Build once, plug providers in via OIDC/SAML modules — not retrofit |

**Two-table identity split (adopted from Gllue research §9.1):** Cura separates *authentication credentials* from *operational identity* — `AuthIdentity` ↔ `User`. This isolates rotation/lockout/MFA concerns from team/role/access bindings, and lets the same `AuthIdentity` later sponsor a candidate-portal user without polluting recruiter rows.

| Layer | Model | Holds |
|---|---|---|
| Authentication | `AuthIdentity` | email, mobile, password hash, MFA enrolment, OIDC subject, lockout state |
| Recruiter operational | `User` | tenant binding, team(s), role(s), preferences, lifecycle (`firstLogin`, `loginable`, `lastInactiveAt`) |

**Tokens & sessions:**
- **Access token:** short-lived (15 min) JWT signed with rotated keys (HS512 in Phase 1; KMS-backed RS256 in Phase 2). Includes `sub` (User ULID), `tid` (Tenant ULID), `sid` (Session ULID). Tenant ID is *embedded in the token* — no DB lookup on the hot path.
- **Refresh token:** opaque, server-side `Session` row (90-day default), rotated on every use. Storing sessions in DB enables "log out everywhere", concurrent-session caps, IP/UA fingerprinting — all things Gllue lacks (see research §9.5).
- **MFA:** TOTP at GA, WebAuthn at Phase 2. `MfaDevice` rows store `secret_encrypted`, `backup_codes_encrypted`, `verified_at`. Backup codes are single-use, hashed.
- **Password policy:** Argon2id, configurable per tenant in `PasswordPolicy(tenantId, minLength, complexityRules, historySize, maxAgeDays)`.
- **API keys:** scoped, revocable, IP-allowlistable — `ApiKey(userId, tokenHash, scopes Json, ipWhitelist, expiresAt, lastUsedAt)`. Scopes are strings like `'candidate:read'`, `'job:write'`.
- **Audit:** every authn/authz event lands in `AuditLog(actorId, actorType, resourceType, resourceId, action, oldValue, newValue, ip, occurredAt)`. This is the single source of truth Gllue's `dbtriggerlog` should have been.

**NestJS implementation:**
- `AuthGuard` (registered as `APP_GUARD` in `AppModule`) — verifies access JWT, hydrates `req.user = { userId, tenantId, sessionId, roles[] }`.
- `@Public()` decorator opts out (health, login, register, public job pages).
- `@CurrentUser()` param decorator extracts the principal.
- `PermissionGuard` (per-resolver) — checks row-level access via the `Permission` model (see §3.4).
- Tenant scoping is automatic via the Prisma extension (§3.1) — the JWT's `tid` becomes `forTenant(tid)` on every query.

| Approach | Pros | Cons |
|---|---|---|
| **First-party (chosen)** | Full control over PII flow, MFA, sessions, ACL adjacent to data, no per-MAU vendor cost | More code to own; SSO providers must be implemented per-protocol |
| Clerk / Auth0 | Faster to ship, off-the-shelf SSO and org-switching UI | Vendor lock-in, per-MAU cost, ACL still ends up in our DB anyway |
| Supertokens / Ory (self-hosted OSS) | Standardised auth flows | Extra service to run; still need ACL ourselves |

**Rejected alternatives:** Clerk Organizations (vendor lock-in, costs scale with seats), Auth0 (same), self-hosted Supertokens (extra deployable; auth ≠ authorization, we'd still own the ACL layer).

### 2.2 Multi-Tenancy: Tenant model + per-query scoping

**Decision:** Each headhunting firm = one `Tenant` row. The JWT carries `tid`. The Prisma extension (`PrismaService.forTenant(tid)`) injects `tenantId` into every query — a tenant cannot read another tenant's data even if a resolver bug omits a where-clause.

**Org switching:** A `User` may belong to multiple `Tenant`s via `TenantMembership(userId, tenantId, defaultRole)`. Switching tenants issues a new access token with a different `tid`.

**Rejected alternative:** PostgreSQL Row-Level Security policies — DB-level complexity, conflicts with connection pooling at our scale.

### 2.3 Data Model: spine + stage tables (adopted from Gllue research §4)

The pipeline is **a spine table with one row per (Candidate × Job), and stage tables hanging off it** — not an enum on a single row. This lets us:

- record per-stage feedback, timestamps, and actors without losing prior stages
- attach permissions per stage (Cura's recruiters can be allowed to see "applied" rows but not "offer" rows for the same candidate)
- compute time-in-stage and time-to-hire without scanning history tables

```
Tenant
├── User (recruiter)        — tenant-scoped, may belong to multiple Tenants
├── Team (single self-referential — parentId, kind)
├── Client (employer)
│   ├── ClientContact       — separate model from Candidate (avoid Gllue's type-discriminator collapse)
│   └── Job                 — vacancy
├── Candidate
│   └── (resume sections: Experience, Education, ...)
└── JobApplication          — the spine: (candidateId, jobId)
    ├── ApplicationStage    — typed event log (APPLIED, CV_SENT, INTERVIEW, OFFER, ONBOARD, REJECTED)
    ├── Interview           — with feedback
    ├── Offer               — with feedback
    └── Placement           — onboard / placement record
```

**Where this differs from Gllue (per research §"Reverse-engineering implications"):**

| We *adopt* | We *avoid* |
|---|---|
| Spine table (`JobApplication`) + stage tables | `gllueext_text_<timestamp>` wide-column custom fields — use typed JSON instead |
| Soft delete (`deletedAt`) + audit quartet (`createdAt`, `updatedAt`, `createdById`, `updatedById`) on every domain model | `__dropped_<uuid>_*` tombstoned columns — Cura uses clean migrations |
| Rollup counters on parents (`Job.applicationCount`, `Client.activeJobCount`) maintained by service-layer code | `type` discriminator collapsing distinct entities (candidate vs. clientcontact in one table) |
| Per-resource permissions cached for fast row-level checks | Three parallel team trees (`team`, `team2`, `team3`) — Cura uses one self-referential `Team` with `kind` |
| First-class `Event` table (typed business events) feeding analytics | A 14-pair audit/cache duplication for ACL — Cura uses one `Permission` + a `PermissionGrant` audit log |

### 2.4 Stack: Next.js + NestJS + Prisma + PostgreSQL

- **Next.js 15:** React 19, App Router, Turbopack
- **NestJS 10:** TypeScript-first, GraphQL code-first
- **Prisma 7:** type-safe ORM, ULID primary keys
- **PostgreSQL 16:** JSONB, mature ecosystem, logical replication available for §6 reporting pipeline

**Rejected:** Rails / Laravel (slower TypeScript iteration; sharing types FE↔BE is painful).

### 2.5 API: GraphQL Code-First

NestJS generates schema from TypeScript classes. Frontend auto-generates typed hooks via GraphQL Codegen. DataLoader prevents N+1 queries.

**Rejected:** REST (more verbose, less type-safe).

### 2.6 IDs: Pure ULID

Single ULID PK. 26-char string, timestamp-prefixed, sortable, globally unique, multi-tenant safe, non-enumerable.

| Strategy | Storage | Join Speed | Security | Recommendation |
|---|---|---|---|---|
| Pure Integer | 4 B | Fast | Insecure | Rejected |
| **Pure ULID** | 16 B | Good | Secure | **Chosen** |
| Hybrid (int + ulid) | 20 B | Fast | Secure | Over-engineering |

**Why not hybrid:** added complexity (dual lookups, extra indexes) for negligible gain at CRM scale (10K–100K candidates per tenant).

### 2.7 Real-time: Soketi

Live Kanban updates, notifications, collaborative-editing conflicts. Pusher-compatible (easy migration to hosted Pusher if self-hosting becomes painful).

### 2.8 Monorepo: pnpm + Turborepo

**pnpm** over Bun — best NestJS/Docker compatibility, production-proven. **Turborepo** for build caching and task parallelisation.

```
js/
├── apps/
│   ├── api/              # NestJS GraphQL (port 8000)
│   ├── web-app/          # Next.js CRM (port 3001)
│   └── web-home-page/    # Next.js marketing (port 3000)
└── packages/             # shared libs
```

---

## 3. Database Design (Core Entities)

### 3.1 Tenant Isolation: Prisma Client Extension

`$extends` for automatic query scoping via `PrismaService.forTenant(tenantId)`:

```typescript
const db = this.prisma.forTenant(tenantId);
const candidates = await db.candidate.findMany(); // tenantId injected automatically
```

All operations (`findMany`, `create`, `update`, `delete`, `upsert`) get `tenantId` injected. `findUnique` is rewritten to `findFirst` (Prisma validates unique-constraint fields only). `Tenant` and global tables (`AuthIdentity`, `Session`) bypass scoping.

**Rejected:** PostgreSQL Row-Level Security (DB-level complexity, conflicts with connection pooling).

### 3.2 Identity & Auth Schema

```prisma
model AuthIdentity {
  id              String    @id @default(ulid())
  email           String    @unique
  mobile          String?   @unique
  oidcSubject     String?   @unique           // for SSO / Google login
  passwordHash    String?                      // null when SSO-only
  mfaEnrolled     Boolean   @default(false)
  emailVerifiedAt DateTime?
  mobileVerifiedAt DateTime?
  failedLoginCount Int      @default(0)
  lockedUntil     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  users           User[]                        // one identity → many tenant-scoped users
}

model User {
  id              String    @id @default(ulid())
  tenantId        String
  authIdentityId  String
  authIdentity    AuthIdentity @relation(fields: [authIdentityId])
  displayName     String
  preferredLang   String    @default("en")
  defaultScene    String?
  loginable       Boolean   @default(true)
  firstLogin      Boolean   @default(true)
  lastInactiveAt  DateTime?
  passwordChangedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  createdById     String?
  updatedById     String?

  teams           TeamMember[]
  roles           UserRole[]

  @@unique([tenantId, authIdentityId])
  @@index([tenantId, loginable])
}

model Session {
  id              String   @id @default(ulid())
  userId          String
  tenantId        String
  refreshTokenHash String  @unique
  ip              String?
  userAgent       String?
  expiresAt       DateTime
  revokedAt       DateTime?
  lastUsedAt      DateTime @default(now())
  createdAt       DateTime @default(now())

  @@index([userId, expiresAt])
}

model MfaDevice {
  id              String   @id @default(ulid())
  authIdentityId  String
  type            MfaType                       // TOTP | WEBAUTHN | SMS
  secretEncrypted String
  backupCodesHashed Json?
  verifiedAt      DateTime?
  createdAt       DateTime @default(now())

  @@unique([authIdentityId, type])
}

model ApiKey {
  id              String   @id @default(ulid())
  userId          String
  name            String
  tokenHash       String   @unique
  scopes          Json                          // ['candidate:read', 'job:write']
  ipWhitelist     Json?
  expiresAt       DateTime?
  lastUsedAt      DateTime?
  revokedAt       DateTime?
  createdAt       DateTime @default(now())
}

model PasswordPolicy {
  id              String   @id @default(ulid())
  tenantId        String   @unique
  minLength       Int      @default(12)
  complexityRules Json
  historySize     Int      @default(5)
  maxAgeDays      Int      @default(180)
}
```

### 3.3 Tenant, Team, Membership

```prisma
model Tenant {
  id          String   @id @default(ulid())
  name        String
  slug        String   @unique
  status      TenantStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  users       User[]
  teams       Team[]
  clients     Client[]
  candidates  Candidate[]
  jobs        Job[]
}

// Single self-referential team (replaces Gllue's team / team2 / team3 trio).
// `kind` lets one matrix org coexist: Sales (BUSINESS) × APAC (REGION) × Healthcare (PRACTICE).
model Team {
  id          String   @id @default(ulid())
  tenantId    String
  parentId    String?
  parent      Team?    @relation("TeamHierarchy", fields: [parentId], references: [id])
  children    Team[]   @relation("TeamHierarchy")
  name        String
  kind        TeamKind                          // BUSINESS | REGION | PRACTICE | OTHER
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  members     TeamMember[]

  @@index([tenantId, kind])
}

model TeamMember {
  teamId      String
  userId      String
  role        TeamRole                          // MEMBER | LEAD
  joinedAt    DateTime @default(now())
  team        Team     @relation(fields: [teamId])
  user        User     @relation(fields: [userId])
  @@id([teamId, userId])
}
```

### 3.4 Authorization: one Permission table for all resources

Replaces the 14+ `*privilege` / `*uniqueprivilege` pairs Gllue carries. One polymorphic table for the "can this principal access this resource" check; a separate append-only `PermissionGrant` log preserves audit history; a `PermissionInheritance` graph replaces Gllue's CSV `downstream` column.

```prisma
model Role {
  id          String   @id @default(ulid())
  tenantId    String?                            // null = built-in / system role
  name        String
  permissions Json                               // ['candidate:export', 'job:approve']
  builtin     Boolean  @default(false)
  @@unique([tenantId, name])
}

model UserRole {
  userId      String
  roleId      String
  assignedAt  DateTime @default(now())
  assignedById String
  @@id([userId, roleId])
}

model Permission {
  id            String        @id @default(ulid())
  tenantId      String
  granteeType   GranteeType                       // USER | TEAM | ROLE
  granteeId     String
  resourceType  String                             // 'Candidate' | 'Job' | 'JobApplication' | ...
  resourceId    String
  accessLevel   AccessLevel                        // VIEW | EDIT | OWNER
  grantSource   GrantSource                        // DIRECT | INHERITED | RULE | APPROVAL
  expiresAt     DateTime?
  createdAt     DateTime      @default(now())
  createdById   String

  @@unique([tenantId, granteeType, granteeId, resourceType, resourceId])
  @@index([tenantId, resourceType, resourceId])
  @@index([granteeId, accessLevel])
}

// Append-only audit. Every grant / revoke / level-change writes a row here.
// Enables "how did this user get access?" queries without polluting Permission.
model PermissionGrant {
  id            String        @id @default(ulid())
  permissionId  String?                            // null after revoke
  tenantId      String
  granteeType   GranteeType
  granteeId     String
  resourceType  String
  resourceId    String
  action        GrantAction                        // GRANT | UPGRADE | DOWNGRADE | REVOKE
  fromLevel     AccessLevel?
  toLevel       AccessLevel?
  reason        String?
  occurredAt    DateTime      @default(now())
  actorId       String

  @@index([resourceType, resourceId, occurredAt])
  @@index([granteeId, occurredAt])
}

// Replaces Gllue's CSV `downstream` field with a queryable graph.
model PermissionInheritance {
  parentPermissionId String
  childGranteeType   GranteeType
  childGranteeId     String
  @@id([parentPermissionId, childGranteeType, childGranteeId])
}

// Cascade rules: e.g. "if you can see a JobApplication, you can see its Candidate".
model PermissionCascadeRule {
  id              String  @id @default(ulid())
  fromResourceType String
  toResourceType   String
  minAccessLevel   AccessLevel
  @@unique([fromResourceType, toResourceType])
}

// Magic-link / scoped share tokens (per Gllue's accesstokensharerule).
model ShareToken {
  id          String   @id @default(ulid())
  tenantId    String
  tokenHash   String   @unique
  resourceType String
  resourceId   String
  accessLevel AccessLevel
  expiresAt   DateTime
  createdById String
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
}
```

**Permission-check hot path** (per request): resolver calls `permissionService.can(user, resource, level)`. The service does a single indexed lookup against `Permission` filtered by `tenantId`, `granteeId IN (userId, ...userTeamIds, ...userRoleIds)`, `resourceType`, `resourceId`. Cascade rules are evaluated upstream when the resource is loaded.

### 3.5 Domain Schema (Phase 1)

```prisma
model Client {
  id                String   @id @default(ulid())
  tenantId          String
  parentId          String?                         // company hierarchy
  parent            Client?  @relation("ClientHierarchy", fields: [parentId])
  children          Client[] @relation("ClientHierarchy")
  bdUserId          String?                         // BD owner (recruiter)
  name              String
  industry          String?
  websiteUrl        String?
  description       String?
  // Rollup counters (maintained by service-layer code; rebuilt nightly):
  activeJobCount    Int      @default(0)
  totalJobCount     Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  createdById       String?
  updatedById       String?

  jobs              Job[]
  contacts          ClientContact[]

  @@index([tenantId, deletedAt])
  @@index([tenantId, bdUserId])
}

// Distinct from Candidate. Gllue collapses these via `type='clientcontact'` —
// research §"Reverse-engineering implications" says don't replicate this.
model ClientContact {
  id          String   @id @default(ulid())
  tenantId    String
  clientId    String
  client      Client   @relation(fields: [clientId])
  fullName    String
  title       String?
  email       String?
  phone       String?
  isPrimary   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  createdById String?
  updatedById String?

  @@index([tenantId, clientId])
}

model Candidate {
  id                String   @id @default(ulid())
  tenantId          String
  ownerUserId       String?
  fullName          String
  email             String?
  phone             String?
  linkedinUrl       String?
  currentTitle      String?
  currentCompanyId  String?
  source            String?
  enrichedAt        DateTime?
  enrichmentSource  String?

  // Lock / protection (adopted from Gllue research §2):
  isLocked          Boolean  @default(false)
  lockedByUserId    String?
  lockedAt          DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  createdById       String?
  updatedById       String?

  experiences       CandidateExperience[]
  educations        CandidateEducation[]
  applications      JobApplication[]

  @@index([tenantId, deletedAt])
  @@index([tenantId, ownerUserId])
  @@index([tenantId, email])
}

model Job {
  id                String   @id @default(ulid())
  tenantId          String
  clientId          String
  client            Client   @relation(fields: [clientId])
  title             String
  description       String?
  status            JobStatus @default(OPEN)
  priority          JobPriority @default(NORMAL)
  hiringManagerId   String?                         // ClientContact
  ownerUserId       String?                         // recruiter
  openDate          DateTime?
  closeDate         DateTime?
  // Rollup counters (rebuilt nightly from JobApplication / ApplicationStage):
  applicationCount  Int      @default(0)
  interviewCount    Int      @default(0)
  offerCount        Int      @default(0)
  placementCount    Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  createdById       String?
  updatedById       String?

  applications      JobApplication[]

  @@index([tenantId, status, deletedAt])
  @@index([tenantId, clientId])
  @@index([tenantId, ownerUserId])
}

// The pipeline spine — one row per (Candidate × Job).
// Stage transitions live in ApplicationStage rows (not as an enum on this row).
model JobApplication {
  id              String   @id @default(ulid())
  tenantId        String
  candidateId     String
  candidate       Candidate @relation(fields: [candidateId])
  jobId           String
  job             Job       @relation(fields: [jobId])
  source          String?                          // 'manual' | 'linkedin' | 'portal' | 'referral'
  ownerUserId     String?
  maxStage        ApplicationStageType @default(APPLIED)   // cached highest stage reached
  isActive        Boolean  @default(true)
  matchScore      Decimal? @db.Decimal(5,2)        // optional AI score
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  createdById     String?
  updatedById     String?

  stages          ApplicationStage[]
  interviews      Interview[]
  offers          Offer[]

  @@unique([tenantId, candidateId, jobId])
  @@index([tenantId, jobId, isActive])
  @@index([tenantId, ownerUserId, isActive])
  @@index([tenantId, maxStage])
}

// Typed event log of pipeline state. Append-only.
model ApplicationStage {
  id              String   @id @default(ulid())
  tenantId        String
  applicationId   String
  application     JobApplication @relation(fields: [applicationId])
  stage           ApplicationStageType            // APPLIED | LONGLIST | CV_SENT | INTERVIEW | OFFER | PLACEMENT | REJECTED
  enteredAt       DateTime @default(now())
  enteredById     String
  note            String?

  @@index([tenantId, applicationId, enteredAt])
}

model Interview {
  id              String   @id @default(ulid())
  tenantId        String
  applicationId   String
  application     JobApplication @relation(fields: [applicationId])
  round           Int
  scheduledAt     DateTime
  completedAt     DateTime?
  feedback        String?
  rating          Int?
  createdById     String
  createdAt       DateTime @default(now())
}

model Offer {
  id              String   @id @default(ulid())
  tenantId        String
  applicationId   String
  application     JobApplication @relation(fields: [applicationId])
  amount          Decimal? @db.Decimal(15,2)
  currency        String?
  signedAt        DateTime?
  startDate       DateTime?
  declinedAt      DateTime?
  createdById     String
  createdAt       DateTime @default(now())
}
```

### 3.6 Cross-cutting conventions (adopted from Gllue research §8)

Every domain model carries:
- `tenantId` (set automatically by Prisma extension)
- `createdAt`, `updatedAt`
- `createdById`, `updatedById` (User ULIDs)
- `deletedAt` (soft delete; queries filter automatically)

Custom fields go to a typed `customFields Json` column when needed — never `gllueext_text_<timestamp>` style wide columns (research §8).

---

## 4. Phase 1 Implementation Priorities

### 4.1 Launch Requirements
1. First-party authn (login, register, MFA, password reset)
2. First-party authz (Permission-based row-level access; Role-based UI gating)
3. Tenant Isolation (Prisma extension; verified by integration tests)
4. Manual Kanban Board (drag & drop + real-time sync) — backed by `ApplicationStage` events
5. Basic CRUD (Candidates, Clients, Jobs, ClientContacts)
6. Activity Timeline (`AuditLog` + `ApplicationStage` events)

### 4.2 Technical Infrastructure
1. AuthN / AuthZ module: JWT (HS512), Argon2id, TOTP, Session table, AuditLog
2. Prisma schema with tenant isolation extension
3. Permission service + cascade rules + cache (in-memory LRU, request-scoped)
4. Soketi WebSocket for live updates
5. GraphQL with type generation
6. Next.js with Shadcn/ui + Tailwind v4

---

## 5. Browser Agent Task Queue & Scheduled Execution (Phase 3)

CRM manages a **generic task queue** that the Cura Browser Agent consumes on a 30-min schedule. CRM is the brain (creates, prioritises, monitors). The agent is the hands (queries CRM API, executes in recruiter's browser via Browser-Use + Claude API). See @docs/outreaching-technical-plan.md for LinkedIn-specific limits and strategy.

### 5.1 Task Model

```prisma
model CoworkTask {
  id              String           @id @default(dbgenerated("gen_random_ulid()"))
  tenantId        String
  userId          String
  type            CoworkTaskType
  priority        Int              @default(100)  // lower = higher priority
  status          CoworkTaskStatus
  payload         Json             // type-specific data
  result          Json?
  errorMessage    String?
  retryCount      Int              @default(0)
  maxRetries      Int              @default(2)
  createdAt       DateTime         @default(now())
  scheduledAt     DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  staleSince      DateTime?
  candidateId     String?
  jobId           String?
  parentTaskId    String?
  candidate       Candidate?       @relation(fields: [candidateId], references: [id])

  @@index([tenantId, userId, status])
  @@index([tenantId, status, priority])
  @@index([status, startedAt])
}

enum CoworkTaskType {
  SEND_CONNECTION_REQUEST
  SEND_MESSAGE
  SEND_INMAIL
  SCAN_INBOX
  SCAN_CONNECTIONS
  SEARCH_PROFILES
  VIEW_PROFILE
  CHECK_ACCOUNT_HEALTH
}

enum CoworkTaskStatus {
  DRAFT
  PENDING_APPROVAL
  READY
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  FAILED
  STALE
  SKIPPED
  CANCELLED
}
```

### 5.2 Task Payloads

| Type | Payload Fields |
|------|---------------|
| SEND_CONNECTION_REQUEST | `linkedinUrl`, `candidateName`, `note` (≤300 chars) |
| SEND_MESSAGE | `linkedinUrl`, `candidateName`, `message` |
| SEND_INMAIL | `linkedinUrl`, `candidateName`, `subject`, `message` |
| SCAN_INBOX | `lookbackHours` (default: 24) |
| SCAN_CONNECTIONS | `pendingTaskIds` |
| SEARCH_PROFILES | `query`, `filters` (title, location, company, industry), `maxResults`, `jobId` |
| VIEW_PROFILE | `linkedinUrl`, `extractFields` |
| CHECK_ACCOUNT_HEALTH | (none) |

### 5.3 Session Execution Order

Every 30 min, the agent runs tasks in this order:

1. **Health check** → if session expired or restricted, alert and stop
2. **Budget check** → if daily limit reached, skip outreach
3. **Inbox scan** → replies take priority; CRM classifies and drafts follow-ups
4. **Connection accept check** → auto-draft follow-up messages
5. **Outreach** → ordered by priority (messages > InMail > connection requests); claim → execute → complete/fail; random delay 30s–3min between actions
6. **Report** → log session summary to CRM

### 5.4 MCP Tools

| Tool | Purpose |
|------|---------|
| `getTasks(type?, status, limit?)` | Pull READY tasks ordered by priority |
| `claimTask(taskId)` | Atomically set IN_PROGRESS + startedAt |
| `completeTask(taskId, result)` | Mark completed with result data |
| `failTask(taskId, errorMessage)` | Increment retryCount; re-queue if under maxRetries |
| `reportReply(senderUrl, messageText, timestamp)` | Match reply to outreach task, classify, draft follow-up |
| `reportConnectionAccepted(taskId, linkedinUrl)` | Create follow-up MESSAGE task |
| `getOutreachBudget()` | Remaining daily/weekly limits by tier (see @docs/outreaching-technical-plan.md Section 4) |
| `checkAccountHealth()` | Verify LinkedIn session is alive |
| `reportSessionSummary(...)` | Log session stats for analytics |

### 5.5 Task Creation Sources

| Source | Task Types | Approval Required? |
|--------|-----------|-------------------|
| Recruiter via Claude MCP | Outreach (SEND_*) | Yes — DRAFT → approve → READY |
| CRM auto-schedule (cron) | SCAN_INBOX, SCAN_CONNECTIONS, CHECK_ACCOUNT_HEALTH | No — auto-created as READY every 30 min |
| Reply classification | SEND_MESSAGE (follow-up) | Yes — auto-drafted, recruiter approves |
| Connection accepted | SEND_MESSAGE (follow-up pitch) | Yes — auto-drafted, recruiter approves |
| Pipeline staleness agent | SEND_MESSAGE (nudge) | Yes — auto-drafted, recruiter approves |
| Recruiter via CRM UI | Any | Yes |

### 5.6 Stale Detection & Alerting

A task is **stale** if IN_PROGRESS > 1 hour. Server-side cron runs every 5 min to detect and mark stale tasks.

**Alert model:**

```prisma
model Alert {
  id          String        @id @default(dbgenerated("gen_random_ulid()"))
  tenantId    String
  userId      String?
  type        AlertType
  severity    AlertSeverity
  message     String
  metadata    Json?
  isRead      Boolean       @default(false)
  isResolved  Boolean       @default(false)
  resolvedBy  String?
  resolvedAt  DateTime?
  createdAt   DateTime      @default(now())

  @@index([tenantId, isResolved])
  @@index([tenantId, userId, isRead])
}

enum AlertType {
  TASK_STALE
  SESSION_EXPIRED
  ACCOUNT_RESTRICTED
  DAILY_LIMIT_REACHED
  COWORK_SESSION_FAILED
  REPLY_DETECTED
}

enum AlertSeverity { INFO  WARNING  ERROR  CRITICAL }
```

**Escalation rules:**

| Condition | Severity | Auto-Action |
|-----------|----------|-------------|
| 1 task stale > 1 hour | WARNING | Offer Retry/Cancel |
| 3+ stale for same user | ERROR | Pause all READY tasks |
| Stale across 2+ tenants | CRITICAL | System-wide investigation |
| Session expired | ERROR | Pause tasks; show "Reconnect LinkedIn" |
| Account restricted | ERROR | Pause tasks; 24h cooldown |
| Daily limit reached | INFO | Skip outreach; inbox scan still runs |

**Recovery:** Recruiter can Retry (re-queue as READY), Cancel, or Check LinkedIn manually.

### 5.7 Schedule Configuration

Schedule is configured in the **Cura CRM dashboard** (interval, active hours, active days). The Cura Desktop Agent polls for schedule configuration and triggers sessions accordingly. CRM keeps the right tasks in READY status. Recurring task creation (SCAN_INBOX, SCAN_CONNECTIONS, CHECK_ACCOUNT_HEALTH) is a server-side NestJS cron that runs every 30 min.

### 5.8 Session Audit

```prisma
model CoworkSession {
  id                  String        @id @default(dbgenerated("gen_random_ulid()"))
  tenantId            String
  userId              String
  startedAt           DateTime
  completedAt         DateTime?
  status              SessionStatus // RUNNING, COMPLETED, FAILED, TIMED_OUT
  tasksAttempted      Int           @default(0)
  tasksCompleted      Int           @default(0)
  tasksFailed         Int           @default(0)
  tasksSkipped        Int           @default(0)
  repliesFound        Int           @default(0)
  connectionsAccepted Int           @default(0)
  budgetAtStart       Json?
  budgetAtEnd         Json?
  errorMessage        String?
  createdAt           DateTime      @default(now())

  @@index([tenantId, userId, startedAt])
}
```

---

## 6. Reporting & Analytics (event-first; from research §10)

Gllue's reporting is structurally weak (KPIs as raw SQL strings, denormalized counters that drift, 63M unconsumed `dbtriggerlog` rows). Cura builds the warehouse layer Gllue never built — and it's a competitive moat.

### 6.1 Layer 1 — Typed business events

```prisma
model Event {
  id          BigInt   @id @default(autoincrement())
  tenantId    String
  type        String   // 'job.created' | 'application.applied' | 'application.stage_entered' | 'interview.scheduled' | 'offer.signed' | 'placement.completed' | 'recruiter.contact'
  entityType  String
  entityId    String
  aggregateId String?  // e.g. jobId for fast slicing
  actorId     String?
  properties  Json
  occurredAt  DateTime
  createdAt   DateTime @default(now())

  @@index([tenantId, type, occurredAt])
  @@index([tenantId, aggregateId, occurredAt])
  @@index([tenantId, actorId, occurredAt])
}
```

Events are emitted from service-layer code on writes — *typed business events*, not raw row diffs. (Logical-replication CDC is a Phase 2 option if event-emitting becomes a maintenance burden.)

### 6.2 Layer 2 — Fact + dimension tables (rebuilt nightly)

- `FactPipelineStage` — one row per (candidate, job, stage) with timestamps and durations
- `DimRecruiter`, `DimJob`, `DimClient`, `DimCandidate` — denormalized snapshots for fast filtering

### 6.3 Layer 3 — Pre-aggregated daily snapshots

```
HiringFunnelDaily        (snapshotDate, jobId, recruiterId, stage, count)
RecruiterProductivityDaily (snapshotDate, recruiterId, jobsOpen, applicationsIn, applicationsForwarded, interviews, offers, hires, timeToHireAvgDays)
SourceEffectivenessDaily (snapshotDate, source, applications, interviews, hires, hiresRetained90d)
ClientRevenueMonthly     (month, clientId, jobsOpen, placements, expectedRevenue, actualRevenue)
```

### 6.4 Layer 4 — In-product surface

- A real `Dashboard` model storing chart specs (metric + dimensions + filters + chart type), not just UI layout — sharable across teams, permission-aware
- Saved views: recruiters see only their own data unless explicitly shared
- Built-in alerts on snapshot tables: "no submissions in 7 days", "offer outstanding > 14 days", "time-to-hire trending up week-over-week"

### 6.5 Layer 5 — Refresh pipeline

- Hourly: tail `Event` → upsert facts
- Nightly: rebuild daily snapshots; bump cache versions
- SLA: snapshots <4 h behind reality. Real-time alerts hit `Event` directly.

---

## 7. Future-Proofing (Phase 2+)

- **AI Integration:** `IAIService` interface for `suggestMatches`, `draftMessage`, `parseResume` — Phase 1 mocks, Phase 3+ real
- **Plugin Architecture:** input channels (job boards, LinkedIn, referral portal) as separate modules writing through the `JobApplication` spine
- **Custom fields:** typed `customFields Json` column per domain model + a `CustomFieldDefinition` registry per tenant (typed, validated). Avoid Gllue's `gllueext_text_<timestamp>` wide-column anti-pattern.
- **Approval flows:** model on top of `Permission` + `Event` so any object can be wrapped in approval without per-entity duplication
- **SSO:** OIDC and SAML providers via plug-in modules that mint Cura `Session` rows after external IdP auth

---

## 8. Performance Targets

| Metric | Target |
|---|---|
| Time to first candidate added | < 10 min from signup |
| Kanban drag responsiveness | < 100ms |
| Real-time sync latency | < 500ms |
| Page load | < 2s |
| API response (p95) | < 200ms |
| DB queries (avg) | < 50ms |
| Permission check (p95) | < 5ms |
| WebSocket uptime | > 99.9% |
| Concurrent users/tenant | 50+ |
| Reporting snapshot freshness | < 4 h |

---

## 9. API Foundation Decisions (Story 1.3)

### 9.1 TypeScript Runtime: tsx instead of nest start

**Decision:** Use `tsx` (via `tsx watch` for dev, `tsx src/main.ts` for prod) instead of `nest start --watch` / `node dist/main`.

**Why:** Prisma 7 generates ESM-only TypeScript code (`import.meta.url`, ES imports). NestJS's default tsc compiler outputs CJS (no `"type": "module"` in package.json), causing `ReferenceError: exports is not defined in ES module scope` at runtime. `tsx` transparently handles mixed ESM/CJS modules.

**Alternatives considered:**

| Option | Pros | Cons |
|---|---|---|
| `tsx` (chosen) | Zero config, handles ESM/CJS, already a dep | Slight startup overhead vs raw `node` |
| SWC builder | NestJS-recommended | `@swc/cli` v0.8 incompatible with `@nestjs/cli` v10 |
| `"type": "module"` in package.json | Native ESM | Breaks NestJS/Jest configs, widespread import changes |

**Trade-offs:** Marginal startup overhead from tsx is acceptable for dev and low-traffic API.

### 9.2 DataLoader for N+1 Prevention

**Decision:** Request-scoped `DataLoaderService` (global module) with batch loaders for each entity.

**Implementation:**
- `DataLoaderService` is `@Injectable({ scope: Scope.REQUEST })` — fresh per GraphQL request, no cross-request cache leakage
- Loaders: `clientById`, `userById`, `candidateById`, `jobsByClientId`
- Resolvers use `@ResolveField()` + DataLoader for relationship fields instead of eager includes

### 9.3 Error Handling & Validation

**Decision:** Three-layer approach:
1. **ValidationPipe** (global) — `class-validator` decorators on DTOs, whitelist mode, forbid unknown properties
2. **GraphqlExceptionFilter** — catches all resolver exceptions, maps HTTP status codes to Apollo error codes (BAD_USER_INPUT, NOT_FOUND, UNAUTHENTICATED, FORBIDDEN, INTERNAL_SERVER_ERROR)
3. **Structured logging** — unexpected errors logged with full stack, sanitized message returned to client

### 9.4 GraphQL Code-First Object Types

**Decision:** Shared GraphQL ObjectType models in `src/common/graphql/models/` with registered enums in `src/common/graphql/enums.ts`.

**Pattern:** Models declare scalar fields only. Relationship fields (Client→Jobs, Job→Client, Job→AssignedTo) are resolved via `@ResolveField()` in their respective resolvers using DataLoaders, avoiding circular imports and N+1 queries.
