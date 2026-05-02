# Authentication & Authorization Technical Design

> **Scope.** This document is the deep-dive companion to `docs/crm-technical-plan.md §2.1` and `§3.4`. It specifies the full design for Cura's first-party authn/authz layer: login flows, token lifecycle, team structure, functional (action-level) permissions, row-level permissions, team-based permission inheritance, the resolution algorithm, and the NestJS wiring. The schema excerpts here are authoritative; the CRM plan references this file.
>
> **Key Gllue learnings applied.** Gllue runs two parallel ACL axes (UI/functional via `accessgroup` + row-level via `*privilege/*uniqueprivilege`) and three parallel team trees (`team`, `team2`, `team3`). Cura collapses both anti-patterns: one `Permission` table replaces 14+ privilege pairs, and one self-referential `Team` with `kind` replaces the trio. See `docs/gllue_anaylsis/gllue-research.md §9` for the full analysis.

---

## 1. Identity Split: AuthIdentity ↔ User

Two tables, two concerns — adopted from Gllue's `baseuser` ↔ `user` split.

```
AuthIdentity          User
────────────          ────────────────────────────
email / mobile        tenantId   ← tenant binding
passwordHash          teamIds    ← team membership
OIDC subject          roleIds    ← functional roles
MFA devices           ownerUserId, preferences
lockout state         loginable, firstLogin, lastInactiveAt
```

One `AuthIdentity` can map to many `User` rows (one per tenant). A recruiter who belongs to two firms has one set of credentials but two independent operational profiles with separate roles, teams, and permissions.

**Why the split matters:**
- Credential rotation (password change, MFA re-enrol) touches `AuthIdentity` only — no cascade to any tenant's permission structure.
- A future candidate-portal user (`glluemeuser` equivalent) can share an `AuthIdentity` without polluting recruiter rows.
- "Log out everywhere" revokes `Session` rows; lockout sets `AuthIdentity.lockedUntil` — neither touches `User`.

---

## 2. Authentication Flows

### 2.1 Login (email + password)

```
Client                           NestJS AuthService
──────                           ──────────────────
POST /auth/login
  { email, password, tenantSlug? }
                    ──────────────►  1. Lookup AuthIdentity by email
                                     2. Check lockedUntil — 429 if locked
                                     3. Argon2id.verify(passwordHash, password)
                                        └─ FAIL → increment failedLoginCount
                                               → lock if >= 5 consecutive fails
                                     4. If mfaEnrolled → return { mfaRequired: true, mfaChallengeToken }
                                     5. Resolve User for tenantSlug (or default tenant)
                                        └─ No User for tenant → 403 "Not a member"
                                     6. Check loginable, deletedAt
                                     7. Create Session row (refreshTokenHash, ip, ua, expiresAt=+90d)
                                     8. Sign JWT access token (15 min)
  ◄──────────────────  { accessToken, refreshToken, user: { id, displayName, tenantId } }
```

### 2.2 MFA Challenge (TOTP)

```
POST /auth/mfa/verify
  { mfaChallengeToken, totpCode }
  → Verify TOTP against MfaDevice.secretEncrypted (AES-256-GCM, key from env)
  → On success: invalidate challenge token, proceed to step 7 above
  → On fail: increment challenge attempt count; lock challenge after 3 fails
```

Backup codes are single-use. Each is stored as `argon2id(code)` in `MfaDevice.backupCodesHashed`. On use, the matching hash is deleted.

### 2.3 Token Refresh

```
POST /auth/refresh
  { refreshToken }
  → Hash token → lookup Session by refreshTokenHash
  → Check: expiresAt > now, revokedAt IS NULL, ip/ua fingerprint (warn on mismatch)
  → Rotate: generate new refreshToken, update Session.refreshTokenHash + lastUsedAt
  → Issue new accessToken (15 min)
  → Return { accessToken, refreshToken }
```

Rotation is **atomic** — old refresh token is invalid the moment a new one is issued. Presenting a revoked refresh token triggers "refresh token reuse" detection: all sessions for that user are revoked.

### 2.4 Logout

```
POST /auth/logout            → revoke current Session (set revokedAt = now)
POST /auth/logout-all        → revoke all Sessions for userId
```

### 2.5 Password Reset

```
POST /auth/password-reset/request  { email }
  → Rate-limited (3 req/hr per email)
  → Generate one-time token (ULID + 32-byte random suffix)
  → Store hash in PasswordResetToken(tokenHash, authIdentityId, expiresAt=+1h, usedAt)
  → Email magic link

POST /auth/password-reset/confirm  { token, newPassword }
  → Verify token, check expiresAt, check usedAt IS NULL
  → Validate against PasswordPolicy (length, complexity, history)
  → Argon2id.hash(newPassword) → update AuthIdentity.passwordHash
  → Store old hash in PasswordHistory (capped at policy.historySize)
  → Mark token usedAt, revoke all Sessions (force re-login)
```

### 2.6 JWT Access Token

#### Field selection

A claim belongs in the JWT only if it is needed on **every request** and changes infrequently enough to embed safely (staleness forces a version-triggered refresh rather than a per-request DB check).

| Field | Type | Why embed | Staleness trigger |
|-------|------|-----------|-------------------|
| `sub` | ULID string | userId — direct DB/Redis key | — immutable |
| `tid` | ULID string | tenantId — Prisma `forTenant()` scope | — immutable per session |
| `sid` | ULID string | sessionId — Redis `session:{sid}` liveness check | — immutable per session |
| `ver` | int | user state version — must match Redis `user_ver:{sub}` | `INCR` on any embedded-field change |
| `teams` | `{id:int, r:"L"\|"M"}[]` | team memberships + role — needed for `can()` grantee resolution | team add/remove → ver bump |
| `roles` | `string[]` | role names — keys the DB-ETag permission lookup | role assign/remove → ver bump |
| `iat`, `exp` | int | standard JWT timing | — |

