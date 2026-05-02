# Gllue ATS/CRM — Reverse-Engineered Architecture

## Context

The user wants a high-level architecture map of Gllue (a Chinese recruitment ATS/CRM SaaS) so they can reverse-engineer features into Cura. The 22 GB MySQL backup at `/Users/charleswong/Workspace/cura/202604281003.sql` was distilled into `sample.sql` (1.9 MB, 1,073 tables, schema + sample data). This document is the analytical deliverable — it identifies subsystems, the tables that compose them, the relationships between them, and the key conventions Gllue uses. It is intended as a reference, not an implementation plan.

Source of truth: `/Users/charleswong/Workspace/cura/sample.sql`

---

## Top-Level Architecture

Gllue is a multi-tenant ATS + CRM with **seven major subsystems** layered around three core domain entities (`candidate`, `client`, `joborder`). Almost every cross-cutting concern (permissions, audit, custom fields, workflow) is implemented as a **horizontal pattern repeated per entity** rather than as a generic abstraction.

```
                    ┌─────────────────────┐
                    │  Identity & Hierarchy│  baseuser → user → team/team2/team3 → BU
                    └──────────┬──────────┘
                               │
   ┌───────────────────────────┼───────────────────────────┐
   │                           │                           │
   ▼                           ▼                           ▼
┌─────────┐           ┌──────────────┐           ┌─────────────┐
│ client  │◄──────────┤  joborder    │──────────►│  candidate  │
│ (CRM)   │ contracts │  (vacancy)   │ pipeline  │  (talent)   │
└────┬────┘           └──────┬───────┘           └──────┬──────┘
     │                       │                          │
     │              ┌────────▼────────┐                 │
     │              │  jobsubmission  │◄────────────────┘
     │              │  (the spine)    │  candidate ↔ job
     │              └────────┬────────┘
     │                       │
     │                       ▼
     │              ┌─────────────────┐
     │              │ apply / cvsent /│  pipeline stages
     │              │ clientinterview │  (each its own table)
     │              │ /offersign/     │
     │              │ onboard         │
     │              └─────────────────┘
     │
     │   Cross-cutting (applied PER entity):
     ├── *privilege + *uniqueprivilege          (row-level access)
     ├── *browsehistory + *changerecord         (audit)
     ├── workflow_id → workflowinsdata          (state machine)
     ├── gllueext_* columns                     (custom fields)
     └── is_deleted, addedBy_id, lastUpdateBy_id, dateAdded, lastUpdateDate

Acquisition layer (feeds candidates/jobsubmissions):
   channel → pt_position / pt_siteresume          (job-board scraping)
           → portal* / glluemeuser                (own portal)
           → minipositionapply / appletuser*      (WeChat mini-program)
           → maimaicandidate / jobordersyncmaimai (Maimai social)
           → aijobsubmission                      (AI suggestion)
```

---

## 1. Identity & Hierarchy

| Table | Role |
|---|---|
| `baseuser` | Login record (email, password, mobile, openid). 1:1 with `user`. |
| `user` | Recruiter profile (operational data, team links, accessgroup). |
| `profile` | Role/userType bundle (admin, recruiter, …). |
| `team` / `team2` / `team3` | 3-level recruiter team hierarchy (each `parent_id` self-referential). |
| `businessunit` | Top-level org unit (BU). |
| `glluelegalentity` | Legal entity / office (for billing, contracts). |
| `accessgroup` | Function-level role group (controls which actions user can perform). |
| `dataaccessgroup` | Data-scope filter (which rows user can see — by team/BU). |
| `glluemeuser` | **External** identity for candidate-facing portal users (separate from `user`). |
| `title` | Job title taxonomy. |

**Key pattern:** Recruiters (`user`) and candidates/portal-users (`glluemeuser`) are two separate identity tables, both pointing to `baseuser` for credentials. `user.bu_id`, `team_id`, `team2_id`, `team3_id`, `leader_id` give a 4-tier hierarchy that drives data access.

---

## 2. Candidate Domain

