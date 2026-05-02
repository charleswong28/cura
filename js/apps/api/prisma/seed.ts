import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const pool = new pg.Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Seed IDs — deterministic so re-running is idempotent (upsert by ID)
// ---------------------------------------------------------------------------

const TENANT_ID = "01JEXAMPLE0TENANT000001";
const AUTH_IDENTITY_ADMIN_ID = "01JEXAMPLE0AUTHID0ADMIN1";
const AUTH_IDENTITY_RECRUITER_ID = "01JEXAMPLE0AUTHIDRECR01";
const USER_ADMIN_ID = "01JEXAMPLE0USERADMIN01";
const USER_RECRUITER_ID = "01JEXAMPLE0USERRECR001";

const CLIENT_IDS = ["01JEXAMPLE0CLIENT00001", "01JEXAMPLE0CLIENT00002", "01JEXAMPLE0CLIENT00003"];

const CANDIDATE_IDS = [
  "01JEXAMPLE0CAND0000001",
  "01JEXAMPLE0CAND0000002",
  "01JEXAMPLE0CAND0000003",
  "01JEXAMPLE0CAND0000004",
  "01JEXAMPLE0CAND0000005",
];

const JOB_IDS = [
  "01JEXAMPLE0JOB00000001",
  "01JEXAMPLE0JOB00000002",
  "01JEXAMPLE0JOB00000003",
  "01JEXAMPLE0JOB00000004",
];

// Built-in role IDs
const ROLE_ADMIN_ID = "01JEXAMPLE0ROLEADMIN001";
const ROLE_SENIOR_RECRUITER_ID = "01JEXAMPLE0ROLESENREC01";
const ROLE_RECRUITER_ID = "01JEXAMPLE0ROLERECRUIT1";
const ROLE_VIEWER_ID = "01JEXAMPLE0ROLEVIEWER01";

// Cascade rule IDs
const CASCADE_JOB_APP_CANDIDATE_ID = "01JEXAMPLE0CASCADE00001";
const CASCADE_JOB_APP_JOB_ID = "01JEXAMPLE0CASCADE00002";
const CASCADE_OFFER_JOB_APP_ID = "01JEXAMPLE0CASCADE00003";
const CASCADE_INTERVIEW_JOB_APP_ID = "01JEXAMPLE0CASCADE00004";
const CASCADE_CLIENT_JOB_ID = "01JEXAMPLE0CASCADE00005";

// ---------------------------------------------------------------------------
// Permission string sets per role (§4.2 of authn-authz-technical-plan.md)
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS = ["*:*"];

const SENIOR_RECRUITER_PERMISSIONS = [
  "candidate:create",
  "candidate:view_all",
  "candidate:export",
  "candidate:edit_any",
  "candidate:delete",
  "candidate:view_salary",
  "candidate:lock",
  "candidate:import",
  "job:create",
  "job:view_all",
  "job:edit_any",
  "job:delete",
  "job:approve",
  "job:close",
  "job:assign_recruiter",
  "client:create",
  "client:view_all",
  "client:edit_any",
  "client:delete",
  "client:manage_bd",
  "client:view_contract",
  "application:manage",
  "application:forward",
  "application:reject",
  "application:request_interview",
  "application:create_offer",
  "offer:create",
  "offer:view_amount",
  "report:view",
  "report:export",
  "team:invite_member",
];

const RECRUITER_PERMISSIONS = [
  "candidate:create",
  "candidate:view_all",
  "candidate:export",
  "job:create",
  "job:view_all",
  "client:view_all",
  "application:manage",
  "offer:create",
  "report:view",
];

