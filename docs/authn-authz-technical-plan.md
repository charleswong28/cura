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

```jsonc
// Header
{ "alg": "HS512", "typ": "JWT" }

// Payload
{
  "sub": "01HV...",          // User ULID
  "tid": "01HU...",          // Tenant ULID
  "sid": "01HW...",          // Session ULID
  "roles": ["recruiter"],    // Role names — coarse gating only
  "iat": 1714000000,
  "exp": 1714000900          // +15 min
}
```

`tid` is embedded so the hot-path resolver never hits the DB to resolve the tenant. `roles` is a summary for guards that don't need per-record precision. Row-level checks always go to `PermissionService`, not the JWT.

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
  roles: string[];                 // role names from JWT
  permissions: Set<string>;        // expanded, hydrated by JwtAuthGuard
  teamIds: string[];               // hydrated from DB (cached 5 min)
  roleIds: string[];               // role ULIDs for Permission queries
}
```

`JwtAuthGuard` (registered as `APP_GUARD`) runs on every request:
1. Verify JWT signature + expiry.
2. Attach `{ userId, tenantId, sessionId, roles }` from claims.
3. Hydrate `permissions` by expanding role names → permission strings (in-memory cache).
4. Hydrate `teamIds` and `roleIds` from a short-TTL cache (busted on team membership change).

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
// Resolver example
@Resolver(() => Candidate)
export class CandidateResolver {
  @Query(() => [Candidate])
  @RequirePermission('candidate:view_all')
  async candidates(@CurrentUser() user: RequestUser) {
    return this.candidateService.findAll(user);
    // findAll calls prisma.forTenant(user.tenantId) + data scope filter internally
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

| Cache | Scope | TTL | Invalidation |
|-------|-------|-----|--------------|
| User role + permission set | In-memory (Map) | 5 min | On role assignment change |
| User teamIds + roleIds | In-memory (Map) | 5 min | On team membership change |
| `can()` result per record | Request-scoped LRU | Request lifetime | N/A (fresh per request) |
| `getExplicitlyGrantedIds()` | Request-scoped | Request lifetime | N/A |

Permission cache is deliberately **request-scoped** — the same principal can be denied before a grant is written and allowed after, within the same request, because the grant may occur mid-resolver chain (e.g., creating a record automatically grants owner access before the response is returned).

---

## 10. JWT Validation and State Invalidation

### 10.1 The Staleness Problem

A JWT is cryptographically self-contained. `JwtAuthGuard` can verify its signature and expiry with no DB round-trip — but that means the JWT's embedded state (`roles`, `tid`) can diverge from reality during the token's 15-minute lifetime:

| Event that changes state | What the JWT still claims | Consequence if not handled |
|--------------------------|---------------------------|---------------------------|
| Admin revokes user's session (logout-all, suspicious activity) | `sid` still looks valid | Revoked session still works for up to 15 min |
| User deactivated (`loginable = false`) | `sub` still looks valid | Deactivated user still has API access |
| User deleted (`deletedAt` set) | `sub` still looks valid | Deleted user still has API access |
| User removed from tenant | `tid` still embedded | User accesses wrong tenant's data |
| Role changed / removed | `roles: ['admin']` in JWT | Downgraded user keeps elevated permissions |
| Row-level permission revoked | — | Not a JWT problem — already DB-backed |

**Design decision:** Cura accepts a configurable short staleness window (default 30 s) for session and user-status checks by using in-process caches with manual bust on mutation. Row-level permission changes are always reflected on the next request (request-scoped cache).

---

### 10.2 Three-Layer Validation in JwtAuthGuard

`JwtAuthGuard` runs **three validation layers** on every non-public request, in order:

```
Layer 1 — Crypto (no DB)
  jwtService.verifyAsync(token)
    → verify HS512 signature
    → verify exp > now
    → extract { sub, tid, sid, roles }

Layer 2 — Session liveness (DB, cached 30 s)
  sessionService.isValid(sid)
    → SELECT id FROM Session
      WHERE id = sid AND revokedAt IS NULL AND expiresAt > NOW()
    → cache hit: skip DB if seen within 30 s
    → cache miss / expired: query DB, cache result
    → FAIL → 401 "Session revoked or expired"

Layer 3 — User status (DB, cached 30 s)
  userService.isActive(sub, tid)
    → SELECT id FROM User
      WHERE id = sub AND tenantId = tid
        AND loginable = true AND deletedAt IS NULL
    → cache hit: skip DB if seen within 30 s
    → FAIL → 401 "Account inactive"

Then hydrate RequestUser:
  permissions ← functional permission cache (5 min TTL, bustable)
  teamIds     ← team membership cache (5 min TTL, bustable)
  roleIds     ← derived from permissions cache