| Table | Role |
|---|---|
| `candidate` | Master record. `type` field distinguishes `'candidate'` from `'clientcontact'` (HR contacts at clients are stored here too). |
| `candidateeducation`, `candidateexperience`, `candidatelanguage`, `candidateaward`, `candidatecompetence`, `candidateproject`, `candidatefamily` | Resume sections (one row per item, FK to candidate). |
| `candidatetag`, `candidate_auto_tag`, `candidate_auto_tag_rule` | Manual + AI-inferred tagging. |
| `candidateowner` | **Multi-owner join table** — (candidate_id, user_id|team_id, type='owner'\|'co_owner'). |
| `candidateprotect`, `candidateprotecthistory`, `candidateprotectfixlog` | **Exclusivity** — recruiter "claims" a candidate for a window (effective_date → expiration_date), blocking others. |
| `candidateshare`, `candidatesharerequest` | Read-only grants between users/teams. |
| `candidatelockhistory`, `candidatelocktasklog`, `candidate.is_locked`, `lock_user_id` | Per-action lock (e.g., during contact); separate `js_*` lock fields for per-jobsubmission lock. |
| `candidateprivilege` / `candidateuniqueprivilege` | Row-level access (see §8 Patterns). |
| `candidate_view_history`, `candidatebrowsehistory` | Read-audit (who viewed which candidate when). |

**Key insight:** Gllue has *four overlapping* candidate-access mechanisms — ownership (who owns), protection (exclusivity window), share (one-way grant), and privilege (deduped final ACL). Reverse-engineering only one will miss the model.

---

## 3. Client Domain

| Table | Role |
|---|---|
| `client` | Employer master (`bd_id` = BD recruiter, `parent_id` for parent/child company hierarchy). |
| `clientcontact` | Maps `client_id` → `candidate.id` of HR contacts (note: contacts ARE candidates with `type='clientcontact'`). |
| `clientdepartment` | Self-referential dept tree per client. |
| `clientcontract`, `clientcontractcharge`, `clientcontractprivilege`, `clientcontractuniqueprivilege` | Contract terms, fee structure, payment, with their own permission tables. |
| `clientbilling` | Invoice info (taxpayerID, bankAccount). |
| `client_hunter_relation`, `client_hunter_company_relation` | Maps client to commission-based "hunter" recruiters. |
| `client_interview_pending*`, `client_interview_reservation*` | Scheduled / pending interviews. |
| `clientbdchangerecord` | Audit of BD ownership changes. |
| `clientalbum`, `clientalias` | Photos and alternate names. |
| Rollup fields on `client`: `job_count`, `live_job_count`, `cooperation_duration_years`, `client_level` | Denormalized counters maintained by triggers. |

---

## 4. Job & Pipeline (the spine)

The pipeline is **stage-per-table**, not state-on-one-row:

```
joborder → jobsubmission → apply
                         → cvsent
                         → clientinterview
                         → offersign
                         → onboard
```

| Table | Role |
|---|---|
| `joborder` | Vacancy. `workflow_spec_id` binds it to a workflow definition. Rollup counters: `apply_count`, `jobsubmission_count`, `cvsent_count`, `longlist_count`, `clientinterview_count`, `offersign_count`, `onboard_count`. |
| `joborderuser` | Per-job role assignment (owner / recruiter / interviewer + revenue split). |
| `joborderteam`, `jobordertag`, `joborderpreferaitag` | Team / tags / AI-preferred tags. |
| `jobsubmission` | **Pipeline spine** — one row per (candidate, joborder). Every channel writes here. `max_status` caches highest stage reached; `ai_match_score` / `jd_match_score` are AI relevance scores. |
| `jobsubmissionduprelation` | Marks duplicates of the same candidate across submissions. |
| `apply` | Status-transition log on a jobsubmission (think "events"). `feedback_id`, `note_id`, `workflowstatushistory_id`. |
| `cvsent` + `cvsentfeedback` | Each CV-to-employer event. |
| `clientinterview` + `clientinterviewfeedback` | Each interview round. |
| `offersign` + `onboard` | Final stages. |
| `*privilege` / `*uniqueprivilege` for each | Per-stage access control. |

