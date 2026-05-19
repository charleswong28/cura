# Gllue Connector — Migration Plan

> **Parent docs:** @docs/crm-core-technical-plan.md §3 (Gllue → Cura Migration Tool), @docs/crm-technical-plan.md §10 (Gllue migration summary)
> **Research reference:** docs/gllue_anaylsis/gllue-research.md
> **Branch:** `claude/gllue-migration-connector-KBofk`

## What this document covers

- Product use case: how a Gllue-using prospect evaluates Cura **before** signing a contract
- Connector UX: `Settings → Connectors → Gllue` tab (connection, schedule, status)
- Backend changes to move from env-var single-tenant config to per-tenant connector config
- Phased implementation order, with decisions and trade-offs

## What this document does NOT cover

- Domain mapping rules (already in `@docs/crm-core-technical-plan.md §3.9`)
- Read-only guard implementation (already in `@docs/crm-core-technical-plan.md §3.10`)
- Cutover procedure (already in `@docs/crm-core-technical-plan.md §3.11`) — cutover stays admin-driven
- Permission/auth deep-dive (`docs/authn-authz-technical-plan.md`)

---

## 1. Use Case & Strategy

### 1.1 The prospect we are designing for

A small-to-mid recruiting agency (5–80 recruiters) currently operating on **Gllue**. They have heard about Cura and want to know:

> "Will my data actually look right in Cura? Can I work in it day-to-day? Is the candidate/job/application pipeline complete?"

Today they would need to either trust screenshots, sit through a demo with sample data, or sign a contract and migrate blind. None of those build conviction.

### 1.2 Self-service evaluation flow

1. Prospect signs up for a Cura tenant (free evaluation account, no contract).
2. In **Settings → Connectors → Gllue**, the prospect enters:
   - Gllue MySQL host, port, database name, **read-only** username, password
   - A sync interval (default: every 30 minutes)
3. Cura runs a **connection test**, returns a row-count preview (`candidate: 12,431  client: 287  joborder: 1,902  jobsubmission: 8,540`).
4. Prospect clicks **Start sync**. Cura runs the dependency-ordered backfill (users → clients → candidates → jobs → applications), then the schedule kicks in.
5. Prospect browses **their own real data** inside Cura. They can search, filter, open candidate profiles, see the application pipeline — all backed by their real Gllue data, refreshed every 30 minutes.
6. Cura is **read-only** during this window — `MigrationReadOnlyGuard` blocks every domain mutation. There is no chance of corrupting evaluation data, and **nothing is written back to Gllue, ever**.
7. When the prospect signs a contract, a Cura admin invokes `MigrationService.initiateCutover(tenantId)` — flips `readOnly = false`, stops the sync. The customer is now live on Cura with their real data.

### 1.3 Why this matters

| Lever | Without connector | With connector |
|-------|-------------------|----------------|
| Time to first value | Weeks (CSV export, manual import, demo data) | Minutes (paste creds, see real data) |
| Commitment required to evaluate | Contract, services budget | Read-only DB user |
| Cutover risk | High — first time data lands in Cura is go-live | Low — parallel run window proves migration fidelity |
| Sales motion | Top-down enterprise sale | Bottom-up product-led |

This connector is the wedge that turns "interesting demo" into "I can see my actual pipeline today."

### 1.4 Non-goals

- **Not a write-back integration.** Gllue is treated as a one-way read replica.
- **Not a generic data connector.** Only Gllue MySQL is supported. Bullhorn, Vincere, etc. are future work.
- **Not a schema-discovery tool.** We know the Gllue schema (`docs/gllue_anaylsis/gllue-research.md`). The UI does not browse it.
- **No cutover UI.** Cutover stays an admin/CLI operation — flipping writes on is a deliberate business event that requires commercial agreement first.

---

## 2. Current State (what's already built)

The migration **backend** is already scaffolded — what's missing is per-tenant configuration and any UI surface.

