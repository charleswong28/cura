# CRM Technical Design Document: Cura (Phase 1)

## 1. System Architecture

### 1.1 High-Level Architecture
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

### 1.2 Request/Response Flow
**Example: User drags candidate to new pipeline stage**

1. **Frontend Action:** User drags candidate card in Kanban board
2. **GraphQL Mutation:** Next.js sends `moveCandidateToStage` mutation with Clerk JWT
3. **Authentication:** NestJS validates JWT, extracts `tenant_id` and `user_id`
4. **Database Update:** Prisma updates candidate stage with tenant isolation
5. **Real-time Broadcast:** NestJS emits event to Soketi WebSocket
6. **Live Updates:** All connected team members see board update instantly
7. **Response:** Frontend receives confirmation and updates optimistic UI

---

## 2. Core Technical Decisions

### 2.1 Multi-Tenancy Strategy
**Decision:** Clerk Organizations as tenant boundary

**Implementation:**
- Each headhunting firm = Clerk Organization
- JWT includes `org_id` as tenant identifier  
- Database queries auto-scoped by `tenant_id`

| Pros | Cons |
|------|------|
| ✅ Built-in user management & SSO | ❌ Vendor lock-in to Clerk |
| ✅ JWT includes org context | ❌ Limited customization |
| ✅ Easy org switching UI | ❌ Subscription costs scale |

**Alternative Considered:** Custom tenant management (rejected for complexity)

### 2.2 Data Model Hierarchy
**Decision:** Tenant → Client → Job → Candidate pipeline

**Core Entities:**
```
Tenant (Org)
├── Users (Recruiters)
├── Clients (Companies)
│   └── Jobs (Open Positions)
└── Candidates
    └── Pipeline Stages
```

| Pros | Cons |
|------|------|
| ✅ Clear ownership chain | ❌ Rigid hierarchy |
| ✅ Simple access control | ❌ Candidate can't work multiple clients |
| ✅ Easy to understand | ❌ May need restructuring later |

**Alternative Considered:** Many-to-many relationships (rejected for Phase 1 complexity)

### 2.3 Tech Stack for Fast Development
**Decision:** Next.js + NestJS + Prisma + PostgreSQL

**Stack Rationale:**
- **Next.js:** React with SSR, great DX, rapid UI development
- **NestJS:** TypeScript-first, GraphQL support, scalable architecture  
- **Prisma:** Type-safe ORM, great migrations, excellent DX
- **PostgreSQL:** Reliable, JSONB support, mature ecosystem

| Pros | Cons |
|------|------|
| ✅ TypeScript end-to-end type safety | ❌ Newer ecosystem, smaller talent pool |
| ✅ Rapid development & iteration | ❌ Some tools still maturing |
| ✅ Excellent developer experience | ❌ Learning curve for team |
| ✅ Strong community & resources | ❌ More moving parts than monolith |

**Alternative Considered:** Rails/Laravel (rejected for slower TypeScript iteration)

### 2.4 API Strategy
**Decision:** GraphQL with code-first schema generation

**Implementation:**
- NestJS generates GraphQL schema from TypeScript classes
- Frontend auto-generates typed hooks via GraphQL Codegen
- DataLoader prevents N+1 queries

| Pros | Cons |
|------|------|
| ✅ Type safety from DB to UI | ❌ GraphQL learning curve |
| ✅ Efficient queries, no over-fetching | ❌ Complex caching vs REST |
| ✅ Auto-generated client types | ❌ Harder to debug than REST |
| ✅ Single endpoint, flexible queries | ❌ File uploads more complex |

**Alternative Considered:** REST API (simpler but more verbose, less type-safe)

### 2.5 ID Strategy
**Decision:** Pure ULID (Universally Unique Lexicographically Sortable ID)

**Implementation:**
- Single ULID field as primary key
- 26-character string, timestamp + randomness  
- Sortable by creation time, globally unique
- Prisma: `@id @default(ulid())`

| Strategy | Storage | Join Speed | Security | Complexity | Recommendation |
|----------|---------|------------|----------|------------|----------------|
| **Pure Integer** | 4 bytes | ⭐⭐⭐ | ❌ | ⭐⭐⭐ | Fast but insecure |
| **Pure ULID** | 16 bytes | ⭐⭐ | ✅ | ⭐⭐ | **Chosen** |
| **Hybrid (int + ulid)** | 20 bytes | ⭐⭐⭐ | ✅ | ⭐ | Over-engineering |

**Why Pure ULID over Hybrid:**
```typescript
// Hybrid approach considered:
model Candidate {
  id    Int    @id @default(autoincrement()) // Fast joins
  ulid  String @unique @default(ulid())      // API security
}

// Rejected because:
// ❌ Added complexity (dual lookups, extra indexes)
// ❌ Premature optimization (CRM scale doesn't need it)
// ❌ Slower development (Phase 1 priority = speed)
```