**Key insight:** The pipeline isn't `state` on `jobsubmission`; it's a chain of stage tables that share `jobsubmission_id`. The `workflow_id` + `workflowstatushistory` on `jobsubmission` are the abstract state machine; the per-stage tables are the "domain events" with feedback attached.

---

## 5. Workflow & Approval Engine

| Table | Role |
|---|---|
| `workflowdefinition` | State-machine spec (longtext JSON/XML), reusable. |
| `workflowinsdata` | Workflow **instance** attached to an object (jobsubmission, joborder, client). |
| `workflowstatushistory` | Every transition logged. |
| `actionmeta` / `actiondetail` / `actiondetaildefault` / `actiondetailnew` | Configurable UI actions per `accessgroup` × `model`. |
| `actionurlmeta` | Maps action → URL route (so frontend menus and backend endpoints stay in sync). |
| `addmenudetail`, `addrelatedmodel` | Menu items, related-object panels per scene. |
| `appscenesetting`, `appscenemodelpersistgql` | UI scenes + per-scene GraphQL queries (multi-language: en_US/zh_CN/zh_TW/fr). |
| `approvalflow`, `approvalprocessdefinition`, `approvalprocessmodelsetting`, `approvalsent`, `approvalsentfeedback`, `approvalpendingtask` | Pluggable multi-step approvals on any model. Auto-approve/reject, cc-on-notice, condition='all'/'any'. |

**Key insight:** Gllue clearly built a **declarative app platform** — workflows, actions, menus, GraphQL queries are all data-driven, per-scene, per-locale. Tenants can customize without code.

---

## 6. Permissions Model

Two parallel tables exist for *every* permissioned entity (`candidate`, `joborder`, `jobsubmission`, `cvsent`, `clientcontract`, `attachment`, `approvalflow`, …):

- **`*privilege`** — full audit trail of every grant. Columns: `relatedto_id`, `owner` (`'user'`|`'role'`), `source`, `sourceDetail`, `accessLevel`, `downstream`, `config_id`. Unique key on `(sourceDetail, relatedto_id, owner, source)` so each grant *path* is one row.
- **`*uniqueprivilege`** — deduped final state for fast permission checks. Columns: `relatedto_id`, `owner`, `access_level`. Unique key on `(relatedto_id, owner, access_level)`.

**Other ACL pieces:**
- `accessconfiguration` + `accessconfigmetadata` — row-level rules (longtext config, MD5-deduped).
- `accessrevsharedependence` — transitive closure for cascading access (e.g., share a job ⇒ share its submissions).
- `accesstokensharerule` + `accesstokenresource` — shareable tokens (granting external folks scoped access).
- `accesstriggerhanlderlog` — audit of permission-system triggers.

---

## 7. Acquisition Layer (where candidates come from)

| Channel type | Tables |
|---|---|
| **External job boards** (Liepin, BOSS, …) | `channel` (catalog), `pt_position` (synced postings), `pt_siteresume` (raw resumes), `xmlimportlog`, `candidateimportlog` |
| **Own portal** (career site) | `portalposition`, `portalapply`, `portalresume`, `me_custompage` |
| **Hub / GllueMe** (candidate-facing app) | `glluemeuser`, `candidateglluemeuser`, `hub_*`, `me_*` columns on jobsubmission. Hub appears to be Gllue's centralized application-management product layered above all channels. |
| **WeChat mini-program** | `minipositionapply`, `minipositionresume`, `appletuseractivity`, `appletusertocandidate`, `appletuserwillingness` |
| **Campus / careertalk events** | `campusrecruitment`, `careertalk`, `careertalkjoborder`, `careertalkuser` |
| **Maimai** (China LinkedIn) | `maimaicandidate`, `maimaicandidateexperience`, `maimaicandidatesearch`, `jobordersyncmaimai`, `maimaiappcandidate`, `maimaiassignment` |
| **AI matching** | `aijobsubmission`, `aijobsubmissionfeedback`, `aiparamsuggestion`, `aischool`, `joborderpreferaitag`, `resumefilterrule`, `expressionrulegroup` |
| **Email integration** | `webemailaccount`, `channelemail`, `joborder.forward_mailboxs` |
| **Calls / attendance** | `calllog`, `attendrecord`, `attendrecordqrcode` |
| **Background check / testing** | `backgroundinvestigation*`, `test`, `writtentest`, `candidateevalutionassign*` |
| **Anti-fraud / hunter protection** | `browseridallowlist`, `browseridapplylog`, `browseridapprovedlist`, `portalapply.hunter_protect_reject`. Likely device fingerprinting to prevent recruiters from gaming candidate referrals. |

