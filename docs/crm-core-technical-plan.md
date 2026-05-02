# CRM Core Technical Design — Domain Entities & Gllue Migration

> **Parent doc:** `@docs/crm-technical-plan.md` (system architecture, auth/authz decisions, reporting layer)
> **Auth/permission deep-dive:** `docs/authn-authz-technical-plan.md`
> **Gllue research reference:** `docs/gllue_anaylsis/gllue-research.md`

## What this document covers

- Extended Prisma schema for all CRM domain entities (Candidate + resume sub-records, ClientContact, JobApplication spine, stage tables)
- NestJS module architecture per domain entity (file layout, service responsibilities, permission auto-grants)
- Rollup counter strategy
- Gllue → Cura one-directional migration tool: MySQL read-replica connection, incremental cron sync, idempotency model, read-only enforcement, cutover procedure

## What this document does NOT cover

- Auth/identity schema (AuthIdentity, Session, MfaDevice) — see `docs/authn-authz-technical-plan.md`
- Permission/Role schema — see `docs/crm-technical-plan.md §3.4`
- Reporting / analytics layer — see `docs/crm-technical-plan.md §6`
- Browser agent / outreach tasks — see `docs/crm-technical-plan.md §5`

---

## 1. Extended Domain Schema

### 1.1 What the current schema already has

`js/apps/api/prisma/schema.prisma` contains minimal versions of `Candidate`, `Client`, and `Job`. This document specifies all additions made to reach full Phase 1 parity.

### 1.2 ClientContact

Gllue stores HR contacts as `candidate` rows with `type='clientcontact'`. Cura deliberately uses a **separate model** to avoid the type-discriminator anti-pattern (see `docs/gllue_anaylsis/gllue-research.md §"Reverse-engineering implications"`).

```prisma
model ClientContact {
  id          String    @id
  tenantId    String    @map("tenant_id")
  clientId    String    @map("client_id")
  client      Client    @relation(fields: [clientId], references: [id])
  ownerUserId String?   @map("owner_user_id")
  createdById String?   @map("created_by_id")
  firstName   String    @map("first_name")
  lastName    String    @map("last_name")
  title       String?
  email       String?
  phone       String?
  isPrimary   Boolean   @default(false) @map("is_primary")
  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@index([tenantId, clientId])
  @@map("client_contacts")
}
```

### 1.3 Candidate Resume Sub-Records

Gllue has `candidateexperience`, `candidateeducation`, `candidatelanguage`, `candidateaward`, `candidateproject` (and more). Phase 1 ships the three used in candidate profiles:

```prisma
model CandidateExperience {
  id, tenantId, candidateId, company, title, location, startDate, endDate,
  isCurrent, description, displayOrder
}

model CandidateEducation {
  id, tenantId, candidateId, institution, degree, field, startDate, endDate,
  displayOrder
}

model CandidateLanguage {
  id, tenantId, candidateId, language (ISO 639-1), proficiency (LanguageProficiency enum)
  @@unique([tenantId, candidateId, language])
}

enum LanguageProficiency { BASIC | CONVERSATIONAL | PROFESSIONAL | NATIVE }
```

Full definitions are in `prisma/schema.prisma`.

### 1.4 Pipeline Spine + Stage Tables

The pipeline follows the `jobsubmission`-style spine pattern from Gllue research §4 — one row per (Candidate × Job), with stage transitions as separate append-only rows. This avoids the "enum-on-one-row" anti-pattern that loses history.

```
JobApplication (spine: candidateId × jobId)
  └── ApplicationStage[]   — append-only typed event log (APPLIED → LONGLIST → CV_SENT → INTERVIEW → OFFER → PLACEMENT | REJECTED)
  └── Interview[]          — per round, with feedback and rating
  └── Offer[]              — amount, currency, signed/declined timestamps
  └── Placement[]          — final outcome (salary, fee, fee type)
```

**`JobApplication`** key fields:
- `maxStage ApplicationStageType` — cached highest stage reached (avoids MAX scan at read time)
- `isActive Boolean` — false after REJECTED or PLACEMENT (for list-view filtering)
- `matchScore Decimal?` — reserved for AI scoring (Phase 3)
- `@@unique([tenantId, candidateId, jobId])` — one application per candidate per job

**`ApplicationStageType` enum**: `APPLIED | LONGLIST | CV_SENT | INTERVIEW | OFFER | PLACEMENT | REJECTED`