**`sub`, `tid`, `sid` keep full ULIDs** — they are used as-is as Redis keys (`user_ver:{sub}`, `session:{sid}`) and Prisma tenant scopes. Any shortening would require an extra resolution step on the hot path.

**`teams` uses `shortId` (auto-increment int)** — teams are resolved to ULIDs by `JwtAuthGuard` via an in-process permanent cache before the principal is built. `{id:7, r:"L"}` ≈ 14 chars vs `{"id":"01HX...","role":"LEAD"}` ≈ 32 chars; 5 teams saves ~90 chars.

**`roles` keeps name strings** — role names (`"recruiter"`, `"admin"`) are already short, unique per tenant, and human-readable. Using a shortId here would save negligible space at the cost of debuggability.

**Not embedded:** `permissions` (too many strings, too dynamic — DB-ETag cache), `loginable`/`deletedAt` (enforced at refresh time when ver bump triggers JWT_STALE), `email`, `displayName`.

#### Payload

```jsonc
// Header
{ "alg": "HS512", "typ": "JWT" }

// Payload — 8 fields, ~200 chars for a typical user (5 teams, 2 roles)
{
  "sub":   "01HV...",           // userId (ULID)
  "tid":   "01HU...",           // tenantId (ULID)
  "sid":   "01HW...",           // sessionId (ULID)
  "ver":   12,                  // user state version
  "teams": [                    // shortId (int) + abbreviated role
    { "id": 7,  "r": "L" },     // L = LEAD
    { "id": 12, "r": "M" }      // M = MEMBER
  ],
  "roles": ["recruiter"],       // role names (tenant-scoped)
  "iat":   1714000000,
  "exp":   1714000900           // +15 min
}
```

`teams` and `roles` are embedded so the guard never hits DB to resolve them per request. Any change to these fields increments `user_ver` in Redis — the next request receives `JWT_STALE` and the client uses its refresh token to obtain a new JWT with current embedded state (see §10).

---

## 3. Team Structure

### 3.1 Model

A single self-referential `Team` with `kind` replaces Gllue's `team` / `team2` / `team3` trio. The three Gllue trees modelled a matrix org (Sales × Region × Practice). `kind` preserves that without tripling the schema.

```prisma
enum TeamKind {
  BUSINESS   // sales team, practice group, desk
  REGION     // APAC, EMEA, Americas
  PRACTICE   // Healthcare, Technology, Finance
  OTHER
}

model Team {
  id        String    @id @default(ulid())
  shortId   Int       @unique @default(autoincrement()) // compact JWT encoding
  tenantId  String
  parentId  String?
  parent    Team?     @relation("TeamHierarchy", fields: [parentId], references: [id])
  children  Team[]    @relation("TeamHierarchy")
  name      String
  kind      TeamKind
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  members   TeamMember[]
  @@index([tenantId, kind])
}

model TeamMember {
  teamId   String
  userId   String
  role     TeamRole  // MEMBER | LEAD
  joinedAt DateTime  @default(now())
  team     Team      @relation(fields: [teamId])
  user     User      @relation(fields: [userId])
  @@id([teamId, userId])
}
```

### 3.2 Matrix Org Example

```
BUSINESS tree         REGION tree          PRACTICE tree
─────────────         ───────────          ─────────────
Firm                  Global               All Practices
└── London Desk       ├── APAC             ├── Healthcare
    └── BD Team       └── EMEA             └── Technology
```

Recruiter Alice belongs to: `London Desk (BUSINESS)` + `APAC (REGION)` + `Healthcare (PRACTICE)`.

All three team IDs go into `TeamMember`. When resolving Alice's row-level access, all three team IDs are queried against `Permission.granteeId`.

### 3.3 Team Leads vs Members

`TeamMember.role`:
- `LEAD` — team manager. Gets LEAD-level permissions when a team grant is resolved (see §5.3).
- `MEMBER` — standard member. Gets MEMBER-level permissions.

Leads can also be set as approvers in approval flows without a separate model.

---

## 4. Functional Permissions (Action-Level)

This is Cura's equivalent of Gllue's `accessgroup → actiondetail/actionmeta` axis — *"can this user perform this action?"* — but modelled as simple permission strings on roles, not a data-driven action registry.

### 4.1 Permission String Format

```
{resource}:{action}
```

| Resource | Actions |
|----------|---------|
| `candidate` | `create`, `view_all`, `edit_any`, `delete`, `export`, `view_salary`, `lock`, `import` |
| `job` | `create`, `view_all`, `edit_any`, `delete`, `approve`, `close`, `assign_recruiter` |
| `client` | `create`, `view_all`, `edit_any`, `delete`, `manage_bd`, `view_contract` |
| `application` | `manage`, `forward`, `reject`, `request_interview`, `create_offer` |
| `offer` | `create`, `approve`, `view_amount` |
| `report` | `view`, `export`, `manage_dashboards` |
| `team` | `manage`, `invite_member`, `remove_member` |
| `user` | `invite`, `deactivate`, `manage_roles` |
| `settings` | `manage_tenant`, `manage_password_policy`, `manage_api_keys` |
| `admin` | `impersonate`, `audit_log_view` |

### 4.2 Built-in Roles

```prisma
model Role {
  id          String   @id @default(ulid())
  shortId     Int      @unique @default(autoincrement()) // reserved for JWT embedding if needed
  tenantId    String?                   // null = system-wide built-in
  name        String
  description String?
  permissions Json                      // string[]
  builtin     Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([tenantId, name])
}
```

| Role | Permission Set |
|------|----------------|
| `admin` | All permissions (`*:*`) |
| `senior_recruiter` | `candidate:*`, `job:*`, `client:*`, `application:*`, `offer:create`, `offer:view_amount`, `report:view`, `report:export`, `team:invite_member` |
| `recruiter` | `candidate:create`, `candidate:view_all`¹, `candidate:export`, `job:create`, `job:view_all`¹, `client:view_all`¹, `application:manage`, `offer:create`, `report:view` |
| `viewer` | `candidate:view_all`¹, `job:view_all`¹, `client:view_all`¹, `report:view` |

