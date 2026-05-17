-- Add requirements field to jobs table (rich-text content stored as TEXT)
ALTER TABLE "jobs" ADD COLUMN "requirements" TEXT;
