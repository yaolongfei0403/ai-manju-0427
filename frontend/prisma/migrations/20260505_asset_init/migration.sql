-- Create Asset table
CREATE TABLE "Asset" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('character', 'scene', 'prop')),
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" VARCHAR(500),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on projectId and type
CREATE INDEX "Asset_projectId_type_idx" ON "Asset"("projectId", "type");
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");

-- Add foreign key constraint
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;

-- Create AssetEpisode join table
CREATE TABLE "AssetEpisode" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "assetId" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint to prevent duplicate asset-episode pairs
CREATE UNIQUE INDEX "AssetEpisode_assetId_episodeId_key" ON "AssetEpisode"("assetId", "episodeId");

-- Create indexes
CREATE INDEX "AssetEpisode_assetId_idx" ON "AssetEpisode"("assetId");
CREATE INDEX "AssetEpisode_episodeId_idx" ON "AssetEpisode"("episodeId");

-- Add foreign key constraints
ALTER TABLE "AssetEpisode" ADD CONSTRAINT "AssetEpisode_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE;

ALTER TABLE "AssetEpisode" ADD CONSTRAINT "AssetEpisode_episodeId_fkey"
    FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE;
