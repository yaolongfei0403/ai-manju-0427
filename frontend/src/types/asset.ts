// Asset Types

export type AssetType = "character" | "scene" | "prop";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  prompt: string;
  description?: string;
  projectId: string;
  episodeIds: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExtractedAssets {
  characters: Asset[];
  scenes: Asset[];
  props: Asset[];
}

export interface ExtractTaskResult {
  taskId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  assets: ExtractedAssets;
  stats?: {
    totalCharacters: number;
    totalScenes: number;
    totalProps: number;
  };
  dbAssetIds?: {
    characters: string[];
    scenes: string[];
    props: string[];
  };
  source?: "database"; // present when served from DB fallback
  error?: {
    code: string;
    message: string;
  };
}