All channels eventually write to **`jobsubmission`** as the single point of truth. Channel-specific IDs (`hub_id`, `me_id`, `portalapply_id`, `jobordersyncmaimai_id`, `mini_position_apply_id`, `siteresume_id`) are kept on `jobsubmission` for back-references.

---

## 8. Cross-Cutting Patterns

These conventions repeat across nearly every entity:

| Pattern | What it looks like | Why it matters when reverse-engineering |
|---|---|---|
| **Soft delete** | `is_deleted tinyint(1)` | Never assume DELETE; expect filter on every query. |
| **Audit columns** | `addedBy_id`, `lastUpdateBy_id`, `dateAdded`, `lastUpdateDate` | Standard quartet on every domain table. |
| **Trigger-driven audit** | `dbtriggerlog` (operation, external_type/id, old_value, new_value) | DB triggers log all DMLs centrally. |
| **Browse vs change history** | `*browsehistory` (reads), `*changerecord` (writes) | Two separate audit streams. |
| **Custom fields** | `gllueext_text_*`, `gllueext_select_*`, `gllueext_fk_*`, `gllueext_currency_*`, `gllueext_date_*` columns; `gllueextensions` registry | Tenant-defined fields stored as wide columns rather than EAV. The numeric suffix (e.g., `gllueext_text_1660722096566`) is a Unix-ms timestamp = field creation time. |
| **Dropped columns** | `__dropped_<uuid>_<oldname>`, `del_<timestamp>_<oldname>` | Renames/removes are tombstoned, not actually dropped. |
| **`_id` vs `_aid`** | `_id` = internal PK FK; `_aid` = "alternate ID" / external system ID (Maimai, Hunter, AI school DB) | Useful for integration mapping. |
| **Rollup counters** | `joborder.apply_count`, `client.job_count`, etc. | Denormalized for read perf; trigger-maintained. |
| **`max_status`** | `jobsubmission.max_status`, `joborder.maxStatus` | Highest pipeline stage reached, cached for quick filtering. |
| **Workflow on every entity** | `workflow_id` / `workflow_spec_id` / `_approval_status` columns | Almost every domain object can be wrapped in workflow + approval. |
| **i18n in metadata** | `appscenesetting` has `en_US`, `zh_CN`, `zh_TW`, `fr` columns | Translations live in the schema, not external files. |

---

---

## 9. Deep Dive — Identity & Permissions (the model Cura should learn from)

### 9.1 The two-identity split

Gllue cleanly separates **authentication** from **operational identity**:

| Layer | Table | Rows hold |
|---|---|---|
| Authentication | `baseuser` | email/mobile/openid, password hash, `auth_mode` (bitmask: 32 = email/password; other bits for OpenID/LDAP), `token`, `public_key`, `default_password` (system-set, distinct from user-chosen), `mobile_verified`, `hub_id` (multi-tenancy partner ID), `profile_id` |
| Recruiter operational | `user` | team bindings (`bu_id`, `team_id`, `team2_id`, `team3_id`, `leader_id`, `office_id`), `accessgroup_id`, `dataaccessgroup_id`, lifecycle (`firstLogin`, `loginable`, `passwordLastChangeDate`, `lastInactiveDate`, `lastLeaveDate`), preferences (`default_scene`, `lang`) |
| Candidate-side | `glluemeuser` | optional `baseuser_id` (so candidates can self-serve), reward fields (`total_reward`, `on_the_way_reward`, `redeemable_reward`, `referral_code`), `email_verify`, `mobile_verify` |