¹ `view_all` grants the functional right to list records, but **data scope** (§5.1) still limits which rows are returned. A `recruiter` with `candidate:view_all` only sees candidates within their data scope — not the entire tenant.

Tenants can define custom roles by creating `Role` rows with `tenantId` set. Built-in roles (`tenantId = null`) cannot be modified.

### 4.3 UserRole Assignment

```prisma
model UserRole {
  userId       String
  roleId       String
  assignedAt   DateTime @default(now())
  assignedById String
  user         User     @relation(fields: [userId])
  role         Role     @relation(fields: [roleId])
  @@id([userId, roleId])
}
```

A user can hold multiple roles. Permissions are the **union** of all their roles' permission sets.

### 4.4 Functional Permission Resolution

```typescript
// Called once per request; result cached in req.user
async function resolveFunctionalPermissions(userId: string): Promise<Set<string>> {
  const userRoles = await roleService.getRolesForUser(userId);  // cached 5 min
  const perms = new Set<string>();
  for (const role of userRoles) {
    for (const p of role.permissions as string[]) {
      if (p === '*:*') return ALL_PERMISSIONS;  // admin short-circuit
      perms.add(p);
    }
  }
  return perms;
}
```

### 4.5 NestJS Guard: FunctionalPermissionGuard

```typescript
@Injectable()
export class FunctionalPermissionGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.get<string>('permission', ctx.getHandler());
    if (!required) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return user.permissions.has(required);  // hydrated by JwtAuthGuard
  }
}

// Usage on resolver
@Mutation()
@RequirePermission('candidate:export')
async exportCandidates(...) {}
```

---

## 5. Row-Level Permissions

This answers *"can this user see/edit this specific record?"* — Gllue's `*privilege/*uniqueprivilege` axis, collapsed into one `Permission` table.

### 5.1 Data Scope (Default Visibility)

Data scope is the **default filter applied to list queries** before per-record Permission checks. It avoids the need to create a `Permission` row for every single record a user is allowed to see.

```prisma
enum DataScopeType {
  ALL          // see every record in the tenant (admin)
  TEAM_TREE    // see records owned by my teams + all descendant teams
  MY_TEAMS     // see records owned by my direct teams only (no descendants)
  MINE         // see only records where ownerUserId = me
  EXPLICIT     // see only records with an explicit Permission grant (no owner-based default)
}

model RoleDataScope {
  roleId         String
  resourceType   String        // 'Candidate' | 'Job' | 'Client' | ...
  dataScope      DataScopeType
  role           Role          @relation(fields: [roleId])
  @@id([roleId, resourceType])
}
```

| Role | Candidate scope | Job scope | Client scope |
|------|-----------------|-----------|--------------|
| `admin` | ALL | ALL | ALL |
| `senior_recruiter` | TEAM_TREE | TEAM_TREE | TEAM_TREE |
| `recruiter` | MY_TEAMS | MY_TEAMS | MINE |
| `viewer` | MY_TEAMS | MY_TEAMS | MY_TEAMS |

**How list queries use data scope:**

```typescript
// CandidateService.findAll(user)
async findAll(user: RequestUser): Promise<Candidate[]> {
  const scope = await this.permissionService.getDataScope(user, 'Candidate');
  const db = this.prisma.forTenant(user.tenantId);

  // 1. Build owner-based filter from scope
  const scopeFilter = buildScopeFilter(scope, user);  // e.g. { ownerUserId: { in: teamMemberIds } }

  // 2. Fetch records matching scope OR having explicit Permission grant for user
  return db.candidate.findMany({
    where: {
      deletedAt: null,
      OR: [
        scopeFilter,
        { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, 'Candidate') } },
      ],
    },
  });
}
```

### 5.2 Per-Record Permission Model

```prisma
enum GranteeType  { USER  TEAM  ROLE }
enum AccessLevel  { VIEW  EDIT  OWNER }
enum GrantSource  { DIRECT  INHERITED  RULE  APPROVAL }
enum GrantAction  { GRANT  UPGRADE  DOWNGRADE  REVOKE }

model Permission {
  id           String      @id @default(ulid())
  tenantId     String
  granteeType  GranteeType
  granteeId    String
  resourceType String      // 'Candidate' | 'Job' | 'JobApplication' | 'Client' | ...
  resourceId   String
  accessLevel  AccessLevel
  grantSource  GrantSource
  expiresAt    DateTime?
  createdAt    DateTime    @default(now())
  createdById  String

  @@unique([tenantId, granteeType, granteeId, resourceType, resourceId])
  @@index([tenantId, resourceType, resourceId])   // hot-path: "who can access record X?"
  @@index([granteeId, tenantId, resourceType])    // "what can grantee see?"
}

// Append-only audit — never delete from here
model PermissionGrant {
  id           String       @id @default(ulid())
  permissionId String?                             // null after revoke
  tenantId     String
  granteeType  GranteeType
  granteeId    String
  resourceType String
  resourceId   String
  action       GrantAction
  fromLevel    AccessLevel?
  toLevel      AccessLevel?
  reason       String?
  actorId      String
  occurredAt   DateTime     @default(now())

  @@index([resourceType, resourceId, occurredAt])
  @@index([granteeId, occurredAt])
}
```

### 5.3 Permission Resolution Algorithm

Called by `permissionService.can(user, resourceType, resourceId, minLevel)`.

