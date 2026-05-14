require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const sqlLLM = `INSERT INTO "AIModel" (id, type, code, name, provider, description, endpoint, "apiKey", "modelName", status, env, timeout, retry, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline', 'prod', 30, 3, NOW(), NOW())
ON CONFLICT (code) DO NOTHING`;

const sqlT2I = `INSERT INTO "AIModel" (id, type, code, name, provider, description, endpoint, "apiKey", "modelName", status, env, timeout, retry, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline', 'prod', 30, 3, NOW(), NOW())
ON CONFLICT (code) DO NOTHING`;

const sqlI2V = `INSERT INTO "AIModel" (id, type, code, name, provider, description, endpoint, "apiKey", "modelName", status, env, timeout, retry, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline', 'prod', 30, 3, NOW(), NOW())
ON CONFLICT (code) DO NOTHING`;

async function seed() {
  try {
    await pool.query(sqlLLM, ['test_claude', 'llm', 'claude', 'Claude 3.5 Sonnet', 'anthropic', 'Anthropic 最强推理模型', 'https://api.anthropic.com/v1/messages', '', 'claude-3-5-sonnet-20241022']);
    console.log('Inserted: claude');

    await pool.query(sqlT2I, ['test_sdxl', 't2i', 'sdxl', 'SDXL', 'custom', 'Stability AI 开源可控模型', 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', '', 'stable-diffusion-xl-1024-v1-0']);
    console.log('Inserted: sdxl');

    await pool.query(sqlI2V, ['test_runway', 'i2v', 'runway', 'Runway Gen-3', 'custom', 'Runway 视频生成模型', 'https://api.runwayml.com/v1/generations', '', 'gen-3-alpha-turbo']);
    console.log('Inserted: runway');

    console.log('Done!');
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await pool.end();
  }
}

seed();