**Unique key shapes worth copying:**
- `baseuser`: separate UNIQUE on `email`, `openid`, `hub_id`, `mobile` — any of the four can identify a user.
- `user`: UNIQUE on `email` and UNIQUE on `baseuser_id` (1:1 link).
- Composite KEY on `(status, team_id, isleader)` — optimized for "find active team leaders" queries that drive approval routing.

**Cura takeaway:** Keep two tables. Clerk gives us the auth layer; we still need a `User` model that owns team/role/access bindings. Don't put rewards or candidate-portal state on the same row as recruiter state.

### 9.2 Team hierarchy — three parallel trees, not nested levels

`team`, `team2`, `team3` look like a 3-level hierarchy. They're **three independent self-referential trees**. A recruiter belongs to *one node in each tree*, enabling matrix orgs (Sales × APAC × Healthcare). `businessunit` is administratively separate (top-level org, not a team).

**Cura takeaway:** Don't ship three tables. A single `Team` model with `parentId` and a typed `kind` field (`'business' | 'region' | 'practice'`) gives the same matrix flexibility without 3× the code. Use Clerk Organizations as the tenant boundary; teams live below that.

### 9.3 The dual ACL pattern: `*privilege` + `*uniqueprivilege`

Gllue applies the **same two-table pattern to every permissioned entity** (`candidate`, `joborder`, `jobsubmission`, `cvsent`, `clientcontract`, `attachment`, `approvalflow`):

**`<entity>privilege`** — full audit trail. Columns:
```
id, owner ('user'|'role'), source (user_id or role_id), sourceDetail (denormalized name),
accessLevel (0=None, 1=View, 2=Edit, 3=Owner), relatedto_id (the entity id),
downstream (CSV of inherited user IDs), config_id → accessconfiguration
UNIQUE KEY (sourceDetail, relatedto_id, owner, source)
KEY (relatedto_id, owner, accessLevel)
```

**`<entity>uniqueprivilege`** — denormalized cache. Columns:
```
id, owner, access_level, relatedto_id, created_at, updated_at
UNIQUE KEY (relatedto_id, owner, access_level)
KEY (owner, relatedto_id)
```

**Why two tables:** `*privilege` answers *"how did this user get access"* (audit); `*uniqueprivilege` answers *"can this user view this row"* in O(1). When a grant is upgraded from View→Edit, both rows update; when revoked, the cache row is deleted while the audit row keeps history.

**The `downstream` CSV is a mistake.** It stores comma-separated child user IDs as a varchar(1000). When team membership changes, every grant must be string-edited.

### 9.4 Two access-control axes (UI vs. data)

| Axis | Table | Question it answers |
|---|---|---|
| UI / functional | `accessgroup` ← `actiondetail` → `actionmeta` | "Can this user click the Export button on JobOrder?" |
| Data / row-level | `dataaccessgroup` + `*uniqueprivilege` + `accessconfiguration` | "Can this user *see* JobOrder #456?" |

Concrete trace: User clicks "Export Job Order #456":
1. Lookup `actionmeta` where `(model_name='JobOrder', name='Export')` → `actionmeta_id=42`.
2. `EXISTS (SELECT 1 FROM actiondetail WHERE accessgroup_id = user.accessgroup_id AND actionmeta_id=42)` → button visible.
3. `SELECT access_level FROM joborderuniqueprivilege WHERE owner='user' AND relatedto_id=456 AND <user matches>` → `>=1` to read, `>=2` to export.

`accessrevsharedependence` declares cascade rules ("share JobSubmission ⇒ also share Candidate + JobOrder"), evaluated transitively.

`accesstokensharerule` + `accesstokenresource` issue **scoped, expirable share tokens** for unauthenticated viewers (e.g., a candidate viewing their submission via a magic link). `accesstokensharerule.expireTime` is seconds-to-live, default 86400.