```
INPUT:  user.id, user.teamIds[], user.roleIds[], resourceType, resourceId, minLevel

STEP 1 — Collect grantee IDs
  grantees = [
    { type: USER, id: user.id },
    ...user.teamIds.map(id => ({ type: TEAM, id })),
    ...user.roleIds.map(id => ({ type: ROLE, id })),
  ]

STEP 2 — Direct lookup
  SELECT MAX(accessLevel) as maxLevel
  FROM Permission
  WHERE tenantId = user.tenantId
    AND resourceType = ?
    AND resourceId   = ?
    AND (granteeType, granteeId) IN (grantees)
    AND (expiresAt IS NULL OR expiresAt > NOW())

  → If resolved maxLevel >= minLevel: ALLOW (cache result)

STEP 3 — Team-role adjustment
  For TEAM grants:
    If user is LEAD of that team: use granted level as-is
    If user is MEMBER:            use min(granted level, EDIT)
      (OWNER grants to a team give MEMBERs EDIT, LEADs OWNER)

STEP 4 — Cascade rules
  If still DENY:
    Check PermissionCascadeRule where fromResourceType = resourceType
    For each rule:
      parentLevel = can(user, rule.toResourceType, parentId(resource), rule.minAccessLevel)
      If parentLevel >= rule.minAccessLevel → grant VIEW on this resource

STEP 5 — Cache & return
  Cache result per (userId, resourceType, resourceId) for request lifetime (LRU, request-scoped)
  DENY if no grant found
```

**TEAM grant → member access table:**

| Grant level on team | LEAD effective level | MEMBER effective level |
|---------------------|----------------------|------------------------|
| VIEW | VIEW | VIEW |
| EDIT | EDIT | EDIT |
| OWNER | OWNER | EDIT |

### 5.4 Cascade Rules

```prisma
model PermissionCascadeRule {
  id               String      @id @default(ulid())
  fromResourceType String      // if user has access to this...
  toResourceType   String      // ...auto-grant access to this
  minAccessLevel   AccessLevel // minimum level on 'from' to trigger cascade
  grantLevel       AccessLevel // level granted on 'to'
  @@unique([fromResourceType, toResourceType])
}
```

Built-in cascade rules (seeded at migration):

| From | To | Min level on From | Grants on To |
|------|----|-------------------|--------------|
| `JobApplication` | `Candidate` | VIEW | VIEW |
| `JobApplication` | `Job` | VIEW | VIEW |
| `Offer` | `JobApplication` | VIEW | VIEW |
| `Interview` | `JobApplication` | VIEW | VIEW |
| `Client` | `Job` | OWNER | EDIT |

Example: if a recruiter has VIEW on a `JobApplication`, they automatically get VIEW on the related `Candidate` and `Job` — even without explicit Permission rows for those.

### 5.5 System Rules (Auto-Grant on Record Creation)

These fire in service-layer code when records are created or assigned. They write `Permission` rows with `grantSource: RULE`.

| Trigger | Auto-grant |
|---------|------------|
| `Candidate` created | `OWNER` to `createdById` (USER grant) |
| `Candidate` created | `VIEW` to user's direct teams (TEAM grant) |
| `Job` created | `OWNER` to `createdById` |
| `Job` created | `EDIT` to `ownerUserId` if different from creator |
| `Job` created | `VIEW` to `clientId` BD owner |
| `JobApplication` created | `EDIT` to `ownerUserId` |
| `Client` created | `OWNER` to `bdUserId` |
| `User` assigned as `ownerUserId` on any resource | `EDIT` grant for that user |

All auto-grants write a corresponding `PermissionGrant` row (`action: GRANT, grantSource: RULE`) for auditability.

---

## 6. Team-Based Permission Groups

A "permission group" in Cura is a `Permission` row where `granteeType = TEAM`. Granting access to a team automatically covers all current (and future) members of that team.

### 6.1 Why Team Grants Beat Per-User Grants

Gllue's `*privilege.downstream` is a CSV of user IDs that must be string-edited on every team membership change — a known weakness (see gllue-research.md §9.3). Cura's team grants avoid this entirely: when Alice joins Team T, she gains all permissions that Team T holds, with no migration of existing grant rows.

```
Team T has Permission: VIEW on Candidate C

Alice joins Team T as MEMBER → Alice can VIEW Candidate C immediately
Bob joins Team T as LEAD   → Bob can VIEW Candidate C with LEAD-level resolution
Carol leaves Team T        → Carol loses VIEW on Candidate C immediately
```

### 6.2 Sharing Workflows

**Recruiter-to-recruiter share:**
```
permissionService.grant({
  tenantId,
  granteeType: USER,
  granteeId: targetUserId,
  resourceType: 'Candidate',
  resourceId: candidateId,
  accessLevel: VIEW,
  grantSource: DIRECT,
  createdById: actorId,
});
// Writes Permission row + PermissionGrant audit row
```

**Team-level share:**
```
permissionService.grant({
  granteeType: TEAM,
  granteeId: teamId,
  ...
});
// All team members gain access; no per-user rows
```

**Share with expiry (e.g., temporary access for interview panel):**
```
permissionService.grant({
  granteeType: USER,
  granteeId: interviewerId,
  resourceType: 'Candidate',
  expiresAt: addDays(now(), 7),
  accessLevel: VIEW,
  grantSource: APPROVAL,  // triggered by interview scheduling
});
```

### 6.3 Magic-Link / Share Tokens

For sharing a candidate profile with an external hiring manager (no Cura account):

```prisma
model ShareToken {
  id           String      @id @default(ulid())
  tenantId     String
  tokenHash    String      @unique
  resourceType String
  resourceId   String
  accessLevel  AccessLevel
  expiresAt    DateTime
  createdById  String
  createdAt    DateTime    @default(now())
  revokedAt    DateTime?
}
```

Share tokens bypass JWT auth. `ShareTokenGuard` validates the token and resolves a synthetic "anonymous principal" scoped to the resource. Access is logged to `AuditLog`.

---

## 7. Permission Inheritance Graph

Replaces Gllue's `downstream` CSV and `accessrevsharedependence` table. Explicit rows in a queryable graph.

```prisma
model PermissionInheritance {
  parentPermissionId String
  childGranteeType   GranteeType
  childGranteeId     String
  @@id([parentPermissionId, childGranteeType, childGranteeId])
}
```

When a team has a Permission and membership changes, no graph update is needed — the team ID stays. `PermissionInheritance` is used for **approval-triggered propagation**: "approving this job order grants the approval panel VIEW access to all its submissions." The approval service writes the inheritance rows; revoking the approval deletes them.

---

## 8. Audit Log