```

**Layer 2 is the primary kill switch.** Revoking a Session is immediate — the next request carrying that JWT fails, regardless of the JWT's remaining lifetime.

**Layer 3 catches the deactivation/deletion case** where all sessions are also revoked (belt + braces).

---

### 10.3 Cache Design

**Phase 1 — Single-instance, in-process:**

```typescript
// All three caches live in AuthCacheService (singleton)
@Injectable()
export class AuthCacheService {
  // Key: sessionId  →  { valid: boolean, cachedAt: number }
  private readonly sessionCache = new Map<string, SessionCacheEntry>();
  private readonly SESSION_TTL_MS = 30_000;

  // Key: `${userId}:${tenantId}`  →  { active: boolean, cachedAt: number }
  private readonly userStatusCache = new Map<string, UserStatusEntry>();
  private readonly USER_STATUS_TTL_MS = 30_000;

  // Key: userId  →  { permissions: Set<string>, roleIds: string[], cachedAt: number }
  private readonly permissionCache = new Map<string, PermissionCacheEntry>();
  private readonly PERMISSION_TTL_MS = 5 * 60_000;

  isSessionValid(sid: string): boolean | undefined {
    const entry = this.sessionCache.get(sid);
    if (!entry || Date.now() - entry.cachedAt > this.SESSION_TTL_MS) return undefined; // miss
    return entry.valid;
  }

  setSessionValid(sid: string, valid: boolean): void {
    this.sessionCache.set(sid, { valid, cachedAt: Date.now() });
  }

  bustSession(sid: string): void {
    this.sessionCache.delete(sid);  // next request hits DB immediately
  }

  bustAllSessionsForUser(userId: string): void {
    // Called on logout-all / deactivation — invalidate all cached entries for this user.
    // In-process: we can't enumerate by userId without a secondary index.
    // Two options:
    //   (a) Store userId → Set<sid> reverse index in the cache service.
    //   (b) Accept up to SESSION_TTL_MS (30 s) staleness on cached entries.
    // Phase 1 uses (a): O(sessions-per-user) bust on mutation.
    const sids = this.userSessionIndex.get(userId) ?? new Set();
    for (const sid of sids) this.sessionCache.delete(sid);
    this.userSessionIndex.delete(userId);
  }

  bustUserStatus(userId: string, tenantId: string): void {
    this.userStatusCache.delete(`${userId}:${tenantId}`);
  }

  bustPermissions(userId: string): void {
    this.permissionCache.delete(userId);
  }
}
```

**Phase 2 — Multi-instance (Redis):**

```
Session validity:   Redis SET  session:{sid}  "1|0"  EX 30
User status:        Redis SET  user_status:{userId}:{tenantId}  "1|0"  EX 30
Permission set:     Redis SET  user_perms:{userId}  <json>  EX 300

Bust on mutation:
  DEL session:{sid}                      ← explicit session revoke
  DEL session:{sid} for each sid         ← logout-all (via userSessionIndex in Redis Set)
  DEL user_status:{userId}:{tenantId}    ← deactivate / delete / tenant removal
  DEL user_perms:{userId}                ← role change
```

No pub/sub needed — each instance independently caches and busts. A bust on instance A causes instance B to get a cache miss on next request, which refreshes from DB.

---

### 10.4 Invalidation by Event

Every mutation that changes auth state **must** bust the relevant cache entry (and, where appropriate, write DB revocations) before returning.

| Event | DB write | Cache bust |
|-------|----------|------------|
| `POST /auth/logout` | `Session.revokedAt = now` | `bustSession(sid)` |
| `POST /auth/logout-all` | `Session.revokedAt = now` for all user Sessions | `bustAllSessionsForUser(userId)` |
| `User.deactivate()` | `User.loginable = false` + revoke all Sessions | `bustAllSessionsForUser(userId)` + `bustUserStatus(userId, tenantId)` |
| `User.delete()` | `User.deletedAt = now` + revoke all Sessions | `bustAllSessionsForUser(userId)` + `bustUserStatus(userId, tenantId)` |
| `TenantMembership.remove(userId, tenantId)` | Revoke Sessions where `tenantId = tid` | `bustUserStatus(userId, tenantId)` |
| `AuthIdentity.lock()` (brute-force) | `lockedUntil = now + lockDuration` | Sessions still valid; user can't re-login or refresh, existing tokens fail at Layer 3 if `loginable` is also set false |
| `User.passwordChange()` | new `passwordHash`, revoke all Sessions | `bustAllSessionsForUser(userId)` |
| Refresh-token reuse detected | Revoke all Sessions for userId | `bustAllSessionsForUser(userId)` |
| `UserRole.assign(userId, roleId)` | Insert `UserRole` row | `bustPermissions(userId)` |
| `UserRole.remove(userId, roleId)` | Delete `UserRole` row | `bustPermissions(userId)` |
| `Role.updatePermissions(roleId, perms)` | Update `Role.permissions` | `bustPermissions` for every userId holding that roleId¹ |
| `TeamMember.add(teamId, userId)` | Insert `TeamMember` row | `bustPermissions(userId)` (teamIds re-hydrated next request) |
| `TeamMember.remove(teamId, userId)` | Delete `TeamMember` row | `bustPermissions(userId)` |
| `Permission.revoke(permissionId)` | Delete `Permission` row + write `PermissionGrant` audit | No cross-request bust needed (request-scoped cache) |

¹ Bulk-busting all holders of a role requires a `SELECT userId FROM UserRole WHERE roleId = ?` lookup — cheap at CRM scale. If a role has thousands of users, defer to TTL expiry instead.

---

### 10.5 The `roles` Claim Is Decorative

The `roles: ['recruiter']` array embedded in the JWT **is not used for permission decisions**. It exists only for logging, tracing, and client-side UI hints (e.g., "show admin menu"). Actual functional permission checks always go through the `permissionCache`, which is loaded from DB and busted on role change.

This is the key reason role changes do **not** require session revocation. The JWT's `roles` claim becoming stale has no security consequence because no guard trusts it.

```typescript
// WRONG — do not do this
if (user.roles.includes('admin')) allowExport();