### 9.5 What Gllue's identity layer is missing

| Gap | Table that should exist but doesn't | Why it matters |
|---|---|---|
| Session lifecycle | `session(token_hash, user_id, ip, user_agent, expires_at, revoked_at)` | Cannot enforce "log out everywhere" or concurrent-session caps. |
| MFA devices | `mfa_device(user_id, type, secret_encrypted, backup_codes, verified_at)` | `baseuser.mobile_verified` is one bit; no TOTP / WebAuthn. |
| SSO provider config | `sso_provider(name, type, client_id, client_secret_encrypted, attribute_mapping)` | Adding a new provider means a code change. |
| Scoped API keys | `api_key(user_id, name, token_hash, scopes JSON, ip_whitelist, expires_at, last_used_at)` | All API access is currently all-or-nothing per user. |
| Comprehensive audit log | `audit_log(actor_id, actor_type, resource_type, resource_id, action, old_value, new_value, ip, ts)` | `dbtriggerlog` exists but has 63M rows of raw row diffs and no consumer; not queryable for "who changed candidate #X". |
| Permission inheritance graph | `permission_inheritance(parent_grant_id, child_grantee_id)` | Replaces the `downstream` CSV; queryable both directions. |
| Delegation | `delegation(grantor_id, grantee_id, scope, expires_at)` | Cannot model "John out for 2 weeks, his approvals go to Jane." |
| Password policy per tenant | `password_policy(scope, min_length, complexity_rules, history_size, max_age_days)` | Currently hardcoded. |

### 9.6 What Cura should build (concrete schema)

A single, polymorphic permission table replaces the 14+ `*privilege` / `*uniqueprivilege` pairs:

```prisma
model Permission {
  id            String      @id @default(ulid())
  granteeType   GranteeType                    // USER | TEAM | ROLE
  granteeId     String
  resourceType  String                          // 'Candidate' | 'JobOrder' | 'JobSubmission' | ...
  resourceId    String
  accessLevel   AccessLevel                     // VIEW | EDIT | OWNER
  grantSource   GrantSource                     // DIRECT | INHERITED | RULE | APPROVAL
  expiresAt     DateTime?
  createdAt     DateTime    @default(now())
  createdById   String

  @@unique([granteeType, granteeId, resourceType, resourceId])
  @@index([resourceType, resourceId])
  @@index([granteeId, accessLevel])
}
```

Pair it with a separate `PermissionGrant` audit table that *appends* every change (so deleting a Permission row keeps history). Inheritance becomes explicit rows in a `PermissionInheritance(parentId, childId)` graph rather than a CSV.

For UI permissions, keep Clerk-style role-permission strings (`'candidate:export'`, `'job:approve'`) on a `Role` model and map roles → users via `UserRole`. Don't replicate `actiondetail`/`actionmeta` — it's over-modelled for our scale.

Add `Session`, `MfaDevice`, `ApiKey`, `AuditLog` from day one. They cost little to build now and are painful to retrofit.

---

## 10. Reporting — Gllue's clearest weakness, Cura's clearest opportunity

### 10.1 Inventory of Gllue's "reporting" tables

| Table | What it actually is | Verdict |
|---|---|---|
| `aggregationreportcache` | SQL string → cached result longtext, keyed by `sql_hash`. No TTL, no invalidation strategy. | Brute-force query cache. Stale by default. |
| `dashboarddata` (~12.6K rows) | One row per `(data_name, dateAdded_str)` daily metric. | Daily snapshot model. Manual refresh. |
| `dashboard` (~550 rows) | UI layout definitions per module. `user_id = -99` means "org-wide". | Static layouts, not personalized dashboards. |
| `analyticsmetasetting` (~46 rows) | Saves component config blobs by uuid. `meta_info` is longtext. | Stores UI state, not actual analytics. |
| `kpireportitem` | **KPIs are stored as raw SQL templates** in `sql_format`, run on demand. | The smoking gun. No pre-aggregation. |
| `customreportview` (~13.6K rows) | One saved filter view per `(user_id, model_name, name)`. | Filter favorites only — not multi-table dashboards, not shareable. |
| `forecast` | One row per joborder: `forecast_fee`, `close_date`, `close_rate`. Updates overwrite old values. | No forecast history, no ML, manual entry. |
| 100 × `_agstmp<hex>` tables | Schemas are `(_c0 int, t1_id int, t2_id int, t3_id int)`. Spark/Hive/Presto temp-output naming convention. Empty in the dump. | Orphaned artifacts of an external analytics system that's been disconnected. |