**`ApplicationStage`** is append-only. Never update or delete stage rows. `enteredAt` is the transition timestamp; `enteredById` is the recruiter who triggered it.

Full definitions are in `prisma/schema.prisma`.

### 1.5 Updated Rollup Fields

`Client` gains:
- `activeJobCount Int @default(0)` — jobs with `status=OPEN`
- `totalJobCount Int @default(0)` — all non-deleted jobs

`Job` gains:
- `applicationCount`, `interviewCount`, `offerCount`, `placementCount` — maintained by service layer

---

## 2. NestJS Module Architecture

### 2.1 Module layout (per domain)

Each domain module follows the same file structure. All four (candidate, client, job, job-application) are under `js/apps/api/src/`:

```
src/
  candidate/
    candidate.module.ts
    candidate.resolver.ts
    candidate.service.ts
    dto/
      create-candidate.input.ts
      update-candidate.input.ts
      candidate-filter.input.ts
  client/
    client.module.ts
    client.resolver.ts
    client.service.ts
    client-contact.service.ts
    dto/
      create-client.input.ts
      update-client.input.ts
      create-client-contact.input.ts
  job/
    job.module.ts
    job.resolver.ts
    job.service.ts
    dto/
      create-job.input.ts
      update-job.input.ts
  job-application/
    job-application.module.ts
    job-application.resolver.ts
    job-application.service.ts
    dto/
      create-job-application.input.ts
      advance-stage.input.ts
      add-interview.input.ts
      add-offer.input.ts
      add-placement.input.ts
```

### 2.2 Common patterns

**Tenant scoping** — every service call starts with:
```typescript
const db = this.prisma.forTenant(tenantId);
```

**ID generation** — every `create` call passes the id explicitly:
```typescript
await db.candidate.create({ data: { id: generateId(), ...mapped } });
```

**GraphQL models** declare scalar fields only. Relationship fields (`job.client`, `candidate.applications`) are resolved via `@ResolveField()` + DataLoaders (see `src/dataloader/`).

**Audit** — every mutation writes an `AuditLog` entry via the injected `AuditLogService`.

**Soft delete** — `deleteCandidate` sets `deletedAt = now()`. All list queries add `{ where: { deletedAt: null } }`.

### 2.3 Permission auto-grants on create

When a record is created, the service calls `PermissionService.autoGrant(resource, id, actor)` which creates `Permission` rows per these rules:

| Entity | Grantee | Level | Source |
|--------|---------|-------|--------|
| Candidate | `createdById` | OWNER | RULE |
| Candidate | creator's teams | VIEW | RULE |
| Client | `bdUserId` (if set), else `createdById` | OWNER | RULE |
| Client | creator's teams | VIEW | RULE |
| Job | `createdById` | OWNER | RULE |
| Job | `ownerUserId` (if ≠ creator) | EDIT | RULE |
| Job | client's `bdUserId` teams | VIEW | RULE |
| JobApplication | `createdById` | OWNER | RULE |
| JobApplication | job's `ownerUserId` | EDIT | RULE |
| JobApplication | candidate's `ownerUserId` | VIEW | RULE |

Cascade rules (seeded in `PermissionCascadeRule`) propagate access transitively:
- VIEW on `JobApplication` → VIEW on its `Candidate` and `Job`

### 2.4 Rollup counter maintenance

Rollup counters are maintained in the **service layer** (not DB triggers) to keep the migration clean:

| Event | Counter change |
|-------|---------------|
| `createJob(status=OPEN)` | `Client.activeJobCount++`, `Client.totalJobCount++` |
| `createJob(status≠OPEN)` | `Client.totalJobCount++` |
| `updateJob(status: OPEN→FILLED\|CLOSED)` | `Client.activeJobCount--` |
| `updateJob(status: FILLED\|CLOSED→OPEN)` | `Client.activeJobCount++` |
| `createJobApplication` | `Job.applicationCount++` |
| `advanceStage(INTERVIEW)` | `Job.interviewCount++` |
| `advanceStage(OFFER)` | `Job.offerCount++` |
| `advanceStage(PLACEMENT)` | `Job.placementCount++` |

A nightly reconciliation cron (see §3.6) rebuilds all counters from actual counts to guard against drift.

---

