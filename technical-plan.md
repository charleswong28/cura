# Technical Design Document: Wecruit CRM

## 1. System Architecture
Wecruit follows a decoupled microservice architecture, separating the real-time business logic (TypeScript) from the heavy intelligence and data processing (Python).

### 1.1 Layers
* **Web Frontend:** Next.js (TypeScript) + Shadcn/ui.
* **API Gateway:** NestJS (TypeScript) - Handles business logic, Auth, and DB orchestration.
* **Real-time Engine:** Soketi (Self-hosted Pusher server) - Manages live updates.
* **Intelligence Services:** FastAPI (Python) - Different services handling CV parsing, LLM agents, vectorization, etc

---

## 2. Multi-Tenancy & Auth (Clerk Integration)
We utilize **Clerk Organizations** to manage tenants. Every headhunting firm is an `Organization`, and every user is a `Member`.

### 2.1 Tenant Context Flow
1. **JWT Custom Claim:** Configure the Clerk JWT to include `org_id` as `tenant_id`.
2. **NestJS Guard:** A custom `ClerkAuthGuard` verifies the token and attaches `req['tenantId']` to every request.
3. **Prisma Extension:** All database queries are automatically scoped via a Prisma Client extension.
   ```typescript
   // Example logic:
   // query.where = { ...query.where, tenant_id: req.tenantId }
   ```

---

## 3. Data Storage Strategy (Self-Hosted)
* **Primary DB:** PostgreSQL with TimescaleDB plugin. Stores structured data (Jobs, Candidates, Activities).
* **Vector DB:** Stores high-dimensional embeddings for semantic search/matching. Specific tool not decided yet depending on the need.
* **Message Broker:** Orchestrates background jobs like PDF parsing. Specific tool not decided yet depending on the need.


---

## 4. Key Module Designs

### 4.1 Intelligence Layer (Python)
**To be confirmed**

### 4.2 Real-time Pipeline
* **Tech:** NestJS + **Soketi**.
* **Flow:** When a candidate is dragged on the Kanban board, NestJS updates Postgres and emits a `candidate.moved` event. Soketi broadcasts this to all active recruiters in that organization.

## 4.3 API Layer: GraphQL Implementation
* **Framework:** NestJS + Apollo Server.
* **Schema Strategy:** **Code-First** (TypeScript classes define the GraphQL schema).
* **Performance:** **DataLoader** utility is used to batch database requests and prevent N+1 query issues.
* **Security:** GraphQL `Guards` verify the Clerk JWT and inject the `tenant_id` into the execution context.

## 4.4. Automated Codegen Pipeline
To ensure type safety from the Database to the UI, the following workflow is enforced:
1. **Prisma Generate:** Syncs the database schema with the TypeScript ORM client.
2. **NestJS GQL Schema:** Backend generates the `schema.gql` file on-the-fly.
3. **GraphQL Codegen:** Frontend scans the schema and produces typed hooks for `Next.js`.

---

## 5. Security & Compliance
* **Isolation:** Strict `tenant_id` enforcement at the database level ensures no data leakage between search firms on every table.
* **Encryption:** PII data is encrypted at rest using AES-256.
* **GDPR:** Automated data retention policies are executed via a NestJS Cron service that queries based on `last_activity_at`.

---

## 6. Implementation Roadmap
* **Phase 1:** Setup Docker Compose (Postgres, Qdrant, Redis, Soketi).
* **Phase 2:** NestJS + Clerk Auth Integration & Prisma Schema deployment.
* **Phase 3:** Frontend Next.js basic features and Kanban implementation.
* **Phase 4:** To be confirmed