### 10.2 The denormalized counter trap

Counts cached on parent rows (`joborder.apply_count`, `cvsent_count`, `jobsubmission_count`, `longlist_count`, `clientinterview_count`, `offersign_count`, `onboard_count`, `reject_count`, `headcount_left_offer`, `headcount_left_onboard`; `client.job_count`, `live_job_count`) are maintained by triggers/batch jobs.

Three problems:
1. **No history** — yesterday's count is overwritten. "How many submissions did this job have on day 1 vs day 7?" is unanswerable.
2. **Silent drift** — if a trigger fails, the count is wrong forever and no one knows.
3. **Couples reporting to OLTP** — every dashboard query hits the production database.

### 10.3 The CDC log that nobody listens to

`dbtriggerlog` is genuinely well-designed: `(operation, external_type, external_id, old_value JSON, new_value JSON, request_id [Jaeger trace ID], sql_id, dateAdded)`, ~63M rows. **It's a complete change-data-capture stream.** But there is no consumer — no Kafka, no Airflow DAG, no dbt model, no warehouse loader. The events accumulate, get queried for ad-hoc audits, and that's it.

This is exactly the kind of asset Cura should *use*, not duplicate.

### 10.4 What Gllue is missing (and why recruiters complain)

- **No fact/dimension model.** Every query joins live OLTP tables. BI tools that try to connect get crippled.
- **No time-series rollups.** No `joborder_daily`, no `recruiter_productivity_daily`, no `funnel_daily`. Trend questions require ad-hoc SQL.
- **No funnel / cohort / attribution tables.** Cannot ask "which channel produced hires that stayed > 6 months?"
- **No real-time event stream** for in-product alerts ("offer pending > 14 days", "no submissions in 7 days").
- **No saveable, shareable dashboards.** `customreportview` saves a filter; you can't save a multi-chart dashboard and send it to your team.
- **KPIs are SQL strings.** Performance is unknowable; permissioning the KPI is impossible at the data layer.

### 10.5 Cura's reporting blueprint

The high-leverage move is to build the warehouse layer Gllue never built. Do it event-first:

**Layer 1 — Event normalization (read-side mirror of OLTP)**
```prisma
model Event {
  id           BigInt   @id @default(autoincrement())
  type         String   // 'job.created' | 'submission.applied' | 'interview.scheduled' | 'offer.signed' | 'onboard.completed' | 'recruiter.contact'
  entityType   String
  entityId     String
  aggregateId  String?  // e.g. jobOrderId for fast slicing
  actorId      String?  // recruiter who did it
  properties   Json
  occurredAt   DateTime
  createdAt    DateTime @default(now())

  @@index([type, occurredAt])
  @@index([aggregateId, occurredAt])
  @@index([actorId, occurredAt])
}
```
Populate by emitting from app code on writes (or by tailing Postgres logical replication later). Don't replicate Gllue's `dbtriggerlog` — emit *typed business events*, not raw row diffs.

**Layer 2 — Fact + dimension tables** (rebuild nightly from Event):
- `FactPipelineStage` — one row per (candidate, job, stage) with timestamps and durations.
- `DimRecruiter`, `DimJob`, `DimClient`, `DimCandidate` — denormalized for fast filter.

