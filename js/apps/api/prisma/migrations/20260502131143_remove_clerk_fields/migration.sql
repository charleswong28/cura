-- DropIndex
DROP INDEX "tenants_clerk_org_id_key";

-- DropIndex
DROP INDEX "users_clerk_user_id_key";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "clerk_org_id";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "clerk_user_id",
DROP COLUMN "legacy_role";

-- DropEnum
DROP TYPE "OldUserRole";
