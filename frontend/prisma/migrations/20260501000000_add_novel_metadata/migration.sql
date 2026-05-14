-- Migration: Add novel metadata fields
-- Date: 2026-05-01

-- Add metadata columns to NovelFile table
ALTER TABLE "NovelFile" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "NovelFile" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "NovelFile" ADD COLUMN IF NOT EXISTS "author" TEXT;
ALTER TABLE "NovelFile" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "NovelFile" ADD COLUMN IF NOT EXISTS "style" TEXT;

-- Add index for projectId lookups
CREATE INDEX IF NOT EXISTS "NovelFile_projectId_idx" ON "NovelFile"("projectId");
CREATE INDEX IF NOT EXISTS "NovelFile_userId_idx" ON "NovelFile"("userId");