**Layer 3 — Pre-aggregated daily snapshots** (the ones recruiters actually look at):
```
HiringFunnelDaily (snapshot_date, job_id, recruiter_id, stage, count)
RecruiterProductivityDaily (snapshot_date, recruiter_id, jobs_open, submissions_in, submissions_forwarded, interviews, offers, hires, time_to_hire_avg_days)
SourceEffectivenessDaily (snapshot_date, source, applications, interviews, hires, hires_retained_90d)
ClientRevenueMonthly (month, client_id, jobs_open, placements, expected_revenue, actual_revenue)
```

**Layer 4 — In-product analytics surface:**
- A `Dashboard` model that stores actual chart specs (metric + dimensions + filters + chart type), not just UI layouts. Sharable across teams.
- Saved views with permission-aware filters (recruiters see only their own data unless explicitly shared).
- Built-in alerts on the snapshot tables: "no submissions in 7 days", "offer outstanding > 14 days", "time-to-hire trending up week-over-week".

**Layer 5 — Refresh pipeline:**
- Hourly: tail Event → upsert facts.
- Nightly: rebuild daily snapshots; bump cache versions.
- SLA: snapshots <4 hours behind reality. Real-time alerts hit the Event stream directly.

### 10.6 The narrative for go-to-market

Gllue users complain about reporting. The reasons are *structural*, not bugs they can fix:
1. There's no warehouse, so every dashboard fights with OLTP.
2. Counters drift, so trust in numbers erodes.
3. KPIs are SQL strings, so dashboards can't be permissioned or pre-computed.
4. `dbtriggerlog` is a goldmine they never mined.

Cura, built event-first with a proper warehouse and pre-aggregated snapshots, will be able to answer questions Gllue users have given up asking: *"What's my time-to-hire trend by source over the last 6 months, filtered to senior engineering roles, broken down by my team?"* Today on Gllue that's a multi-hour SQL exercise; on Cura it should be a saved view that loads in 200ms.

---

## Reverse-engineering implications for Cura

Patterns Cura should *adopt* (proven for ATS scale):
- **`jobsubmission`-style spine table** for candidate↔job, with stage tables (apply, cvsent, interview, offer, onboard) hanging off it. Avoid putting pipeline state as enum-on-one-row.
- **Dual ACL tables** (`*privilege` for audit, `*uniqueprivilege` for fast checks) if multi-recruiter sharing matters.
- **Soft-delete + audit-quartet** as a default per Prisma model.
- **Rollup counters** on parent rows (`apply_count` etc.) maintained by code/triggers to avoid COUNT() at read time.

Patterns Cura should *avoid* (anti-patterns from this codebase):
- **`gllueext_text_<timestamp>` wide columns** — Cura already plans for typed JSON or a proper EAV. Do not replicate.
- **`__dropped_<uuid>_*` tombstoned columns** — Use migrations cleanly; don't keep dead columns.
- **`type` discriminator collapsing distinct entities** (candidates and clientcontacts in one table) — Cura keeps `Candidate` and `ClientContact` as distinct models in Prisma.
- **`team` / `team2` / `team3` separate tables** — use a single self-referential table with `level` or `parentId`.
- **973 tables, four overlapping access mechanisms** — Cura should pick *one* per concern.

Tables NOT yet mapped (skip unless needed):
- 100 × `_agstmp*` (legacy Hadoop-era aggregation temp tables — ignore).
- Specialized integration tables (`hub_*`, `wechatcard`, regional taxonomy `maimaicity`/`maimaifunction`) — only relevant if Cura targets those channels.

---

## Verification

This is an analysis document — there is nothing to "run." To validate any specific claim:

1. Open `/Users/charleswong/Workspace/cura/sample.sql`.
2. `grep "^CREATE TABLE \`<tablename>\`" sample.sql` to find a table.
3. `awk '/^CREATE TABLE \`<tablename>\` \(\$/,/^\) ENGINE=/' sample.sql` to read its DDL.
4. `grep "REFERENCES \`<tablename>\`" sample.sql` to find inbound FKs (which other tables reference this one).

If you want a deeper dive into any one subsystem (e.g., the workflow engine's state-machine syntax, or the AI matching scoring formula), say which one and I'll extract the relevant DDL + sample shape.
