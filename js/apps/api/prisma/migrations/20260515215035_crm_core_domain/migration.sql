/*
  Warnings:

  - You are about to drop the column `last_updated_by` on the `candidates` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ApplicationStageType" AS ENUM ('APPLIED', 'LONGLIST', 'CV_SENT', 'INTERVIEW', 'OFFER', 'PLACEMENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('BASIC', 'CONVERSATIONAL', 'PROFESSIONAL', 'NATIVE');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FLAT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('ACTIVE', 'CUTOVER', 'DISABLED');

-- DropIndex
DROP INDEX "candidates_tenant_id_idx";

-- DropIndex
DROP INDEX "clients_tenant_id_idx";

-- DropIndex
DROP INDEX "jobs_client_id_idx";

-- DropIndex
DROP INDEX "jobs_tenant_id_idx";

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "last_updated_by",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_by_id" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "active_job_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "total_job_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_by_id" TEXT;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "application_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "close_date" TIMESTAMP(3),
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "interview_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offer_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "open_date" TIMESTAMP(3),
ADD COLUMN     "placement_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_by_id" TEXT;

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "owner_user_id" TEXT,
    "created_by_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_experiences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_educations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_languages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "proficiency" "LanguageProficiency" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "source" TEXT,
    "owner_user_id" TEXT,
    "max_stage" "ApplicationStageType" NOT NULL DEFAULT 'APPLIED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "match_score" DECIMAL(5,2),
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "stage" "ApplicationStageType" NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entered_by_id" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "application_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "interviewer_user_id" TEXT,
    "feedback" TEXT,
    "rating" INTEGER,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2),
    "currency" TEXT DEFAULT 'USD',
    "signed_at" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "salary" DECIMAL(15,2),
    "currency" TEXT DEFAULT 'USD',
    "fee" DECIMAL(15,2),
    "fee_type" "FeeType",
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_table" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_model" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "checksum" TEXT,
    "migrated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_sync_cursors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_table" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00+00',
    "last_processed_id" BIGINT,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "gllue_schema_name" TEXT,
    "status" "MigrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "read_only" BOOLEAN NOT NULL DEFAULT true,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cutover_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_contacts_tenant_id_client_id_idx" ON "client_contacts"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "candidate_experiences_tenant_id_candidate_id_idx" ON "candidate_experiences"("tenant_id", "candidate_id");

-- CreateIndex
CREATE INDEX "candidate_educations_tenant_id_candidate_id_idx" ON "candidate_educations"("tenant_id", "candidate_id");

-- CreateIndex
CREATE INDEX "candidate_languages_tenant_id_candidate_id_idx" ON "candidate_languages"("tenant_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_languages_tenant_id_candidate_id_language_key" ON "candidate_languages"("tenant_id", "candidate_id", "language");

-- CreateIndex
CREATE INDEX "job_applications_tenant_id_job_id_is_active_idx" ON "job_applications"("tenant_id", "job_id", "is_active");

-- CreateIndex
CREATE INDEX "job_applications_tenant_id_max_stage_idx" ON "job_applications"("tenant_id", "max_stage");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_tenant_id_candidate_id_job_id_key" ON "job_applications"("tenant_id", "candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "application_stages_tenant_id_application_id_entered_at_idx" ON "application_stages"("tenant_id", "application_id", "entered_at");

-- CreateIndex
CREATE INDEX "interviews_tenant_id_application_id_idx" ON "interviews"("tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "offers_tenant_id_application_id_idx" ON "offers"("tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "placements_tenant_id_application_id_idx" ON "placements"("tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "migration_mappings_target_model_target_id_idx" ON "migration_mappings"("target_model", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "migration_mappings_source_table_source_id_tenant_id_key" ON "migration_mappings"("source_table", "source_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "migration_sync_cursors_tenant_id_source_table_key" ON "migration_sync_cursors"("tenant_id", "source_table");

-- CreateIndex
CREATE UNIQUE INDEX "migration_configs_tenant_id_key" ON "migration_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "candidates_tenant_id_deleted_at_idx" ON "candidates"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "clients_tenant_id_deleted_at_idx" ON "clients"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "clients_tenant_id_bd_user_id_idx" ON "clients"("tenant_id", "bd_user_id");

-- CreateIndex
CREATE INDEX "jobs_tenant_id_status_deleted_at_idx" ON "jobs"("tenant_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "jobs_tenant_id_client_id_idx" ON "jobs"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "jobs_tenant_id_owner_user_id_idx" ON "jobs"("tenant_id", "owner_user_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
