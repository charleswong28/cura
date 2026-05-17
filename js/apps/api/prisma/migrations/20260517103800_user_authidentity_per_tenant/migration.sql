-- Allow one AuthIdentity to map to multiple Users (one per tenant).
-- Replaces the global unique on users.auth_identity_id with a composite
-- unique on (tenant_id, auth_identity_id) so the same person can be a
-- member of multiple tenants.

DROP INDEX "users_auth_identity_id_key";

CREATE UNIQUE INDEX "users_tenant_id_auth_identity_id_key" ON "users"("tenant_id", "auth_identity_id");

CREATE INDEX "users_auth_identity_id_idx" ON "users"("auth_identity_id");
