# CRM Technical Design Document: Cura (Phase 1)

## 1. System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│   User Browser  │───▶│   Next.js        │───▶│   NestJS API    │───▶│ PostgreSQL   │
│   (React UI)    │    │   Frontend       │    │   (GraphQL)     │    │   Database   │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
         │                       │                        │
         │                       ▼                        │
         │              ┌──────────────────┐              │
         └─────────────▶│   Soketi         │◀─────────────┘
                        │   (WebSocket)    │
                        └──────────────────┘
```

---

## 2. Core Technical Decisions

### 2.1 Multi-Tenancy: Clerk Organizations

**Decision:** Clerk Organizations as tenant boundary.

**Implementation:**
- Each headhunting firm = Clerk Organization
- JWT includes `org_id` as tenant identifier
- Database queries auto-scoped by `tenant_id`
- Built-in user management, SSO, and org switching UI

| Pros | Cons |
|------|------|
| Built-in user management & SSO | Vendor lock-in to Clerk |
| JWT includes org context automatically | Limited customisation |
| Easy org switching UI out of the box | Subscription costs scale with users |

**Alternative rejected:** Custom tenant management (too complex for Phase 1).

**Backend Auth Implementation (decided 2026-03-15):**

**Decision:** Use `@clerk/backend` SDK directly with a NestJS guard (no Passport).

**Implementation:**
- `ClerkAuthGuard` verifies JWT via `verifyToken()` from `@clerk/backend`
- Guard registered as `APP_GUARD` in `AppModule` — all endpoints require auth by default
- `@Public()` decorator opts out (health ping, waitlist)
- `@CurrentUser()` param decorator extracts `{ clerkUserId, tenantId, orgRole }` from request
- Guard resolves Clerk `org_id` → internal ULID `tenantId` via DB lookup with in-memory cache
- Explicit `@Inject()` decorators required because `tsx`/esbuild doesn't emit decorator metadata

| Approach | Pros | Cons |
|----------|------|------|
| **@clerk/backend (chosen)** | 1 package, Clerk handles JWKS/rotation, simpler | Less community examples |
| Passport + jwks-rsa | Well-documented NestJS pattern | 4 packages, more abstraction layers |

### 2.2 Data Model: Tenant → Client → Job → Candidate

```
Tenant (Org)
├── Users (Recruiters)
├── Clients (Companies)
│   └── Jobs (Open Positions)
└── Candidates
    └── Pipeline Stages
```

**Alternative rejected:** Many-to-many relationships (Phase 1 complexity).

### 2.3 Stack: Next.js + NestJS + Prisma + PostgreSQL

- **Next.js 15:** React with SSR, App Router, Turbopack
- **NestJS 10:** TypeScript-first, GraphQL code-first
- **Prisma 7:** Type-safe ORM, ULID primary keys
- **PostgreSQL 16:** JSONB support, mature ecosystem

**Alternative rejected:** Rails/Laravel (slower TypeScript iteration).

### 2.4 API: GraphQL Code-First

NestJS generates schema from TypeScript classes. Frontend auto-generates typed hooks via GraphQL Codegen. DataLoader prevents N+1 queries.

**Alternative rejected:** REST (more verbose, less type-safe).

### 2.5 IDs: Pure ULID

Single ULID field as primary key. 26-character string, timestamp + randomness, sortable by creation time, globally unique. Multi-tenant safe, no enumerable IDs.

| Strategy | Storage | Join Speed | Security | Recommendation |
|----------|---------|------------|----------|----------------|
| Pure Integer | 4 bytes | Fast | Insecure | Rejected |
| **Pure ULID** | 16 bytes | Good | Secure | **Chosen** |
| Hybrid (int + ulid) | 20 bytes | Fast | Secure | Over-engineering |

**Why not hybrid:** Added complexity (dual lookups, extra indexes) for negligible performance gain at CRM scale (10K–100K candidates per tenant).

### 2.6 Real-time: Soketi (self-hosted Pusher alternative)

Live Kanban updates, notifications, collaborative editing conflicts. Pusher-compatible protocol (easy migration to hosted Pusher if needed).

### 2.7 Monorepo: pnpm + Turborepo

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

**Decision:** `$extends` for automatic query scoping via `PrismaService.forTenant(tenantId)`.

```typescript
const db = this.prisma.forTenant(tenantId);
const candidates = await db.candidate.findMany(); // tenantId injected automatically
```

All operations (`findMany`, `create`, `update`, `delete`, `upsert`) get `tenantId` injected. `findUnique` rewritten to `findFirst` (Prisma validates unique-constraint fields only). `Tenant` model operations bypass scoping.

**Alternative rejected:** PostgreSQL RLS (DB-level complexity, conflicts with connection pooling).

### 3.2 Core Schema

```prisma
model Tenant {
  id           String @id @default(ulid())
  org_id       String @unique
  name         String
  users        User[]
  clients      Client[]
  candidates   Candidate[]
  jobs         Job[]
}

model Candidate {
  id                 String    @id @default(ulid())
  tenant_id          String
  first_name         String
  last_name          String
  email              String?
  stage_id           String?
  stage              PipelineStage? @relation(fields: [stage_id])
  last_updated_by    String?
  verification_notes String?
  created_at         DateTime  @default(now())
  updated_at         DateTime  @updatedAt
}