## 3. Gllue → Cura Migration Tool

### 3.1 Context and design principles

During the parallel-run period:
- Gllue is the authoritative system; recruiters continue working in Gllue
- Cura is a **read-only mirror** of Gllue data until a deliberate cutover
- Cron jobs sync new and updated Gllue records into Cura at regular intervals
- On cutover day, an admin triggers the final sync and flips the read-only flag

**Design principles:**
1. **One-directional** — Gllue → Cura only. No write-back.
2. **Idempotent** — re-running any sync produces the same result.
3. **Incremental** — each run processes only rows changed since the last cursor.
4. **Dependency-safe** — FK references resolved via `MigrationMapping`; unresolvable FKs skip + retry next run.
5. **Read-only enforcement** — all domain mutations check `MigrationConfig.readOnly` before executing.

### 3.2 Source connection

The migration module connects to the Gllue MySQL database via a dedicated `mysql2/promise` connection pool — separate from Cura's Prisma/PostgreSQL connection.

```
Environment variable: GLLUE_MYSQL_URL
Format:              mysql://readonly_user:password@replica-host:3306/gllue_production
Tenant binding:      GLLUE_TENANT_ID — the Cura tenant ULID this Gllue instance maps to
```

The `GllueClientService` wraps the pool and exposes a typed `query<T>()` method. The pool uses a **read-only MySQL user** with `SELECT` privileges only on the Gllue schema.

### 3.3 Migration models in Prisma

Three models support the migration tool (all in `prisma/schema.prisma`):

**`MigrationMapping`** — idempotency map
```
sourceTable + sourceId + tenantId → targetModel + targetId + checksum
```
Every migrated Gllue record has a row here. Before inserting a Cura record, check this table. After insert, write the mapping. On next run, detect changes via MD5 checksum of the serialized source row.

**`MigrationSyncCursor`** — incremental sync state
```
tenantId + sourceTable → lastSyncAt, lastProcessedId, errorCount, lastError
```
One row per (tenant, table). `lastSyncAt` is the timestamp used in the delta query. Updated after each successful batch. On error: increment `errorCount`, store `lastError`, leave `lastSyncAt` unchanged (so next run retries).

**`MigrationConfig`** — tenant migration state machine
```
tenantId → status (ACTIVE|CUTOVER|DISABLED), readOnly, syncEnabled, cutoverDate
```
Controls read-only enforcement and cron on/off. Cached in Redis (`migration:config:{tenantId}`, TTL 5 min) for fast mutation guard checks.

### 3.4 Module file structure

```
src/migration/
  migration.module.ts              — imports PrismaModule, ScheduleModule; exports MigrationService
  migration.service.ts             — orchestrator: initiateCutover(), getStatus(), triggerSync()
  migration.guard.ts               — MigrationReadOnlyGuard: checks MigrationConfig.readOnly
  gllue-client.service.ts          — mysql2/promise pool, typed query()
  sync/
    identity-sync.service.ts       — baseuser, user, team, team2, team3
    client-sync.service.ts         — client, clientcontact
    candidate-sync.service.ts      — candidate (type='candidate'), sub-records
    job-sync.service.ts            — joborder
    application-sync.service.ts   — jobsubmission + stage tables
    reconciliation.service.ts      — daily count audit + drift alerting
  mappers/
    user.mapper.ts
    team.mapper.ts
    client.mapper.ts
    client-contact.mapper.ts
    candidate.mapper.ts
    candidate-experience.mapper.ts
    candidate-education.mapper.ts
    candidate-language.mapper.ts
    job.mapper.ts
    job-application.mapper.ts
    application-stage.mapper.ts
    interview.mapper.ts
    offer.mapper.ts
    placement.mapper.ts
```

### 3.5 Mapper interface

Every mapper implements:

```typescript
export interface GllueMapper<S extends Record<string, unknown>, T> {
  readonly sourceTable: string;   // Gllue table name
  readonly targetModel: string;   // Cura model name (for MigrationMapping)
  readonly prismaModel: string;   // Prisma client accessor key

  /** Transform a raw Gllue row into Cura create-data. Returns null to skip. */
  map(
    row: S,
    tenantId: string,
    resolveFk: FkResolver,        // resolves Gllue FK → Cura ULID
  ): Promise<T | null>;
}

type FkResolver = (sourceTable: string, sourceId: number | string, tenantId: string) => Promise<string | null>;
```