const VIEWER_PERMISSIONS = ["candidate:view_all", "job:view_all", "client:view_all", "report:view"];

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding database...\n");

  // --- Tenant ---
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      slug: "acme-recruiting",
      name: "Acme Recruiting",
    },
  });
  console.log(`  Tenant: ${tenant.name} (slug: ${tenant.slug})`);

  // --- AuthIdentities (first-party credentials for dev users) ---
  // Passwords are bcrypt/argon2 hashes — use "password" for dev login.
  // The hash below is argon2id("password") — do not use in production.
  const devPasswordHash = "$argon2id$v=19$m=65536,t=3,p=4$devSeedHashPlaceholder";

  const authAdmin = await prisma.authIdentity.upsert({
    where: { id: AUTH_IDENTITY_ADMIN_ID },
    update: {},
    create: {
      id: AUTH_IDENTITY_ADMIN_ID,
      email: "admin@acmerecruiting.com",
      passwordHash: devPasswordHash,
    },
  });

  const authRecruiter = await prisma.authIdentity.upsert({
    where: { id: AUTH_IDENTITY_RECRUITER_ID },
    update: {},
    create: {
      id: AUTH_IDENTITY_RECRUITER_ID,
      email: "bob@acmerecruiting.com",
      passwordHash: devPasswordHash,
    },
  });
  console.log(`  AuthIdentities: ${authAdmin.email}, ${authRecruiter.email}`);

  // --- Users ---
  const admin = await prisma.user.upsert({
    where: { id: USER_ADMIN_ID },
    update: {},
    create: {
      id: USER_ADMIN_ID,
      tenantId: TENANT_ID,
      authIdentityId: AUTH_IDENTITY_ADMIN_ID,
      email: "admin@acmerecruiting.com",
      firstName: "Alice",
      lastName: "Admin",
    },
  });

  const recruiter = await prisma.user.upsert({
    where: { id: USER_RECRUITER_ID },
    update: {},
    create: {
      id: USER_RECRUITER_ID,
      tenantId: TENANT_ID,
      authIdentityId: AUTH_IDENTITY_RECRUITER_ID,
      email: "bob@acmerecruiting.com",
      firstName: "Bob",
      lastName: "Recruiter",
    },
  });
  console.log(`  Users: ${admin.firstName} (admin), ${recruiter.firstName} (recruiter)`);

  // --- Built-in Roles (TASK-071) — per §4.2 of authn-authz-technical-plan.md ---
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { id: ROLE_ADMIN_ID },
      update: { permissions: ALL_PERMISSIONS },
      create: {
        id: ROLE_ADMIN_ID,
        name: "admin",
        description: "Full access to all resources and settings.",
        permissions: ALL_PERMISSIONS,
        builtin: true,
      },
    }),
    prisma.role.upsert({
      where: { id: ROLE_SENIOR_RECRUITER_ID },
      update: { permissions: SENIOR_RECRUITER_PERMISSIONS },
      create: {
        id: ROLE_SENIOR_RECRUITER_ID,
        name: "senior_recruiter",
        description: "Full CRUD on candidates, jobs, clients and applications. Can approve jobs.",
        permissions: SENIOR_RECRUITER_PERMISSIONS,
        builtin: true,
      },
    }),
    prisma.role.upsert({
      where: { id: ROLE_RECRUITER_ID },
      update: { permissions: RECRUITER_PERMISSIONS },
      create: {
        id: ROLE_RECRUITER_ID,
        name: "recruiter",
        description: "Standard recruiter — create and view records within team scope.",
        permissions: RECRUITER_PERMISSIONS,
        builtin: true,
      },
    }),
    prisma.role.upsert({
      where: { id: ROLE_VIEWER_ID },
      update: { permissions: VIEWER_PERMISSIONS },
      create: {
        id: ROLE_VIEWER_ID,
        name: "viewer",
        description: "Read-only access to candidates, jobs, and clients within team scope.",
        permissions: VIEWER_PERMISSIONS,
        builtin: true,
      },
    }),
  ]);
  console.log(`  Roles: ${roles.map((r) => r.name).join(", ")}`);

  // --- RoleDataScope rows (TASK-071) — per §5.1 of authn-authz-technical-plan.md ---
  // admin: ALL for every resource type
  // senior_recruiter: TEAM_TREE
  // recruiter: MY_TEAMS for candidate/job, MINE for client
  // viewer: MY_TEAMS for everything

  const resourceTypes = ["Candidate", "Job", "Client"];

  await Promise.all([
    // admin — ALL
    ...resourceTypes.map((rt) =>
      prisma.roleDataScope.upsert({
        where: { roleId_resourceType: { roleId: ROLE_ADMIN_ID, resourceType: rt } },
        update: { dataScope: "ALL" },
        create: { roleId: ROLE_ADMIN_ID, resourceType: rt, dataScope: "ALL" },
      })
    ),
    // senior_recruiter — TEAM_TREE
    ...resourceTypes.map((rt) =>
      prisma.roleDataScope.upsert({
        where: { roleId_resourceType: { roleId: ROLE_SENIOR_RECRUITER_ID, resourceType: rt } },
        update: { dataScope: "TEAM_TREE" },
        create: { roleId: ROLE_SENIOR_RECRUITER_ID, resourceType: rt, dataScope: "TEAM_TREE" },
      })
    ),
    // recruiter — MY_TEAMS for Candidate/Job, MINE for Client
    prisma.roleDataScope.upsert({
      where: { roleId_resourceType: { roleId: ROLE_RECRUITER_ID, resourceType: "Candidate" } },
      update: { dataScope: "MY_TEAMS" },
      create: { roleId: ROLE_RECRUITER_ID, resourceType: "Candidate", dataScope: "MY_TEAMS" },
    }),
    prisma.roleDataScope.upsert({
      where: { roleId_resourceType: { roleId: ROLE_RECRUITER_ID, resourceType: "Job" } },
      update: { dataScope: "MY_TEAMS" },
      create: { roleId: ROLE_RECRUITER_ID, resourceType: "Job", dataScope: "MY_TEAMS" },
    }),
    prisma.roleDataScope.upsert({
      where: { roleId_resourceType: { roleId: ROLE_RECRUITER_ID, resourceType: "Client" } },
      update: { dataScope: "MINE" },
      create: { roleId: ROLE_RECRUITER_ID, resourceType: "Client", dataScope: "MINE" },
    }),
    // viewer — MY_TEAMS
    ...resourceTypes.map((rt) =>
      prisma.roleDataScope.upsert({
        where: { roleId_resourceType: { roleId: ROLE_VIEWER_ID, resourceType: rt } },
        update: { dataScope: "MY_TEAMS" },
        create: { roleId: ROLE_VIEWER_ID, resourceType: rt, dataScope: "MY_TEAMS" },
      })
    ),
  ]);
  console.log(`  RoleDataScopes: seeded for admin, senior_recruiter, recruiter, viewer`);

  // --- Assign roles to dev users ---
  await Promise.all([
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: USER_ADMIN_ID, roleId: ROLE_ADMIN_ID } },
      update: {},
      create: { userId: USER_ADMIN_ID, roleId: ROLE_ADMIN_ID, assignedById: USER_ADMIN_ID },
    }),
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: USER_RECRUITER_ID, roleId: ROLE_RECRUITER_ID } },
      update: {},
      create: {
        userId: USER_RECRUITER_ID,
        roleId: ROLE_RECRUITER_ID,
        assignedById: USER_ADMIN_ID,
      },
    }),
  ]);
  console.log(`  UserRoles: Alice → admin, Bob → recruiter`);

  // --- Built-in PermissionCascadeRules (TASK-072) — per §5.4 of authn-authz-technical-plan.md ---
  const cascadeRules = await Promise.all([
    // JobApplication → Candidate: VIEW on JobApplication grants VIEW on Candidate
    prisma.permissionCascadeRule.upsert({
      where: { id: CASCADE_JOB_APP_CANDIDATE_ID },
      update: {},
      create: {
        id: CASCADE_JOB_APP_CANDIDATE_ID,
        fromResourceType: "JobApplication",
        toResourceType: "Candidate",
        minAccessLevel: "VIEW",
        grantLevel: "VIEW",
      },
    }),
    // JobApplication → Job: VIEW on JobApplication grants VIEW on Job
    prisma.permissionCascadeRule.upsert({
      where: { id: CASCADE_JOB_APP_JOB_ID },
      update: {},
      create: {
        id: CASCADE_JOB_APP_JOB_ID,
        fromResourceType: "JobApplication",
        toResourceType: "Job",
        minAccessLevel: "VIEW",
        grantLevel: "VIEW",
      },
    }),
    // Offer → JobApplication: VIEW on Offer grants VIEW on JobApplication
    prisma.permissionCascadeRule.upsert({
      where: { id: CASCADE_OFFER_JOB_APP_ID },
      update: {},
      create: {
        id: CASCADE_OFFER_JOB_APP_ID,
        fromResourceType: "Offer",
        toResourceType: "JobApplication",
        minAccessLevel: "VIEW",
        grantLevel: "VIEW",
      },
    }),
    // Interview → JobApplication: VIEW on Interview grants VIEW on JobApplication
    prisma.permissionCascadeRule.upsert({
      where: { id: CASCADE_INTERVIEW_JOB_APP_ID },
      update: {},
      create: {
        id: CASCADE_INTERVIEW_JOB_APP_ID,
        fromResourceType: "Interview",
        toResourceType: "JobApplication",
        minAccessLevel: "VIEW",
        grantLevel: "VIEW",
      },
    }),
    // Client → Job: OWNER on Client grants EDIT on Job
    prisma.permissionCascadeRule.upsert({
      where: { id: CASCADE_CLIENT_JOB_ID },
      update: {},
      create: {
        id: CASCADE_CLIENT_JOB_ID,
        fromResourceType: "Client",
        toResourceType: "Job",
        minAccessLevel: "OWNER",
        grantLevel: "EDIT",
      },
    }),
  ]);
  console.log(`  PermissionCascadeRules: ${cascadeRules.length} built-in rules seeded`);

  // --- Clients ---
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: CLIENT_IDS[0] },
      update: {},
      create: {
        id: CLIENT_IDS[0],
        tenantId: TENANT_ID,
        bdUserId: USER_ADMIN_ID,
        createdById: USER_ADMIN_ID,
        name: "TechCorp Inc.",
        industry: "Technology",
        website: "https://techcorp.example.com",
        phone: "+1-555-0100",
        address: "100 Innovation Way, San Francisco, CA 94105",
        status: "ACTIVE",
      },
    }),
    prisma.client.upsert({
      where: { id: CLIENT_IDS[1] },
      update: {},
      create: {
        id: CLIENT_IDS[1],
        tenantId: TENANT_ID,
        bdUserId: USER_ADMIN_ID,
        createdById: USER_ADMIN_ID,
        name: "FinServe Global",
        industry: "Financial Services",
        website: "https://finserve.example.com",
        phone: "+1-555-0200",
        address: "200 Wall St, New York, NY 10005",
        status: "ACTIVE",
      },
    }),
    prisma.client.upsert({
      where: { id: CLIENT_IDS[2] },
      update: {},
      create: {
        id: CLIENT_IDS[2],
        tenantId: TENANT_ID,
        bdUserId: USER_RECRUITER_ID,
        createdById: USER_RECRUITER_ID,
        name: "GreenHealth Labs",
        industry: "Healthcare",
        website: "https://greenhealth.example.com",
        phone: "+1-555-0300",
        address: "300 Medical Plaza, Boston, MA 02115",
        status: "PROSPECT",
      },
    }),
  ]);
  console.log(`  Clients: ${clients.map((c) => c.name).join(", ")}`);

  // --- Candidates ---
  const candidates = await Promise.all([
    prisma.candidate.upsert({
      where: { id: CANDIDATE_IDS[0] },
      update: {},
      create: {
        id: CANDIDATE_IDS[0],
        tenantId: TENANT_ID,
        ownerUserId: USER_RECRUITER_ID,
        createdById: USER_RECRUITER_ID,
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah.chen@example.com",
        phone: "+1-555-1001",
        currentCompany: "Google",
        currentTitle: "Senior Software Engineer",
        location: "San Francisco, CA",
        status: "ACTIVE",
        notes: "Strong backend experience with Go and distributed systems.",
      },
    }),
    prisma.candidate.upsert({
      where: { id: CANDIDATE_IDS[1] },
      update: {},
      create: {
        id: CANDIDATE_IDS[1],
        tenantId: TENANT_ID,
        ownerUserId: USER_RECRUITER_ID,
        createdById: USER_RECRUITER_ID,
        firstName: "James",
        lastName: "Park",
        email: "james.park@example.com",
        phone: "+1-555-1002",
        currentCompany: "Meta",
        currentTitle: "Staff Frontend Engineer",
        location: "New York, NY",
        status: "ACTIVE",
        notes: "React and TypeScript expert. Open to fintech roles.",
      },
    }),
    prisma.candidate.upsert({
      where: { id: CANDIDATE_IDS[2] },
      update: {},
      create: {
        id: CANDIDATE_IDS[2],
        tenantId: TENANT_ID,
        ownerUserId: USER_ADMIN_ID,
        createdById: USER_ADMIN_ID,
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria.garcia@example.com",
        phone: "+1-555-1003",
        currentCompany: "Stripe",
        currentTitle: "Engineering Manager",
        location: "Seattle, WA",
        status: "ACTIVE",
        notes: "Leadership experience. Looking for VP Eng opportunities.",
      },
    }),
    prisma.candidate.upsert({
      where: { id: CANDIDATE_IDS[3] },
      update: {},
      create: {
        id: CANDIDATE_IDS[3],
        tenantId: TENANT_ID,
        ownerUserId: USER_RECRUITER_ID,
        createdById: USER_RECRUITER_ID,
        firstName: "David",
        lastName: "Kim",
        email: "david.kim@example.com",
        phone: "+1-555-1004",
        currentCompany: "Netflix",
        currentTitle: "Data Engineer",
        location: "Los Angeles, CA",
        status: "PLACED",
        notes: "Placed at FinServe Global in Q1. Strong data pipeline skills.",
      },
    }),
    prisma.candidate.upsert({
      where: { id: CANDIDATE_IDS[4] },
      update: {},
      create: {
        id: CANDIDATE_IDS[4],
        tenantId: TENANT_ID,
        ownerUserId: USER_ADMIN_ID,
        createdById: USER_ADMIN_ID,
        firstName: "Emily",
        lastName: "Zhang",
        email: "emily.zhang@example.com",
        phone: "+1-555-1005",
        currentCompany: "Airbnb",
        currentTitle: "Product Designer",
        location: "San Francisco, CA",
        status: "INACTIVE",
        notes: "Not actively looking. Revisit in 6 months.",
      },
    }),
  ]);
  console.log(`  Candidates: ${candidates.map((c) => `${c.firstName} ${c.lastName}`).join(", ")}`);

  // --- Jobs ---
  const jobs = await Promise.all([
    prisma.job.upsert({
      where: { id: JOB_IDS[0] },
      update: {},
      create: {
        id: JOB_IDS[0],
        tenantId: TENANT_ID,
        clientId: CLIENT_IDS[0],
        ownerUserId: USER_RECRUITER_ID,
        createdById: USER_RECRUITER_ID,
        title: "Senior Backend Engineer",
        description:
          "Build and scale microservices for TechCorp's platform. Go or Java experience required. Remote-friendly.",
        status: "OPEN",
        priority: "HIGH",
        assignedToId: USER_RECRUITER_ID,
      },
    }),
    prisma.job.upsert({
      where: { id: JOB_IDS[1] },
      update: {},
      create: {
        id: JOB_IDS[1],
        tenantId: TENANT_ID,
        clientId: CLIENT_IDS[0],
        ownerUserId: USER_RECRUITER_ID,
        createdById: USER_RECRUITER_ID,
        title: "Staff Frontend Engineer",
        description:
          "Lead the frontend architecture migration to React 19. TypeScript expertise required.",
        status: "OPEN",
        priority: "MEDIUM",
        assignedToId: USER_RECRUITER_ID,
      },
    }),
    prisma.job.upsert({
      where: { id: JOB_IDS[2] },
      update: {},
      create: {
        id: JOB_IDS[2],
        tenantId: TENANT_ID,
        clientId: CLIENT_IDS[1],
        ownerUserId: USER_ADMIN_ID,
        createdById: USER_ADMIN_ID,
        title: "VP of Engineering",
        description:
          "Lead engineering org of 50+ across payments, compliance, and infrastructure teams.",
        status: "OPEN",
        priority: "URGENT",
        assignedToId: USER_ADMIN_ID,
      },
    }),
    prisma.job.upsert({
      where: { id: JOB_IDS[3] },
      update: {},
      create: {
        id: JOB_IDS[3],
        tenantId: TENANT_ID,
        clientId: CLIENT_IDS[1],
        ownerUserId: USER_RECRUITER_ID,
        createdById: USER_RECRUITER_ID,
        title: "Senior Data Engineer",
        description: "Design and maintain real-time data pipelines for trading analytics.",
        status: "FILLED",
        priority: "MEDIUM",
        assignedToId: USER_RECRUITER_ID,
      },
    }),
  ]);
  console.log(`  Jobs: ${jobs.map((j) => j.title).join(", ")}`);

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
