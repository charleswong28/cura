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
      clerkOrgId: "org_dev_seed_001",
      name: "Acme Recruiting",
    },
  });
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);

  // --- Users ---
  const admin = await prisma.user.upsert({
    where: { id: USER_ADMIN_ID },
    update: {},
    create: {
      id: USER_ADMIN_ID,
      tenantId: TENANT_ID,
      clerkUserId: "user_dev_admin_001",
      email: "admin@acmerecruiting.com",
      firstName: "Alice",
      lastName: "Admin",
      role: "ADMIN",
    },
  });

  const recruiter = await prisma.user.upsert({
    where: { id: USER_RECRUITER_ID },
    update: {},
    create: {
      id: USER_RECRUITER_ID,
      tenantId: TENANT_ID,
      clerkUserId: "user_dev_recruiter_001",
      email: "bob@acmerecruiting.com",
      firstName: "Bob",
      lastName: "Recruiter",
      role: "RECRUITER",
    },
  });
  console.log(`  Users: ${admin.firstName} (admin), ${recruiter.firstName} (recruiter)`);

  // --- Clients ---
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: CLIENT_IDS[0] },
      update: {},
      create: {
        id: CLIENT_IDS[0],
        tenantId: TENANT_ID,
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