Each mapper handles:
- Field renames (`first_name` → `firstName`)
- Type coercions (MySQL integers → strings, date strings → `Date` objects)
- Status mapping (Gllue integer status codes → Cura enums)
- Soft-delete propagation (`is_deleted = 1` → `deletedAt = dateAdded`)

### 3.6 Cron schedule

Using `@nestjs/schedule` with `@Cron()` decorators in each sync service:

| Service | Gllue tables | Cura models | Schedule |
|---------|-------------|-------------|----------|
| `IdentitySyncService` | `baseuser`, `user`, `team`, `team2`, `team3` | `AuthIdentity`, `User`, `Team`, `TeamMember` | `0 2 * * *` (02:00 daily) |
| `ClientSyncService` | `client`, `clientcontact` | `Client`, `ClientContact` | `*/30 * * * *` (every 30 min) |
| `CandidateSyncService` | `candidate`, `candidateexperience`, `candidateeducation`, `candidatelanguage` | `Candidate` + sub-records | `*/15 * * * *` (every 15 min) |
| `JobSyncService` | `joborder` | `Job` | `*/30 * * * *` (every 30 min) |
| `ApplicationSyncService` | `jobsubmission`, `apply`, `cvsent`, `clientinterview`, `offersign`, `onboard` | `JobApplication`, `ApplicationStage`, `Interview`, `Offer`, `Placement` | `*/15 * * * *` (every 15 min) |
| `ReconciliationService` | all tables | count audit | `0 6 * * *` (06:00 daily) |

Each `@Cron` method checks `MigrationConfig.syncEnabled` first and skips if `false` or if `status = DISABLED`.

### 3.7 Incremental sync algorithm

Every sync service uses the same cursor-based loop:

```typescript
async syncTable(tenantId: string, mapper: GllueMapper): Promise<SyncResult> {
  if (!(await this.migrationService.isSyncEnabled(tenantId))) return;

  // 1. Load or create cursor (epoch default = full scan on first run)
  const cursor = await this.upsertCursor(tenantId, mapper.sourceTable);

  let hasMore = true;
  let created = 0, updated = 0, skipped = 0, errors = 0;

  while (hasMore) {
    const rows = await this.gllueClient.query<GllueRow[]>(`
      SELECT * FROM \`${mapper.sourceTable}\`
      WHERE lastUpdateDate > ? OR dateAdded > ?
      ORDER BY id ASC
      LIMIT 500
    `, [cursor.lastSyncAt, cursor.lastSyncAt]);

    for (const row of rows) {
      try {
        await this.processRow(row, tenantId, mapper);
        created++; // or updated/skipped
      } catch (err) {
        errors++;
        this.logger.error(`Sync error ${mapper.sourceTable}#${row.id}: ${err.message}`);
      }
    }

    // Update cursor after each batch
    await this.updateCursor(tenantId, mapper.sourceTable);

    hasMore = rows.length === 500; // keep looping in catch-up mode
  }

  return { created, updated, skipped, errors };
}

async processRow(row: GllueRow, tenantId: string, mapper: GllueMapper) {
  const sourceId = String(row.id);
  const checksum = createHash('md5').update(JSON.stringify(row)).digest('hex');

  const existing = await this.prisma.migrationMapping.findUnique({
    where: { sourceTable_sourceId_tenantId: { sourceTable: mapper.sourceTable, sourceId, tenantId } },
  });

  if (!existing) {
    // New record
    const mapped = await mapper.map(row, tenantId, this.resolveFk.bind(this));
    if (!mapped) return; // mapper returned null → skip (e.g. unresolvable FK)

    const id = generateId();
    await (this.prisma.forTenant(tenantId) as any)[mapper.prismaModel].create({ data: { id, ...mapped } });
    await this.prisma.migrationMapping.create({
      data: { id: generateId(), tenantId, sourceTable: mapper.sourceTable, sourceId,
              targetModel: mapper.targetModel, targetId: id, checksum },
    });
  } else if (existing.checksum !== checksum) {
    // Changed record
    const mapped = await mapper.map(row, tenantId, this.resolveFk.bind(this));
    if (!mapped) return;

    await (this.prisma.forTenant(tenantId) as any)[mapper.prismaModel].update({
      where: { id: existing.targetId }, data: mapped,
    });
    await this.prisma.migrationMapping.update({
      where: { id: existing.id }, data: { checksum },
    });
  }
  // else: checksum matches → skip
}