Single source of truth for all authn/authz events. Replaces Gllue's `dbtriggerlog` (63M rows of raw SQL diffs, no consumer) with typed business events.

```prisma
model AuditLog {
  id           String   @id @default(ulid())
  tenantId     String?
  actorId      String?                          // null for system events
  actorType    String   @default("USER")        // USER | SYSTEM | API_KEY
  resourceType String
  resourceId   String
  action       String   // 'authn.login' | 'authn.mfa_enrolled' | 'permission.granted' | 'candidate.exported' | ...
  oldValue     Json?
  newValue     Json?
  ip           String?
  userAgent    String?
  occurredAt   DateTime @default(now())

  @@index([tenantId, resourceType, resourceId])
  @@index([tenantId, actorId, occurredAt])
  @@index([occurredAt])
}
```

**Tracked authn events:** `authn.login_success`, `authn.login_fail`, `authn.locked`, `authn.mfa_enrolled`, `authn.mfa_verified`, `authn.password_changed`, `authn.session_revoked`, `authn.token_reuse_detected`

**Tracked authz events:** `permission.granted`, `permission.revoked`, `permission.upgraded`, `permission.downgraded`, `permission.cascade_triggered`, `permission.share_token_created`, `permission.share_token_revoked`

**Tracked data events:** `candidate.exported`, `candidate.viewed` (sampled), `candidate.salary_viewed`, `offer.viewed`

---

## 9. NestJS Implementation

### 9.1 Module Layout

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts         ← login, register, refresh, logout
│   ├── session.service.ts      ← session lifecycle, rotation, revocation
│   ├── mfa.service.ts          ← TOTP enrol, verify, backup codes
│   ├── password.service.ts     ← Argon2id, policy validation, history
│   ├── guards/
│   │   ├── jwt-auth.guard.ts   ← APP_GUARD: validates JWT, hydrates req.user
│   │   ├── functional-permission.guard.ts
│   │   └── share-token.guard.ts
│   └── decorators/
│       ├── public.decorator.ts        ← @Public()
│       ├── current-user.decorator.ts  ← @CurrentUser()
│       └── require-permission.decorator.ts  ← @RequirePermission('candidate:export')
├── permissions/
│   ├── permission.module.ts
│   ├── permission.service.ts   ← can(), grant(), revoke(), getDataScope()
│   ├── permission-cache.service.ts  ← request-scoped LRU
│   └── permission.resolver.ts  ← GraphQL mutations for grant/revoke
└── teams/
    ├── team.module.ts
    ├── team.service.ts
    └── team.resolver.ts
```

### 9.2 Request Principal

```typescript
interface RequestUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  version: number;                               // JWT ver — for audit / debug
  teams: Array<{ id: string; role: TeamRole }>; // ULIDs, resolved from JWT shortIds
  roles: string[];                               // role names from JWT
  permissions: Set<string>;                      // hydrated via DB-ETag cache
}

// Derived helpers (computed inline, not stored)
// teamIds:  user.teams.map(t => t.id)
// leadIds:  user.teams.filter(t => t.role === 'LEAD').map(t => t.id)
```

`JwtAuthGuard` (registered as `APP_GUARD`) runs on every request:
1. Verify JWT signature + expiry (no I/O).
2. Redis `GET user_ver:{sub}` — version check in one round-trip.
3. Resolve `JWT.teams[].id` (shortIds) → ULIDs via in-process permanent `Map<number, string>`. The mapping is sourced from the `Team` table (`shortId` + `id` columns), loaded lazily on first miss via `SELECT id, short_id FROM teams WHERE short_id = ANY($1)`, and never evicted (shortId → ULID is immutable). At CRM scale (10,000 teams × ~130 bytes per entry) the map is ≈1.3 MB — negligible.
4. Hydrate `permissions` from DB-ETag cache (see §9.6 and §10).

### 9.3 Guard Stack Per Resolver

```
Request
  → JwtAuthGuard (global, APP_GUARD)        ← authn + principal hydration
      → FunctionalPermissionGuard (per-resolver, @RequirePermission)  ← action gating
          → resolver executes
              → PermissionService.can(...)   ← row-level check (inline, per-entity)
```

### 9.4 Tenant Scoping

The Prisma extension (`PrismaService.forTenant(tenantId)`) injects `tenantId` into every query automatically. `JwtAuthGuard` extracts `tenantId` from the JWT — no DB round-trip on the hot path.

```typescript
// @Query(() => ReturnType) — NestJS code-first GraphQL decorator.
// Marks the method as a GraphQL query field and declares the return type for
// schema generation (TypeScript generics are erased at runtime; Apollo needs it).
@Resolver(() => Candidate)
export class CandidateResolver {
  @Query(() => [Candidate])
  @RequirePermission('candidate:view_all')
  async candidates(@CurrentUser() user: RequestUser) {
    return this.candidateService.findAll(user);
  }

  @Query(() => Candidate)
  async candidate(@Args('id') id: string, @CurrentUser() user: RequestUser) {
    const candidate = await this.candidateService.findOne(id, user.tenantId);
    await this.permissionService.assertCan(user, 'Candidate', id, AccessLevel.VIEW);
    return candidate;
  }