| Piece | Status | Notes |
|-------|--------|-------|
| `MigrationConfig`, `MigrationMapping`, `MigrationSyncCursor` Prisma models | ✅ Exists | `prisma/schema.prisma:803–847` |
| `MigrationService.syncTable / processRow / resolveFk / initiateCutover` | ✅ Exists | `migration/migration.service.ts` |
| `GllueClientService` | ⚠ Single-tenant | Reads `GLLUE_MYSQL_URL` env var. One global pool. |
| Sync services (candidate / client / job / application) | ✅ Exists | `migration/sync/*` — but no `@Cron()` decorators yet |
| Mappers (candidate, client, job, jobapp, stages…) | ✅ Exists | `migration/mappers/*` |
| `MigrationReadOnlyGuard` | ✅ Exists | Wired into module exports; needs verification it's applied on every mutation |
| Settings UI | ❌ MFA tab only | `web-app/src/app/(app)/settings/page.tsx` |
| Connector UI | ❌ — | To build |
| Per-tenant credentials | ❌ — | Currently env var only |
| Encrypted credential storage | ❌ — | Needs envelope encryption |
| Dynamic per-tenant scheduling | ❌ — | Needs `SchedulerRegistry` |
| Connection-test endpoint | ❌ — | To build |
| Sync-status / run-history UI | ❌ — | `MigrationSyncCursor` exposes per-table state; need a `ConnectorRun` model for run history |

---

## 3. Scope of this work

### 3.1 In scope

- Per-tenant Gllue connection configuration (host, port, db, user, encrypted password)
- Connector UI under `Settings → Connectors → Gllue`
- Connection-test endpoint that returns row-count preview
- User-configurable sync schedule + on/off toggle
- Dynamic scheduler (replace static `@Cron()` with `SchedulerRegistry`)
- Per-tenant connection pool manager
- Sync status surface (per-table cursor + last run summary)
- Manual "Run Now" trigger
- Read-only mode banner in app shell

### 3.2 Out of scope (explicit)

- Cutover UI / button (cutover stays admin-driven)
- Write-back to Gllue
- Other ATS connectors (Bullhorn etc.)
- Per-table sync toggles (e.g. "sync candidates but skip clients")
- Schema discovery UI

---

## 4. Data Model Changes

### 4.1 Extend `MigrationConfig`

Add the per-tenant credential and schedule fields:

```prisma
model MigrationConfig {
  // ...existing fields...
  gllueHost              String?               @map("gllue_host")
  gllueDatabase          String?               @map("gllue_database")    // replaces existing gllueSchemaName usage
  gllueUsername          String?               @map("gllue_username")
  gllueEncryptedPassword String?               @map("gllue_encrypted_password")  // AES-256-GCM ciphertext (base64)
  glluePort              Int                   @default(3306) @map("gllue_port")
  gllueLastTestedAt      DateTime?             @map("gllue_last_tested_at")
  gllueTestStatus        ConnectorTestStatus   @default(UNTESTED) @map("gllue_test_status")
  syncIntervalMinutes    Int                   @default(30) @map("sync_interval_minutes")
}

enum ConnectorTestStatus { UNTESTED OK FAILED }
```