model Client {
  id         String   @id @default(ulid())
  tenant_id  String
  name       String
  industry   String?
  jobs       Job[]
  created_at DateTime @default(now())
}

model Job {
  id          String    @id @default(ulid())
  tenant_id   String
  client_id   String
  client      Client    @relation(fields: [client_id])
  title       String
  description String
  status      JobStatus @default(OPEN)
  assigned_to String
  created_at  DateTime  @default(now())
}
```

---

## 4. Phase 1 Implementation Priorities

### 4.1 Launch Requirements
1. Manual Kanban Board (drag & drop + real-time sync)
2. Basic CRUD (Candidates, Clients, Jobs)
3. Activity Timeline (manual interaction logging)
4. Human Decision Audit (track all recruiter actions)
5. Tenant Isolation (strict data separation)

### 4.2 Technical Infrastructure
1. Clerk authentication with tenant context
2. Prisma schema with tenant isolation
3. Soketi WebSocket for live updates
4. GraphQL with type generation
5. Next.js with Shadcn/ui + Tailwind v4

---

## 5. Cowork Task Queue & Scheduled Execution (Phase 3)

CRM manages a **generic task queue** that Claude Cowork consumes on a 30-min schedule. CRM is the brain (creates, prioritises, monitors). Cowork is the hands (pulls via MCP, executes in browser). See @docs/outreaching-technical-plan.md for LinkedIn-specific limits and strategy.

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

Every 30 min, Cowork runs tasks in this order:

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

Schedule is configured in **Claude Cowork**, not in the CRM. The recruiter sets a recurring task in Cowork (interval, active hours, active days). CRM's only job is to keep the right tasks in READY status. Recurring task creation (SCAN_INBOX, SCAN_CONNECTIONS, CHECK_ACCOUNT_HEALTH) is a server-side NestJS cron that runs every 30 min.

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

## 6. Future-Proofing (Phase 2+)

- **AI Integration:** `IAIService` interface for `suggestMatches`, `draftMessage`, `parseResume` — Phase 1 mocks, Phase 3+ real
- **Plugin Architecture:** Input channels as separate modules
- **Event System:** Database changes emit events for automation
- **Audit Trail:** All human decisions logged (future AI training data)

---

## 7. Performance Targets

| Metric | Target |
|--------|--------|
| Time to first candidate added | < 10 min from signup |
| Kanban drag responsiveness | < 100ms |
| Real-time sync latency | < 500ms |
| Page load | < 2s |
| API response (p95) | < 200ms |
| DB queries (avg) | < 50ms |
| WebSocket uptime | > 99.9% |
| Concurrent users/tenant | 50+ |

---

## 8. API Foundation Decisions (Story 1.3)

### 8.1 TypeScript Runtime: tsx instead of nest start

**Decision:** Use `tsx` (via `tsx watch` for dev, `tsx src/main.ts` for prod) instead of `nest start --watch` / `node dist/main`.

**Why:** Prisma 7 generates ESM-only TypeScript code (`import.meta.url`, ES imports). NestJS's default tsc compiler outputs CJS (no `"type": "module"` in package.json), causing `ReferenceError: exports is not defined in ES module scope` at runtime. `tsx` transparently handles mixed ESM/CJS modules.

**Alternatives considered:**

| Option | Pros | Cons |
|--------|------|------|
| `tsx` (chosen) | Zero config, handles ESM/CJS, already a dep | Slight startup overhead vs raw `node` |
| SWC builder | NestJS-recommended | `@swc/cli` v0.8 incompatible with `@nestjs/cli` v10 |
| `"type": "module"` in package.json | Native ESM | Breaks NestJS/Jest configs, widespread import changes |

**Trade-offs:** Marginal startup overhead from tsx is acceptable for dev and low-traffic API.

### 8.2 DataLoader for N+1 Prevention

**Decision:** Request-scoped `DataLoaderService` (global module) with batch loaders for each entity.

**Implementation:**
- `DataLoaderService` is `@Injectable({ scope: Scope.REQUEST })` — fresh per GraphQL request, no cross-request cache leakage
- Loaders: `clientById`, `userById`, `candidateById`, `jobsByClientId`
- Resolvers use `@ResolveField()` + DataLoader for relationship fields instead of eager includes

### 8.3 Error Handling & Validation

**Decision:** Three-layer approach:
1. **ValidationPipe** (global) — `class-validator` decorators on DTOs, whitelist mode, forbid unknown properties
2. **GraphqlExceptionFilter** — catches all resolver exceptions, maps HTTP status codes to Apollo error codes (BAD_USER_INPUT, NOT_FOUND, UNAUTHENTICATED, FORBIDDEN, INTERNAL_SERVER_ERROR)
3. **Structured logging** — unexpected errors logged with full stack, sanitized message returned to client

### 8.4 GraphQL Code-First Object Types

**Decision:** Shared GraphQL ObjectType models in `src/common/graphql/models/` with registered enums in `src/common/graphql/enums.ts`.

**Pattern:** Models declare scalar fields only. Relationship fields (Client→Jobs, Job→Client, Job→AssignedTo) are resolved via `@ResolveField()` in their respective resolvers using DataLoaders, avoiding circular imports and N+1 queries.