**Pure ULID Benefits:**
- Multi-tenant safety (no collision across orgs)
- Natural chronological sorting when needed  
- API security (no enumerable IDs)
- Simpler schema and queries
- Future-proof for distributed services

**Performance Reality:** For typical CRM scale (10K-100K candidates per tenant), string join performance difference is negligible vs development complexity trade-off.

### 2.6 Real-time Updates
**Decision:** Soketi (self-hosted Pusher alternative)

**Use Cases:**
- Live Kanban board updates
- Notification system
- Collaborative editing conflicts

| Pros | Cons |
|------|------|
| ✅ Real-time user experience | ❌ Additional infrastructure complexity |
| ✅ Self-hosted = cost effective | ❌ WebSocket connection management |
| ✅ Pusher-compatible (easy migration) | ❌ Scaling WebSocket connections |

**Alternative Considered:** Simple polling (rejected for poor UX)

---

## 3. Database Design (Core Entities)

### 3.1 Tenant Isolation Strategy
```sql
-- Every table includes tenant_id for strict isolation
CREATE TABLE candidates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,  -- Automatic scoping
  first_name VARCHAR NOT NULL,
  -- ... other fields
);

-- Prisma extension auto-adds tenant_id to all queries
```

### 3.2 Core Schema (Simplified)
```typescript
model Tenant {
  id         String @id @default(ulid())
  clerk_org_id String @unique
  name       String
  
  users      User[]
  clients    Client[]
  candidates Candidate[]
  jobs       Job[]
}

model Candidate {
  id           String @id @default(ulid())
  tenant_id    String
  first_name   String
  last_name    String
  email        String?
  
  // Pipeline management (Phase 1 focus)
  stage_id     String?
  stage        PipelineStage? @relation(fields: [stage_id])
  
  // Human verification tracking
  last_updated_by String?
  verification_notes String?
  
  // ULID provides natural sorting by creation time
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
}

model Client {
  id        String @id @default(ulid())
  tenant_id String
  name      String
  industry  String?
  
  jobs      Job[]
  created_at DateTime @default(now())
}

model Job {
  id          String @id @default(ulid())
  tenant_id   String
  client_id   String
  client      Client @relation(fields: [client_id])
  
  title       String
  description String
  status      JobStatus @default(OPEN)
  
  // Human assignment
  assigned_to String // Recruiter user_id
  created_at  DateTime @default(now())
}
```

---

## 4. Phase 1 Implementation Priorities

### 4.1 Human-Heavy Features (Launch Requirements)
1. **Manual Kanban Board** - Drag & drop with real-time sync
2. **Basic CRUD Operations** - Candidates, Clients, Jobs
3. **Activity Timeline** - Manual logging of interactions  
4. **Human Decision Audit** - Track all recruiter actions
5. **Tenant Isolation** - Strict data separation

### 4.2 Technical Infrastructure
1. **Authentication** - Clerk integration with tenant context
2. **Database** - Prisma schema with tenant isolation
3. **Real-time** - Soketi WebSocket for live updates
4. **API Layer** - GraphQL with type generation
5. **Frontend** - Next.js with Shadcn/ui components

---

## 5. Future-Proofing (Phase 2+ Preparation)

### 5.1 AI Integration Points
```typescript
// Placeholder interfaces for future AI services
interface IAIService {
  suggestMatches(jobId: string): Promise<Candidate[]>;
  draftMessage(candidateId: string, jobId: string): Promise<string>;
  parseResume(file: Buffer): Promise<CandidateData>;
}

// Phase 1: Mock implementations return empty/null
// Phase 3+: Real AI service integration
```

### 5.2 Extensibility Considerations
- **Plugin Architecture:** Input channels as separate modules
- **Event System:** Database changes emit events for future automation
- **Audit Trail:** All human decisions logged for AI training data
- **Confidence Scoring:** Framework for future automation thresholds

---

## 6. Success Metrics & Performance Targets

### 6.1 User Experience
- **Time to first candidate added:** < 10 minutes from signup
- **Kanban drag responsiveness:** < 100ms
- **Real-time sync latency:** < 500ms
- **Page load times:** < 2 seconds

### 6.2 Technical Performance
- **API response time:** < 200ms (95th percentile)
- **Database queries:** < 50ms average
- **WebSocket uptime:** > 99.9%
- **Concurrent users per tenant:** 50+

---

This technical design prioritizes **speed of development** and **human trust-building** while establishing the foundation for future AI automation phases.