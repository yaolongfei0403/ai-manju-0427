// Seed script for default AI models

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

const DEFAULT_MODELS = [
  // LLM Models
  {
    type: "llm",
    code: "gpt4o",
    name: "GPT-4o",
    provider: "openai",
    description: "OpenAI 最新旗舰模型，支持多模态",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKey: process.env.OPENAI_API_KEY || "",
    modelName: "gpt-4o",
    status: "offline",
    env: "prod",
    maxTokens: 128000,
    temperature: 0.7,
    timeout: 30,
    retry: 3,
  },
  {
    type: "llm",
    code: "claude",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Anthropic 最强推理模型",
    endpoint: "https://api.anthropic.com/v1/messages",
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    modelName: "claude-3-5-sonnet-20241022",
    status: "offline",
    env: "prod",
    maxTokens: 200000,
    temperature: 0.5,
    timeout: 45,
    retry: 3,
  },
  {
    type: "llm",
    code: "deepseek",
    name: "DeepSeek-V3",
    provider: "deepseek",
    description: "国产大模型，性价比极高",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    modelName: "deepseek-chat",
    status: "offline",
    env: "prod",
    maxTokens: 64000,
    temperature: 0.7,
    timeout: 60,
    retry: 3,
  },
  // T2I Models
  {
    type: "t2i",
    code: "sdxl",
    name: "SDXL",
    provider: "custom",
    description: "Stability AI 开源可控模型",
    endpoint: "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    apiKey: process.env.STABILITY_API_KEY || "",
    modelName: "stable-diffusion-xl-1024-v1-0",
    status: "offline",
    env: "prod",
    resolution: "1024x1024",
    quality: "standard",
    timeout: 60,
    retry: 2,
  },
  {
    type: "t2i",
    code: "midjourney",
    name: "Midjourney V6",
    provider: "custom",
    description: "Midjourney 风格图像生成",
    endpoint: process.env.MIDJOURNEY_API_URL || "https://api.midjourney.com/v1/imagine",
    apiKey: process.env.MIDJOURNEY_API_KEY || "",
    modelName: "midjourney-v6",
    status: "offline",
    env: "prod",
    resolution: "1024x1792",
    quality: "standard",
    timeout: 120,
    retry: 2,
  },
  {
    type: "t2i",
    code: "dalle3",
    name: "DALL·E 3",
    provider: "openai",
    description: "OpenAI 图像生成模型",
    endpoint: "https://api.openai.com/v1/images/generations",
    apiKey: process.env.OPENAI_API_KEY || "",
    modelName: "dall-e-3",
    status: "offline",
    env: "prod",
    resolution: "1024x1024",
    quality: "hd",
    timeout: 60,
    retry: 2,
  },
  // I2V Models
  {
    type: "i2v",
    code: "runway",
    name: "Runway Gen-3",
    provider: "custom",
    description: "Runway 视频生成模型",
    endpoint: "https://api.runwayml.com/v1/generations",
    apiKey: process.env.RUNWAY_API_KEY || "",
    modelName: "gen-3-alpha-turbo",
    status: "offline",
    env: "prod",
    duration: 5,
    fps: 24,
    timeout: 300,
    retry: 1,
  },
  {
    type: "i2v",
    code: "pika",
    name: "Pika 1.5",
    provider: "custom",
    description: "Pika 创意视频生成",
    endpoint: process.env.PIKA_API_URL || "https://api.pika.art/v1/generate",
    apiKey: process.env.PIKA_API_KEY || "",
    modelName: "pika-1.5",
    status: "offline",
    env: "prod",
    duration: 5,
    fps: 24,
    timeout: 300,
    retry: 2,
  },
  {
    type: "i2v",
    code: "luma",
    name: "Luma Dream Machine",
    provider: "custom",
    description: "Luma AI 物理真实视频",
    endpoint: process.env.LUMA_API_URL || "https://api.lumalabs.ai/dream-machine/v1/generations",
    apiKey: process.env.LUMA_API_KEY || "",
    modelName: "dream-machine",
    status: "offline",
    env: "prod",
    duration: 5,
    fps: 24,
    timeout: 300,
    retry: 2,
  },
];

async function seed() {
  console.log("Starting seed...");

  const client = await pool.connect();

  try {
    // Check if models already exist
    const existing = await client.query(`SELECT code FROM "AIModel"`);
    const existingCodes = new Set(existing.rows.map((r) => r.code));

    for (const model of DEFAULT_MODELS) {
      if (existingCodes.has(model.code)) {
        console.log(`Skipping ${model.code} - already exists`);
        continue;
      }

      const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await client.query(
        `INSERT INTO "AIModel" (
          id, type, code, name, provider, description, endpoint,
          "apiKey", "modelName", status, env, "maxTokens", temperature,
          "systemPrompt", resolution, quality, duration, fps,
          timeout, retry, proxy, "customHeaders", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [
          id,
          model.type,
          model.code,
          model.name,
          model.provider,
          model.description,
          model.endpoint,
          model.apiKey || null,
          model.modelName || null,
          model.status,
          model.env,
          model.maxTokens || null,
          model.temperature || null,
          null, // systemPrompt
          model.resolution || null,
          model.quality || null,
          model.duration || null,
          model.fps || null,
          model.timeout,
          model.retry,
          null, // proxy
          null, // customHeaders
          now,
          now,
        ]
      );

      console.log(`Added model: ${model.name} (${model.code})`);
    }

    console.log("Seed completed!");
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