  @Mutation(() => Candidate)
  @RequirePermission('candidate:export')
  async exportCandidates(@CurrentUser() user: RequestUser, ...) {
    // functional guard already ran; row-level check happens per-record inside service
  }
}
```

**Team-scope enforcement in `findAll`.** Each role carries a `DataScopeType` per resource type (§5.1). `CandidateService.findAll` converts that scope into a WHERE clause:

```typescript
// CandidateService.findAll
async findAll(user: RequestUser): Promise<Candidate[]> {
  const db      = this.prisma.forTenant(user.tenantId);
  const teamIds = user.teams.map(t => t.id);           // from JWT claims
  const scope   = await this.permissionService.getDataScope(user, 'Candidate');

  let ownerFilter: Prisma.CandidateWhereInput;
  switch (scope) {
    case DataScopeType.ALL:
      ownerFilter = {};
      break;
    case DataScopeType.TEAM_TREE: {
      const allTeamIds = await this.teamService.expandTeamTree(teamIds); // recursive CTE
      const memberIds  = await this.teamService.getMemberIds(allTeamIds);
      ownerFilter = { ownerUserId: { in: memberIds } };
      break;
    }
    case DataScopeType.MY_TEAMS: {
      // getMemberIds: SELECT user_id FROM team_members WHERE team_id = ANY($1)
      const memberIds = await this.teamService.getMemberIds(teamIds);
      ownerFilter = { ownerUserId: { in: memberIds } };
      break;
    }
    case DataScopeType.MINE:
      ownerFilter = { ownerUserId: user.userId };
      break;
    default:                      // EXPLICIT — only records with a Permission row
      ownerFilter = { id: { in: [] } };
  }

  // Always union in records explicitly shared with this user outside their normal scope
  const grantedIds = await this.permissionService.getExplicitlyGrantedIds(user, 'Candidate');

  return db.candidate.findMany({
    where: { deletedAt: null, OR: [ownerFilter, { id: { in: grantedIds } }] },
  });
}
```

**Concrete trace — "London recruiter, MY_TEAMS scope":**

```sql
-- Step 1: getMemberIds(['london-team-ulid'])
SELECT user_id FROM team_members WHERE team_id = ANY(ARRAY['london-team-ulid'])
-- → ['alice-id', 'bob-id', 'charlie-id']

-- Step 2: the Prisma findMany resolves to:
SELECT * FROM candidates
WHERE  tenant_id  = 'T_ACME'
  AND  deleted_at IS NULL
  AND (owner_user_id IN ('alice-id', 'bob-id', 'charlie-id')
       OR id IN ('explicitly-shared-candidate-id'))
```

A recruiter on the London team only sees candidates owned by other London team members, plus any records explicitly shared with them via a `Permission` row.


### 9.5 PermissionService Core Methods

```typescript
class PermissionService {
  // Row-level check — single record
  async can(user: RequestUser, resourceType: string, resourceId: string, minLevel: AccessLevel): Promise<boolean>

  // Throws ForbiddenException if denied
  async assertCan(user: RequestUser, resourceType: string, resourceId: string, minLevel: AccessLevel): Promise<void>

  // Returns effective level for a record (null = no access)
  async effectiveLevel(user: RequestUser, resourceType: string, resourceId: string): Promise<AccessLevel | null>

  // Returns IDs of records with explicit Permission grants (for list-query OR clause)
  async getExplicitlyGrantedIds(user: RequestUser, resourceType: string): Promise<string[]>

  // Data scope for list filtering
  async getDataScope(user: RequestUser, resourceType: string): Promise<DataScopeType>

  // Grant / revoke (writes Permission + PermissionGrant audit)
  async grant(input: GrantInput): Promise<Permission>
  async revoke(permissionId: string, actorId: string, reason?: string): Promise<void>
  async adjustLevel(permissionId: string, newLevel: AccessLevel, actorId: string): Promise<void>
}
```

### 9.6 Caching Strategy

**Redis (shared across all NestJS instances):**

| Key pattern | Type | Value | Written when |
|-------------|------|-------|--------------|
| `user_ver:{userId}` | INT | Atomic counter | `INCR` on **any** auth state change (team, role, logout, deactivation, password change, …) |

One key type only. No per-session keys; no permission-timestamp keys. The DB `Session` table is the source of truth for whether a refresh is permitted.

**In-process per NestJS instance:**

| Cache | Key | Entry shape | Eviction |
|-------|-----|-------------|----------|
| `shortId → ULID` (teams) | `shortId: int` | `ulid: string` | Permanent (mapping is immutable) |
| Functional permissions | `userId` | `{ perms: Set<string>, etag: string }` | ETag mismatch vs `MAX(GREATEST(UserRole.assignedAt, Role.updatedAt))` |
| `can()` per record | `(userId, resourceType, resourceId)` | `AccessLevel \| null` | Request-scoped LRU |

The shortId cache is loaded on demand and never evicted — `shortId → ULID` is immutable once a team is created. The permission cache has no TTL; it is valid until its stored ETag diverges from the DB's current `MAX` timestamp. The `can()` cache is **request-scoped** by design — a record created mid-request auto-grants owner access before the response returns, so cross-request caching would race against that grant.

---

## 10. JWT Validation and State Invalidation

### 10.1 Design Overview

Two independent mechanisms handle the gap between JWT issuance and reality:

| Mechanism | What it guards | How |
|-----------|---------------|-----|
| **Redis version counter** | JWT-embedded fields (`teams`, `roles`, user status) | `INCR user_ver:{userId}` on change; guard compares JWT `ver` vs Redis; mismatch → `JWT_STALE` → client refreshes |
| **DB-ETag permission cache** | Functional permission strings (role → permission expansion) | `SELECT MAX(GREATEST(UserRole.assignedAt, Role.updatedAt))` before cache hit; ETag mismatch → full DB fetch |

Row-level permission checks (`Permission` table) are already request-scoped — always fresh, no caching across requests.

---

### 10.2 Redis Key Schema

One key type only. No per-session keys needed — the DB `Session` table handles revocation state; Redis only signals "did anything change?"

```
user_ver:{userId}    INT    Atomic counter. INCR on ANY auth state change:
                            logout, role/team change, deactivation, password change, etc.
                            JWT.ver mismatch → JWT_STALE → client uses refresh token.
                            Refresh succeeds or fails based on DB Session.revokedAt /
                            User.loginable state — Redis is the signal, DB is the gate.
```

**Why no `session:{sid}` key?** JWT `exp` handles natural expiry (no I/O). Forced early invalidation (logout, deactivation) is handled by `INCR user_ver`, which stales the JWT and triggers a refresh. The refresh path checks `Session.revokedAt` and `User.loginable` in the DB — if either blocks, the client is forced to re-login. No per-session Redis state is needed because Redis holds one counter per user, not one flag per session.

---

### 10.3 JwtAuthGuard: Two Checks, One Redis Round-Trip

```
1. Crypto verify (no I/O)
   → HS512 signature + exp
   → Extract { sub, tid, sid, ver, teams, roles }