`gllueDatabase` supersedes the existing nullable `gllueSchemaName` (kept as alias for now to avoid a destructive migration; we'll deprecate after backfill).

### 4.2 New `ConnectorRun` model — per-run history

Surfaces "what happened on the last sync" in the UI. Today, `MigrationSyncCursor` only carries the latest `lastSyncAt + errorCount`; for the connector UI we want a rolling history.

```prisma
model ConnectorRun {
  id            String              @id
  tenantId      String              @map("tenant_id")
  trigger       ConnectorRunTrigger // SCHEDULE | MANUAL | BACKFILL
  startedAt     DateTime            @default(now()) @map("started_at")
  finishedAt    DateTime?           @map("finished_at")
  status        ConnectorRunStatus  // RUNNING | SUCCESS | PARTIAL | FAILED
  created       Int                 @default(0)
  updated       Int                 @default(0)
  skipped       Int                 @default(0)
  errors        Int                 @default(0)
  errorMessage  String?             @map("error_message")
  byTable       Json?               @map("by_table")  // { candidate: {created, updated, ...}, ... }

  @@index([tenantId, startedAt])
  @@map("connector_runs")
}

enum ConnectorRunTrigger { SCHEDULE MANUAL BACKFILL }
enum ConnectorRunStatus  { RUNNING SUCCESS PARTIAL FAILED }
```

### 4.3 Credential encryption

- Module-level key from env: `MIGRATION_CREDENTIAL_KEY` (32 bytes, base64).
- Per-credential ciphertext format: `v1:<iv-b64>:<tag-b64>:<ct-b64>` using AES-256-GCM.
- Helper lives in `migration/crypto.ts` — `encrypt(plaintext)`, `decrypt(ciphertext)`.
- Plaintext password is **never** persisted, never returned from GraphQL, never logged.

---

## 5. Backend Changes

### 5.1 Refactor `GllueClientService` to per-tenant pool manager

```typescript
@Injectable()
export class GllueClientService implements OnModuleDestroy {
  private pools = new Map<string, { pool: Pool; lastUsedAt: number }>();

  async getPool(tenantId: string): Promise<Pool | null> {
    const cached = this.pools.get(tenantId);
    if (cached) { cached.lastUsedAt = Date.now(); return cached.pool; }

    const config = await this.prisma.migrationConfig.findUnique({ where: { tenantId } });
    if (!config?.gllueHost || !config.gllueEncryptedPassword) return null;

    const pool = createPool({
      host: config.gllueHost,
      port: config.glluePort,
      database: config.gllueDatabase!,
      user: config.gllueUsername!,
      password: decrypt(config.gllueEncryptedPassword),
      connectionLimit: 3,
      connectTimeout: 5_000,
    });
    this.pools.set(tenantId, { pool, lastUsedAt: Date.now() });
    return pool;
  }

  async query<T>(tenantId: string, sql: string, params: unknown[] = []): Promise<T[]> {
    const pool = await this.getPool(tenantId);
    if (!pool) return [];
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  }

  // Idle eviction: 60 min, runs from a hourly @Interval
  evictIdle() { /* close pools idle > 60min */ }
}
```

All call sites that today pass no tenant (because the env-var pool was global) must be updated to thread `tenantId` through.

### 5.2 New `ConnectorService`

`migration/connector.service.ts` — the orchestrator behind the UI.

| Method | Purpose |
|--------|---------|
| `getConnector(tenantId)` | Returns sanitized `ConnectorConfig` (no password) |
| `saveConnector(tenantId, input)` | Encrypts password, upserts `MigrationConfig`, invalidates Redis cache & pool, re-registers cron |
| `testConnection(tenantId, input)` | Opens a transient connection, runs `SELECT 1` then `SELECT COUNT(*)` on `candidate, client, joborder, jobsubmission`. Persists `gllueLastTestedAt + gllueTestStatus`. |
| `triggerSync(tenantId, trigger='MANUAL')` | Creates a `ConnectorRun`, runs all sync services in dependency order, writes final status + per-table summary |
| `setSchedule(tenantId, intervalMinutes, enabled)` | Updates `syncIntervalMinutes / syncEnabled`, re-registers the scheduler entry |
| `getSyncStatus(tenantId)` | Returns `MigrationSyncCursor[]` joined with row counts from `MigrationMapping` grouped by `targetModel` |
| `getRecentRuns(tenantId, limit)` | Last N `ConnectorRun` rows |

### 5.3 Dynamic scheduler

Replace static `@Cron('*/30 * * * *')` decorators on sync services with `SchedulerRegistry`-driven jobs:

```typescript
@Injectable()
export class ConnectorScheduler implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    const configs = await this.prisma.migrationConfig.findMany({
      where: { status: 'ACTIVE', syncEnabled: true, gllueHost: { not: null } },
    });
    for (const c of configs) this.register(c.tenantId, c.syncIntervalMinutes);
  }

  register(tenantId: string, minutes: number) {
    const name = `gllue-sync:${tenantId}`;
    if (this.registry.doesExist('cron', name)) this.registry.deleteCronJob(name);
    const job = new CronJob(`*/${minutes} * * * *`, () =>
      this.connectorService.triggerSync(tenantId, 'SCHEDULE'),
    );
    this.registry.addCronJob(name, job);
    job.start();
  }

  unregister(tenantId: string) {
    const name = `gllue-sync:${tenantId}`;
    if (this.registry.doesExist('cron', name)) this.registry.deleteCronJob(name);
  }
}
```

`ConnectorService.saveConnector` and `setSchedule` call `scheduler.register / unregister`.

### 5.4 GraphQL surface

`migration/connector.resolver.ts` exposes:

```graphql
type ConnectorConfig {
  host: String
  port: Int!
  database: String
  username: String
  syncIntervalMinutes: Int!
  syncEnabled: Boolean!
  status: MigrationStatus!
  readOnly: Boolean!
  lastTestedAt: DateTime
  testStatus: ConnectorTestStatus!
  cutoverDate: DateTime
}

type ConnectorTestResult {
  ok: Boolean!
  errorMessage: String
  rowCounts: [TableRowCount!]!   # candidate, client, joborder, jobsubmission
}

type TableRowCount { table: String!  count: Int! }

type SyncTableStatus {
  sourceTable: String!
  lastSyncAt: DateTime!
  errorCount: Int!
  lastError: String
  mappedRows: Int!
}

type Query {
  connectorConfig: ConnectorConfig
  syncStatus: [SyncTableStatus!]!
  connectorRuns(limit: Int = 20): [ConnectorRun!]!
}

type Mutation {
  saveConnector(input: SaveConnectorInput!): ConnectorConfig!
  testConnection(input: TestConnectionInput!): ConnectorTestResult!
  triggerSync: ConnectorRun!
  setSchedule(intervalMinutes: Int!, enabled: Boolean!): ConnectorConfig!
}

input SaveConnectorInput {
  host: String!
  port: Int!
  database: String!
  username: String!
  password: String   # null = keep existing
  syncIntervalMinutes: Int
}

input TestConnectionInput {
  host: String!
  port: Int!
  database: String!
  username: String!
  password: String!   # always required for explicit test
}
```

### 5.5 Permissions

- Add functional permission `connector:manage` (granted to `ADMIN` role by default).
- All `Mutation`/`Query` fields above are protected by `FunctionalPermissionGuard('connector:manage')`.
- `MigrationReadOnlyGuard` is **not** applied to these endpoints (connector itself must work in read-only mode).

---

## 6. Frontend Changes

### 6.1 Settings shell redesign

Current `settings/page.tsx` is a flat list with one entry (Two-Factor). Restructure to:

```
/settings                        → side nav with sections
  /settings/security             → MFA, password
  /settings/connectors           → list (just Gllue for now)
  /settings/connectors/gllue     → connector detail (tabbed: Connection / Schedule / Status)
```

Use a left-side nav (matches Refero design tokens in `docs/DESIGN.md`) — section list on the left, content panel on the right.

### 6.2 Connectors → Gllue detail view

Three sections, top-to-bottom:

**A. Connection**
- Inputs: host, port (default 3306), database, username, password (write-only, masked, `Replace` action)
- Buttons: `Test connection` (primary if untested), `Save`
- States:
  - **Untested** — empty card prompts the user to test
  - **Testing** — spinner, disabled save
  - **OK** — green dot, "Connection healthy. Found: 12,431 candidates · 287 clients · 1,902 jobs · 8,540 applications"
  - **Failed** — red banner with error message; `Save` disabled

**B. Schedule**
- Toggle: sync enabled (on/off)
- Dropdown: every 15 / 30 / 60 / 360 minutes
- Helper text: "Next run in 14 min" (computed from `lastSyncAt + interval`)
- `Run sync now` button → `triggerSync` mutation

**C. Status**
- Per-table cards (5 cards: identity, candidates, clients, jobs, applications):
  - Last synced (relative time)
  - Mapped rows (joined from `MigrationMapping` count by `targetModel`)
  - Error count + last error (collapsible)
- Recent runs table (last 20 from `connectorRuns` query) — collapsible "Show history"

### 6.3 Read-only mode banner (app shell)

Top of app shell when `MigrationConfig.readOnly = true`:

> ⓘ You're evaluating Cura on a read-only Gllue mirror. Edits are disabled — your Gllue stays the source of truth. [Learn more]

Implemented as a thin banner above `PageHeader` in `(app)/layout.tsx`, fed by a small `useReadOnlyMode()` hook that queries `connectorConfig.readOnly`. The banner is dismissible **per session** but re-appears on reload.

### 6.4 Permission gating

Hide the Connectors nav entry for users without `connector:manage`.

---

## 7. Implementation Phases

| Phase | Scope | Est. |
|-------|-------|------|
| **A. Backend foundation** | Prisma migration (add credential fields + `ConnectorRun`), `crypto.ts` helper, refactor `GllueClientService` to per-tenant pool, add `connector:manage` permission | 1 day |
| **B. Connector service + GraphQL** | `ConnectorService` (get/save/test), resolver, DTOs, permission guard | ½ day |
| **C. UI shell + Connection tab** | Settings nav restructure, `/settings/connectors/gllue` page, Connection section UI, Test/Save mutations | 1 day |
| **D. Dynamic scheduler + Schedule tab** | `ConnectorScheduler` with `SchedulerRegistry`, `setSchedule` mutation, Schedule UI | ½ day |
| **E. Run history + Status tab** | `triggerSync` wires up `ConnectorRun`, per-table summary, Status UI cards | ½ day |
| **F. Read-only banner + end-to-end verification** | App-shell banner, audit every mutation resolver to confirm `MigrationReadOnlyGuard` is applied, manual test against a local MySQL replica | ½ day |

**Total: ~4 days** of focused work.

---

## 8. Decisions & Trade-offs

### 8.1 Per-tenant credentials in DB vs. global env var

**Decision:** Encrypted credentials per tenant in `MigrationConfig`.

**Rationale:** Self-service evaluation by definition means the prospect configures their own DB — ops cannot ship a new env var per signup.

| Factor | Env var (today) | Per-tenant DB |
|--------|----------------|---------------|
| Multi-tenant support | ❌ | ✅ |
| Self-service signup | ❌ | ✅ |
| Credential lifecycle | manual restart | rotate via UI |
| Security bar | Ops-managed | App-managed → must encrypt + audit |

**Trade-off:** Higher security responsibility. Mitigated by envelope encryption (AES-256-GCM with `MIGRATION_CREDENTIAL_KEY`), masked password in API responses, and onboarding copy that **strongly recommends a Gllue user with `SELECT`-only grants**.

### 8.2 Dynamic scheduler via `SchedulerRegistry`

**Decision:** Register cron jobs at runtime per tenant.

**Alternative considered:** Keep static `@Cron()` decorators that iterate all tenants each tick. Rejected — couples all tenants to one interval, and you cannot expose a user-controlled schedule with a static decorator.

### 8.3 Test connection probes row counts, not just `SELECT 1`

**Decision:** Test runs `SELECT 1` + `SELECT COUNT(*)` on the four spine tables.

**Rationale:** Returning "we found 12,431 candidates" is the single highest-signal moment in the entire onboarding — it proves to the prospect that their data is visible to Cura before they commit any further effort.

**Trade-off:** 1–2 seconds slower than a bare auth check. Worth it.

### 8.4 Cutover stays admin-only

**Decision:** Connector UI does **not** expose a cutover button.

**Rationale:** Cutover flips `readOnly = false`. That's the moment Cura becomes the source of truth — it must follow a commercial agreement, not a UI click. Implemented today as `MigrationService.initiateCutover(tenantId, actorId)` callable by an Anthropic admin.

### 8.5 `ConnectorRun` history vs. just using `MigrationSyncCursor`

**Decision:** Add a `ConnectorRun` table.

**Rationale:** `MigrationSyncCursor` is a single-row state per table — it can answer "when was the last sync" but not "what happened in the last 20 runs." The UI's value comes from showing a trend (errors trending up, runs taking longer), which requires history.

**Trade-off:** Extra writes per sync. Small — one row per run, ~10s of bytes.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Storing third-party DB credentials | AES-256-GCM at-rest, separate `MIGRATION_CREDENTIAL_KEY`, masked in API, audit-logged on save |
| Hung connection during test | `connectTimeout: 5_000`, AbortController on the test query |
| Per-tenant pools accumulating | 60-min idle eviction, `connectionLimit: 3` per tenant |
| User schedules every 1 minute | Min interval validated to 15 min in `setSchedule` |
| Prospect grants a write-capable Gllue user by mistake | Onboarding copy strongly recommends `SELECT`-only grants; we never issue write SQL regardless |
| Static `@Cron()` decorators still in `sync/*.service.ts` would double-schedule | Audit + remove during Phase D |

---

## 10. Open Questions

- Should the Connection-tab preview also show last `dateAdded` per table ("data freshness: most recent candidate added 2 hours ago")? Likely yes — extra signal at zero extra cost.
- Should the read-only banner appear on every page or only data pages (Candidates / Clients / Jobs / Applications)? Recommend: every page, dismissible per session.
- Do we want to allow editing the connector while a sync is in-flight? Recommend: block save with "Sync in progress" until the current `ConnectorRun` finishes — keeps invariants simple.

---

## 11. Files Likely to Change

**Backend (`js/apps/api/`):**
- `prisma/schema.prisma` — extend `MigrationConfig`, add `ConnectorRun`, add enums
- `prisma/migrations/<new>/migration.sql` — generated
- `src/migration/crypto.ts` — new
- `src/migration/gllue-client.service.ts` — per-tenant pool
- `src/migration/connector.service.ts` — new
- `src/migration/connector.resolver.ts` — new
- `src/migration/connector.scheduler.ts` — new
- `src/migration/dto/*` — new GraphQL inputs/outputs
- `src/migration/migration.module.ts` — register new providers, remove `ScheduleModule.forRoot()` duplication concerns
- `src/migration/sync/*.service.ts` — drop `@Cron()` if present, accept `tenantId` parameter
- `src/permissions/*` — add `connector:manage` to catalog + ADMIN role default

**Frontend (`js/apps/web-app/`):**
- `src/app/(app)/settings/page.tsx` — restructure to side nav
- `src/app/(app)/settings/security/page.tsx` — move MFA link here
- `src/app/(app)/settings/connectors/page.tsx` — new
- `src/app/(app)/settings/connectors/gllue/page.tsx` — new
- `src/app/(app)/layout.tsx` — read-only banner mount point
- `src/components/read-only-banner.tsx` — new
- `src/lib/graphql/connector.ts` — Apollo queries/mutations

---

## 12. Acceptance Criteria

Done when:
1. An admin can navigate to `Settings → Connectors → Gllue`, enter credentials, click **Test**, see row counts, click **Save**.
2. Saving registers a cron at the chosen interval; the next tick runs `triggerSync` and creates a `ConnectorRun`.
3. The Status tab shows last-run summary and per-table mapped row counts that update after each sync.
4. While `readOnly = true`, every domain mutation (create candidate / update client / advance application stage / …) is rejected with `MIGRATION_READ_ONLY`.
5. The app-shell banner is visible on every page while `readOnly = true`.
6. Plaintext passwords never appear in the GraphQL response, server logs, or audit log payload.
7. `MigrationService.initiateCutover(tenantId, actorId)` still flips `readOnly` off and stops the scheduler entry — no regression to the existing cutover path.