async resolveFk(sourceTable: string, sourceId: number | string, tenantId: string): Promise<string | null> {
  const mapping = await this.prisma.migrationMapping.findUnique({
    where: { sourceTable_sourceId_tenantId: { sourceTable, sourceId: String(sourceId), tenantId } },
  });
  return mapping?.targetId ?? null;
}
```

### 3.8 Backfill dependency order

On first run (or after resetting cursors), tables must sync in this order to satisfy FK dependencies:

1. `IdentitySyncService` — users and teams (no external FKs)
2. `ClientSyncService` — clients (no external FKs)
3. `CandidateSyncService` — candidates (ownership FK to user, resolved lazily)
4. `JobSyncService` — jobs (FK to client)
5. `ApplicationSyncService` — applications (FKs to candidate + job)

`MigrationService.runFullBackfill(tenantId)` triggers this sequence in order. Regular crons run independently (unresolvable FKs skip and retry on next tick).

### 3.9 Gllue → Cura field mapping

Key field mappings per entity:

**candidate → Candidate**

| Gllue field | Cura field | Notes |
|-------------|-----------|-------|
| `id` | `MigrationMapping.sourceId` | Not used as Cura PK |
| `first_name` | `firstName` | |
| `last_name` | `lastName` | |
| `email` | `email` | |
| `phone_number` | `phone` | |
| `current_company` | `currentCompany` | |
| `current_title` | `currentTitle` | |
| `location` | `location` | |
| `status` (int) | `status` (enum) | 1=ACTIVE, 2=INACTIVE, 3=PLACED, 4=BLACKLISTED |
| `addedBy_id` | `createdById` | via MigrationMapping('user', addedBy_id) |
| `dateAdded` | `createdAt` | |
| `is_deleted=1` | `deletedAt = lastUpdateDate` | |

**client → Client**

| Gllue field | Cura field | Notes |
|-------------|-----------|-------|
| `name` | `name` | |
| `industry` | `industry` | |
| `website` | `website` | |
| `phone` | `phone` | |
| `address` | `address` | |
| `bd_id` | `bdUserId` | via MigrationMapping('user', bd_id) |
| `parent_id` | `parentId` | via MigrationMapping('client', parent_id) |

**joborder → Job**

| Gllue field | Cura field | Notes |
|-------------|-----------|-------|
| `title` | `title` | |
| `description` | `description` | |
| `client_id` | `clientId` | via MigrationMapping('client', client_id) |
| `status` (int) | `status` (enum) | 1=OPEN, 2=ON_HOLD, 3=FILLED, 4=CLOSED |
| `addedBy_id` | `createdById` | |

**jobsubmission → JobApplication**

| Gllue field | Cura field | Notes |
|-------------|-----------|-------|
| `candidate_id` | `candidateId` | via MigrationMapping |
| `joborder_id` | `jobId` | via MigrationMapping |
| `source` | `source` | string passthrough |
| `max_status` | `maxStage` | integer → ApplicationStageType |
| `ai_match_score` | `matchScore` | |

**Stage tables → ApplicationStage**

Gllue's `apply`, `cvsent`, `clientinterview`, `offersign`, `onboard` tables all become `ApplicationStage` rows with `stage` set to the corresponding enum value. The `clientinterview` table additionally produces an `Interview` row.

### 3.10 Read-only enforcement

`MigrationReadOnlyGuard` is applied to all domain mutations in `CandidateResolver`, `ClientResolver`, `JobResolver`, and `JobApplicationResolver`:

```typescript
@Injectable()
export class MigrationReadOnlyGuard implements CanActivate {
  constructor(
    private readonly migrationService: MigrationService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req } = GqlExecutionContext.create(context).getContext();
    const tenantId = req.user?.tenantId;
    if (!tenantId) return true; // let auth guard handle missing token

    const cacheKey = `migration:config:${tenantId}`;
    let config = await this.redisService.getJson<MigrationConfig>(cacheKey);
    if (!config) {
      config = await this.migrationService.getConfig(tenantId);
      if (config) await this.redisService.setJson(cacheKey, config, 300); // 5 min TTL
    }