2. Redis GET user_ver:{sub}  — 1 round-trip
   → missing OR != JWT.ver  →  throw JwtStaleException { code: 'JWT_STALE' }

3. Resolve JWT teams[].id (shortIds) → ULIDs via in-process permanent cache
   → cache miss: SELECT id, short_id FROM teams WHERE short_id = ANY($1)

4. Build RequestUser from JWT claims + resolved ULIDs — zero further I/O

5. Hydrate functional permissions via DB-ETag cache
   → SELECT MAX(GREATEST(ur.assigned_at, r.updated_at)) AS etag
     FROM user_roles ur JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ?
   → ETag matches in-process cache → return cached Set<string>
   → ETag differs → full fetch → update cache
```

Total I/O on the happy path: **1 Redis GET + 1 DB `SELECT MAX`**. When the ETag matches (the common case), no further DB queries for auth on that request.

---

### 10.4 JWT_STALE Client Flow

`JWT_STALE` means the token is cryptographically valid but the embedded state is outdated. The client uses its refresh token to get a new JWT, then retries transparently. **`JWT_STALE` is also the mechanism that enforces logout and deactivation** — the refresh path is where the DB gate fires.

```
Client receives  401 { code: 'JWT_STALE' }
→ POST /auth/refresh { refreshToken }
    Server:
      1. Look up Session by refreshTokenHash
         → Session.revokedAt IS NOT NULL → 401 "Session revoked" → client must re-login
         → Session.expiresAt < now       → 401 "Session expired"  → client must re-login
      2. Check User.loginable AND !deletedAt
         → loginable = false or deletedAt set → 401 "Account inactive" → client must re-login
      3. GET Redis user_ver:{userId}      ← current version number
      4. SELECT TeamMember rows           ← latest team memberships
      5. SELECT UserRole rows             ← latest roles
      6. Issue new JWT: latest ver, teams[], roles[]
      7. Rotate refresh token
→ Client retries original request with new access token
```

**Logout flow (single session):**
```
POST /auth/logout
  DB:    Session.revokedAt = now        ← blocks future refresh for this session
  Redis: INCR user_ver:{userId}         ← stales current JWT immediately

User's next request → JWT_STALE → client refreshes → Session.revokedAt → 401 → re-login
Other concurrent sessions on other devices → also get JWT_STALE → their refresh succeeds
(their Sessions are still valid) → new JWT issued with updated ver ✓
```

**Deactivation flow:**
```
Admin deactivates user:
  DB:    User.loginable = false; Session.revokedAt = now (all sessions)
  Redis: INCR user_ver:{userId}

User's next request → JWT_STALE → client refreshes → Session.revokedAt + loginable=false → 401
```

---

### 10.5 DB-ETag Permission Cache

Functional permissions (role names → permission string set):

```typescript
async getFunctionalPermissions(userId: string): Promise<Set<string>> {
  // Lightweight check — one indexed query, returns a single timestamp
  const [{ etag }] = await db.$queryRaw<[{ etag: string | null }]>`
    SELECT MAX(GREATEST(ur.assigned_at, r.updated_at))::text AS etag
    FROM   user_roles ur
    JOIN   roles r ON ur.role_id = r.id
    WHERE  ur.user_id = ${userId}
  `;

  const cached = this.permCache.get(userId);
  if (cached && cached.etag === (etag ?? '')) return cached.perms;

  // ETag changed (or cold start) — full fetch
  const rows = await db.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const perms = new Set(rows.flatMap(ur => ur.role.permissions as string[]));
  this.permCache.set(userId, { perms, etag: etag ?? '' });
  return perms;
}
```

The `SELECT MAX(GREATEST(...))` hits indexes on `user_roles.user_id` and `roles.id` — both are required anyway for the full fetch. Full fetch only runs when something actually changed.

**Row-level permissions** — request-scoped `can()` cache is unchanged. For future cross-request row-level caching (Phase 2+), use `MAX(Permission.createdAt) WHERE granteeId IN (userId, ...teamIds)` as the ETag.

---

### 10.6 Mutation → Redis + DB Writes

Every mutation that changes auth state **must** write to DB first, then `INCR user_ver`. Redis is the signal; DB is the gate (refresh checks Session + User state).

| Event | Redis | DB |
|-------|-------|----|
| Login | `SET user_ver:{userId} 0 NX` (seed if absent) | `Session` insert |
| Token refresh (successful) | — | `Session` rotate refresh token hash |
| Logout (single session) | `INCR user_ver:{userId}` | `Session.revokedAt = now` |
| Logout-all | `INCR user_ver:{userId}` | `Session.revokedAt = now` for all |
| Team membership add/remove | `INCR user_ver:{userId}` | `TeamMember` write |
| Role assigned/removed | `INCR user_ver:{userId}` | `UserRole` write |
| `Role.permissions` updated | `INCR user_ver:{u}` for all holders¹ | `Role.updatedAt` bumped |
| User deactivated | `INCR user_ver:{userId}` | `User.loginable=false`; `Session.revokedAt` all |
| User deleted | `INCR user_ver:{userId}` | `User.deletedAt`; `Session.revokedAt` all |
| Password changed | `INCR user_ver:{userId}` | `Session.revokedAt` all; `passwordHash` |
| Refresh token reuse detected | `INCR user_ver:{userId}` | `Session.revokedAt` all |
| Permission granted/revoked | — | `Permission` write |

¹ `SELECT userId FROM UserRole WHERE roleId = ?` — cheap at CRM scale.

---

### 10.8 JwtAuthGuard Implementation

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly teamCache: TeamShortIdCache,   // in-process permanent Map
    private readonly permCache: PermissionCacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = GqlExecutionContext.create(ctx).getContext().req;

    if (this.reflector.getAllAndOverride<boolean>('isPublic', [ctx.getHandler(), ctx.getClass()])) {
      return true;
    }

    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException('Missing token');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Single Redis GET: version check
    const redisVer = await this.redis.get(`user_ver:${payload.sub}`);
    if (redisVer === null || Number(redisVer) !== payload.ver) {
      throw new JwtStaleException(); // client uses refresh token → refresh checks DB Session
    }

    // Resolve team shortIds → ULIDs (in-process permanent cache)
    const teams = await this.teamCache.resolve(payload.teams);

    // Hydrate functional permissions (DB-ETag cache)
    const permissions = await this.permCache.getFunctionalPermissions(payload.sub);

    req.user = {
      userId:    payload.sub,
      tenantId:  payload.tid,
      sessionId: payload.sid,
      version:   payload.ver,
      teams,                  // [{ id: ULID, role: 'LEAD'|'MEMBER' }]
      roles:     payload.roles,
      permissions,
    } satisfies RequestUser;

    return true;
  }
}
```