// RIGHT
if (user.permissions.has('candidate:export')) allowExport();
// user.permissions comes from permissionCache, not the JWT
```

---

### 10.6 High-Security Operations: Cache Bypass

For operations where even 30 seconds of staleness is unacceptable (salary export, offer amount view, audit log access), resolvers can force a cache bypass:

```typescript
@Mutation()
@RequirePermission('candidate:export')
async exportCandidates(@CurrentUser() user: RequestUser, @Args() args: ExportArgs) {
  // Force fresh session + user status check, bypassing 30s cache
  await this.authService.assertSessionFresh(user.sessionId, user.userId, user.tenantId);
  // ...rest of export logic
}
```

`assertSessionFresh` queries the DB directly and throws if the session or user is no longer valid, regardless of cache state.

---

### 10.7 Updated JwtAuthGuard Implementation

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
    private readonly authCache: AuthCacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();

    // Allow @Public() routes through
    if (this.reflector.getAllAndOverride('isPublic', [ctx.getHandler(), ctx.getClass()])) {
      return true;
    }

    // Layer 1 — Crypto validation (no DB)
    const token = this.extractBearerToken(req);
    if (!token) throw new UnauthorizedException('Missing token');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Layer 2 — Session liveness (cached 30 s, busted on revoke)
    const sessionValid = await this.sessionService.isValid(payload.sid);
    if (!sessionValid) throw new UnauthorizedException('Session revoked');

    // Layer 3 — User status (cached 30 s, busted on deactivation/deletion)
    const userActive = await this.userService.isActive(payload.sub, payload.tid);
    if (!userActive) throw new UnauthorizedException('Account inactive');

    // Hydrate principal (permissions from 5-min cache)
    req.user = await this.buildRequestUser(payload);
    return true;
  }

  private async buildRequestUser(payload: JwtPayload): Promise<RequestUser> {
    const { permissions, roleIds } = await this.authCache.getPermissions(payload.sub);
    const teamIds = await this.authCache.getTeamIds(payload.sub, payload.tid);
    return {
      userId: payload.sub,
      tenantId: payload.tid,
      sessionId: payload.sid,
      roles: payload.roles,        // decorative only
      permissions,                 // live from cache
      teamIds,
      roleIds,
    };
  }
}
```

---

## 11. Permission Check: Concrete End-to-End Example

> For the invalidation flow that precedes this, see §10.

**Scenario:** Alice (recruiter, in Team T1 and Team T2) queries `candidate(id: "C1")`.

```
1. JwtAuthGuard
   → verifies JWT
   → hydrates req.user = { userId: "U_ALICE", tenantId: "T_ACME", roles: ["recruiter"],
                            permissions: Set{"candidate:view_all", "job:create", ...},
                            teamIds: ["TM1", "TM2"], roleIds: ["R_RECRUITER"] }

2. No @RequirePermission on this query (view_all covers it — functional guard passes)

3. CandidateResolver.candidate() runs
   → db.candidate.findFirst({ where: { id: "C1", tenantId: "T_ACME" } })  ← scoped query

4. permissionService.assertCan(alice, "Candidate", "C1", VIEW)

5. PermissionService queries:
   SELECT MAX(accessLevel) FROM Permission
   WHERE tenantId = 'T_ACME'
     AND resourceType = 'Candidate'
     AND resourceId   = 'C1'
     AND ((granteeType='USER' AND granteeId='U_ALICE')
       OR (granteeType='TEAM' AND granteeId IN ('TM1','TM2'))
       OR (granteeType='ROLE' AND granteeId='R_RECRUITER'))
     AND (expiresAt IS NULL OR expiresAt > NOW())
   → returns EDIT (Alice's team TM1 was granted EDIT when a colleague in TM1 created C1)

6. EDIT >= VIEW → ALLOW. Candidate returned.

7. Result cached in request-scoped LRU for any subsequent check on ("U_ALICE", "Candidate", "C1") in this request.
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
