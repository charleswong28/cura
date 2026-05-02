-- CreateEnum
CREATE TYPE "OldUserRole" AS ENUM ('ADMIN', 'RECRUITER');

-- CreateEnum
CREATE TYPE "TeamKind" AS ENUM ('BUSINESS', 'REGION', 'PRACTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEAD', 'MEMBER');

-- CreateEnum
CREATE TYPE "DataScopeType" AS ENUM ('ALL', 'TEAM_TREE', 'MY_TEAMS', 'MINE', 'EXPLICIT');

-- CreateEnum
CREATE TYPE "GranteeType" AS ENUM ('USER', 'TEAM', 'ROLE');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'EDIT', 'OWNER');

-- CreateEnum
CREATE TYPE "GrantSource" AS ENUM ('DIRECT', 'INHERITED', 'RULE', 'APPROVAL');

-- CreateEnum
CREATE TYPE "GrantAction" AS ENUM ('GRANT', 'UPGRADE', 'DOWNGRADE', 'REVOKE');

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "owner_user_id" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "bd_user_id" TEXT,
ADD COLUMN     "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "owner_user_id" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "slug" TEXT NOT NULL,
ALTER COLUMN "clerk_org_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "auth_identity_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "first_login" TIMESTAMP(3),
ADD COLUMN     "last_inactive_at" TIMESTAMP(3),
ADD COLUMN     "legacy_role" "OldUserRole" DEFAULT 'RECRUITER',
ADD COLUMN     "loginable" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "clerk_user_id" DROP NOT NULL;

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "oidc_subject" TEXT,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "mfa_enrolled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "auth_identity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_devices" (
    "id" TEXT NOT NULL,
    "auth_identity_id" TEXT NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "backup_codes_hashed" TEXT[],
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified_at" TIMESTAMP(3),

    CONSTRAINT "mfa_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "auth_identity_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" TEXT NOT NULL,
    "auth_identity_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "min_length" INTEGER NOT NULL DEFAULT 8,
    "require_upper" BOOLEAN NOT NULL DEFAULT true,
    "require_lower" BOOLEAN NOT NULL DEFAULT true,
    "require_digit" BOOLEAN NOT NULL DEFAULT true,
    "require_symbol" BOOLEAN NOT NULL DEFAULT false,
    "history_size" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "password_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "short_id" SERIAL NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "builtin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_data_scopes" (
    "role_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "data_scope" "DataScopeType" NOT NULL,

    CONSTRAINT "role_data_scopes_pkey" PRIMARY KEY ("role_id","resource_type")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "short_id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "kind" "TeamKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id","user_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "grantee_type" "GranteeType" NOT NULL,
    "grantee_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "access_level" "AccessLevel" NOT NULL,
    "grant_source" "GrantSource" NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_grants" (
    "id" TEXT NOT NULL,
    "permission_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "grantee_type" "GranteeType" NOT NULL,
    "grantee_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "action" "GrantAction" NOT NULL,
    "from_level" "AccessLevel",
    "to_level" "AccessLevel",
    "reason" TEXT,
    "actor_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_cascade_rules" (
    "id" TEXT NOT NULL,
    "from_resource_type" TEXT NOT NULL,
    "to_resource_type" TEXT NOT NULL,
    "min_access_level" "AccessLevel" NOT NULL,
    "grant_level" "AccessLevel" NOT NULL,

    CONSTRAINT "permission_cascade_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_inheritances" (
    "parent_permission_id" TEXT NOT NULL,
    "child_grantee_type" "GranteeType" NOT NULL,
    "child_grantee_id" TEXT NOT NULL,

    CONSTRAINT "permission_inheritances_pkey" PRIMARY KEY ("parent_permission_id","child_grantee_type","child_grantee_id")
);

-- CreateTable
CREATE TABLE "share_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "access_level" "AccessLevel" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "actor_id" TEXT,
    "actor_type" TEXT NOT NULL DEFAULT 'USER',
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_email_key" ON "auth_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_oidc_subject_key" ON "auth_identities"("oidc_subject");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_auth_identity_id_idx" ON "sessions"("auth_identity_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "mfa_devices_auth_identity_id_idx" ON "mfa_devices"("auth_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_auth_identity_id_idx" ON "password_reset_tokens"("auth_identity_id");

-- CreateIndex
CREATE INDEX "password_history_auth_identity_id_idx" ON "password_history"("auth_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_policies_tenant_id_key" ON "password_policies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_short_id_key" ON "roles"("short_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_short_id_key" ON "teams"("short_id");

-- CreateIndex
CREATE INDEX "teams_tenant_id_kind_idx" ON "teams"("tenant_id", "kind");

-- CreateIndex
CREATE INDEX "permissions_tenant_id_resource_type_resource_id_idx" ON "permissions"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "permissions_grantee_id_tenant_id_resource_type_idx" ON "permissions"("grantee_id", "tenant_id", "resource_type");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_grantee_type_grantee_id_resource_type_key" ON "permissions"("tenant_id", "grantee_type", "grantee_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "permission_grants_resource_type_resource_id_occurred_at_idx" ON "permission_grants"("resource_type", "resource_id", "occurred_at");

-- CreateIndex
CREATE INDEX "permission_grants_grantee_id_occurred_at_idx" ON "permission_grants"("grantee_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "permission_cascade_rules_from_resource_type_to_resource_typ_key" ON "permission_cascade_rules"("from_resource_type", "to_resource_type");

-- CreateIndex
CREATE UNIQUE INDEX "share_tokens_token_hash_key" ON "share_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "share_tokens_tenant_id_resource_type_resource_id_idx" ON "share_tokens"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_resource_type_resource_id_idx" ON "audit_logs"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_actor_id_occurred_at_idx" ON "audit_logs"("tenant_id", "actor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_identity_id_key" ON "users"("auth_identity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_auth_identity_id_fkey" FOREIGN KEY ("auth_identity_id") REFERENCES "auth_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_auth_identity_id_fkey" FOREIGN KEY ("auth_identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_devices" ADD CONSTRAINT "mfa_devices_auth_identity_id_fkey" FOREIGN KEY ("auth_identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_auth_identity_id_fkey" FOREIGN KEY ("auth_identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_auth_identity_id_fkey" FOREIGN KEY ("auth_identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_data_scopes" ADD CONSTRAINT "role_data_scopes_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_bd_user_id_fkey" FOREIGN KEY ("bd_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