---

## 11. Permission Check: Concrete End-to-End Example

> For the invalidation flow that precedes this, see §10.

**Scenario:** Alice (recruiter, in Team TM1 as LEAD and Team TM2 as MEMBER) queries `candidate(id: "C1")`.

```
1. JwtAuthGuard
   → crypto verify — JWT contains:
       sub="U_ALICE", tid="T_ACME", sid="S1", ver=5,
       teams=[{id:7,r:"L"},{id:12,r:"M"}], roles=["recruiter"]
   → Redis GET user_ver:U_ALICE → 5
       5 == JWT.ver ✓
   → resolve shortIds 7→"TM1", 12→"TM2" (in-process cache hit)
   → DB-ETag check: MAX(GREATEST(assignedAt, updatedAt)) for Alice's roles
       ETag matches in-process cache → permissions = Set{"candidate:view_all", "job:create", ...}
   → req.user = {
       userId: "U_ALICE", tenantId: "T_ACME", sessionId: "S1", version: 5,
       teams: [{id:"TM1",role:"LEAD"},{id:"TM2",role:"MEMBER"}],
       roles: ["recruiter"], permissions: Set{...}
     }

2. No @RequirePermission on this resolver (view_all covers listing — functional guard passes)

3. CandidateResolver.candidate() runs
   → db.candidate.findFirst({ where: { id: "C1", tenantId: "T_ACME" } })

4. permissionService.assertCan(alice, "Candidate", "C1", VIEW)

5. PermissionService collects grantees:
   grantees = [USER:U_ALICE, TEAM:TM1, TEAM:TM2, ROLE:<recruiter-ulid>]

   SELECT MAX(accessLevel) FROM Permission
   WHERE tenantId = 'T_ACME'
     AND resourceType = 'Candidate' AND resourceId = 'C1'
     AND (granteeType, granteeId) IN (grantees)
     AND (expiresAt IS NULL OR expiresAt > NOW())
   → returns EDIT (team TM1 was auto-granted EDIT when a TM1 colleague created C1)

   Alice is LEAD of TM1 → EDIT level preserved (MEMBER would cap at EDIT too; OWNER would be capped)

6. EDIT >= VIEW → ALLOW. Candidate returned.

7. Result cached in request-scoped LRU: key=(U_ALICE, Candidate, C1) → EDIT
```

---

## 12. Access Summary Matrix

| Scenario | Functional permission needed | Row-level access needed |
|----------|------------------------------|-------------------------|
| List candidates in my team | `candidate:view_all` | data scope filter (no per-record check) |
| View a specific candidate | `candidate:view_all` | VIEW on that Candidate |
| Edit a candidate | (none on query; write mutation needs...) | EDIT on that Candidate |
| Export candidates | `candidate:export` | VIEW on each exported Candidate |
| View salary field | `candidate:view_salary` | EDIT on that Candidate |
| Approve a job order | `job:approve` | EDIT on that Job |
| See an offer amount | `offer:view_amount` | VIEW on that Offer |
| Share a candidate | (none extra) | OWNER on that Candidate |
| Revoke a share | (none extra) | OWNER on that Candidate |
| Manage team members | `team:manage` | — (functional only) |
| Invite user | `user:invite` | — (functional only) |
| View audit log | `admin:audit_log_view` | — (functional only; always tenant-scoped) |

---

## 13. Future-Proofing

### Phase 2: SSO / SAML
OIDC and SAML providers plug in as `AuthStrategy` implementations that, after external IdP verification, locate or create the `AuthIdentity` (by `oidcSubject` or email) and proceed from step 5 of the login flow. No changes to the `Permission` model.

### Phase 2: Delegation
```prisma
model Delegation {
  id          String   @id @default(ulid())
  tenantId    String
  grantorId   String   // User giving away approval rights temporarily
  granteeId   String   // User receiving them
  scope       Json     // which resourceTypes and actions are delegated
  startsAt    DateTime
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime @default(now())
}
```
`PermissionService` checks active delegations when resolving functional permissions for approval actions. Mirrors "John out for 2 weeks, his approvals go to Jane" — a gap in Gllue (see gllue-research.md §9.5).

### Phase 2: Approval-Gated Access
Access can be made conditional on approval: `grantSource: APPROVAL` grants are written only when an `approvalflow` completes. The approval service calls `permissionService.grant(...)` on approval and `permissionService.revoke(...)` on rejection/withdrawal.

### Phase 3: Row-Level Policy Rules (Dynamic Grants)
For complex scenarios ("anyone in the Healthcare practice team automatically gets VIEW on all candidates tagged #healthcare"), define `PermissionRule`:
```prisma
model PermissionRule {
  id           String       @id @default(ulid())
  tenantId     String
  granteeType  GranteeType
  granteeId    String       // e.g., Practice team ID
  resourceType String
  filterJson   Json         // e.g., { "tags": { "contains": "healthcare" } }
  accessLevel  AccessLevel
  active       Boolean      @default(true)
}
```
A nightly job evaluates rules and materialises `Permission` rows (`grantSource: RULE`). Real-time evaluation is deferred to Phase 3.