    if (config?.readOnly) {
      throw new ForbiddenException(
        'MIGRATION_READ_ONLY: Cura is in read-only mode during the Gllue parallel-run window. Contact your administrator to initiate cutover.',
      );
    }
    return true;
  }
}
```

Applied via `@UseGuards(MigrationReadOnlyGuard)` on each mutation method. **Not** applied to user management, team management, or permission operations.

### 3.11 Cutover procedure

The cutover is a **manual, one-time admin operation** — never automated.

`MigrationService.initiateCutover(tenantId: string, actorId: string)`:

1. Verify `actorId` has `ADMIN` role in the tenant
2. Run final sync for all tables (synchronous, blocking, in dependency order)
3. Update `MigrationConfig`:
   ```
   status = CUTOVER, readOnly = false, syncEnabled = false, cutoverDate = now()
   ```
4. Invalidate Redis cache: `DEL migration:config:{tenantId}`
5. Write `AuditLog`: `{ action: 'migration.cutover_completed', actorId, tenantId, newValue: { cutoverDate } }`
6. Return summary: `{ cutoverDate, recordsCopied: { candidates, clients, jobs, applications } }`

After cutover, crons continue running but `syncEnabled = false` means they no-op immediately. The Gllue MySQL connection can be closed.

### 3.12 Environment variables

| Variable | Description |
|----------|-------------|
| `GLLUE_MYSQL_URL` | `mysql://readonly:password@replica-host:3306/gllue_db` |
| `GLLUE_TENANT_ID` | Cura Tenant ULID that this Gllue instance maps to |
| `MIGRATION_BATCH_SIZE` | Rows per sync batch (default: `500`) |

---

## 4. Key Design Decisions

### 4.1 mysql2 for Gllue connection

**Decision:** Use `mysql2/promise` directly, not Prisma.

**Rationale:** Prisma doesn't support multi-provider connections (Cura uses PostgreSQL; Gllue is MySQL). `mysql2` gives full control over the query text and is already the de-facto MySQL driver for Node.

**Alternative considered:** A separate Prisma client with `provider = "mysql"` in its own schema. Rejected — would generate a second client with conflicting type names.

### 4.2 @nestjs/schedule for cron

**Decision:** `@nestjs/schedule` with in-process `@Cron` decorators.

**Rationale:** No new infrastructure required; Redis is already running (for auth). Queue depth is low (delta-only, not full table scan after initial backfill). Job failure leaves `lastSyncAt` unchanged, so the next tick retries automatically.

**Alternative considered:** BullMQ + Redis worker process. Rejected for Phase 1 — migration is a time-bounded activity; the overhead of a separate worker container + queue setup isn't justified.

### 4.3 Cursor-based sync vs. MySQL binlog CDC

**Decision:** Cursor on `lastUpdateDate` + `dateAdded`.

**Rationale:** Binlog CDC requires GTID enabled on the replica and a running Debezium/Canal connector. Gllue's `lastUpdateDate` column exists on every domain table (part of their audit quartet), making cursor-based sync straightforward.

**Risk:** Bulk operations in Gllue that don't update `lastUpdateDate` would be missed by the cursor. The daily reconciliation cron catches drift via row-count comparison.

### 4.4 MigrationMapping as idempotency store

**Decision:** `MigrationMapping` lookup table (fresh ULID on first insert, stable thereafter).

**Rationale:** Deterministic ULID derivation (hash of source ID) would require a custom implementation and prevents using Prisma's ULID semantics. The lookup table is queryable both directions (`sourceId → targetId` and `targetModel + targetId`), supports rollback (delete mapping rows), and costs ~50 bytes per record.

**Alternative considered:** UUID v5 deterministic IDs. Rejected — complicates the existing `generateId()` utility and isn't queryable without recomputing.

### 4.5 ClientContact as a separate model

**Decision:** `ClientContact` is its own Prisma model, not a subtype of `Candidate`.

**Rationale:** Gllue's `type='clientcontact'` discriminator on `candidate` causes every candidate query to need an extra filter, candidate stats to be inflated, and resume sub-records to mix with contact records. See `docs/gllue_anaylsis/gllue-research.md §"Reverse-engineering implications"`.

**Migration mapping:** Gllue rows with `candidate.type = 'clientcontact'` map to Cura `ClientContact`; rows with `type = 'candidate'` map to `Candidate`. The mapper checks the `type` field and routes accordingly.
