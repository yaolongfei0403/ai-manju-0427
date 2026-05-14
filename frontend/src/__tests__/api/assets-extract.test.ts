import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const TEST_JWT_SECRET = 'ai-manhua-dev-secret-key-2026'
const TEST_USER_ID = 'test-user-123'

function generateTestToken(userId: string): string {
  const jwt = require('jsonwebtoken')
  return jwt.sign({ sub: userId }, TEST_JWT_SECRET, { expiresIn: '1h' })
}

const postHandler = http.post('http://localhost:8000/api/v1/assets/extract', async ({ request }) => {
  const body = (await request.json()) as { projectId?: string; fileId?: string; episodes?: number[] } | null
  if (!body || !body.projectId || !body.fileId || !body.episodes) {
    return HttpResponse.json({ detail: 'Missing required fields' }, { status: 400 })
  }
  return HttpResponse.json({ taskId: `task-${Date.now()}`, status: 'processing' })
})

const server = setupServer(postHandler)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterAll(() => {
  server.close()
})

describe('POST /api/v1/assets/extract - Asset Extraction Trigger', () => {
  const validToken = generateTestToken(TEST_USER_ID)

  it('should return 401 when no authorization header is provided', async () => {
    const response = await fetch('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'project-1', fileId: 'file-1', episodes: [1, 2] }),
    })
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  it('should return 400 when required fields are missing', async () => {
    const response = await fetch('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-1' }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('缺少必要参数')
  })

  it('should return 400 when projectId is missing', async () => {
    const response = await fetch('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ fileId: 'file-1', episodes: [1, 2] }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return 400 when fileId is missing', async () => {
    const response = await fetch('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-1', episodes: [1, 2] }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return 400 when episodes is missing', async () => {
    const response = await fetch('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-1', fileId: 'file-1' }),
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return 202 when extraction is triggered successfully', async () => {
    const response = await fetch('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-1', fileId: 'file-1', episodes: [1, 2] }),
    })
    expect(response.status).toBe(202)
    const data = await response.json()
    expect(data.data).toHaveProperty('taskId')
    expect(data.data.status).toBe('processing')
  })

  it('should return 202 with taskId even without LLM config', async () => {
    const response = await fetch('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-without-llm', fileId: 'file-1', episodes: [1] }),
    })
    expect(response.status).toBe(202)
    const data = await response.json()
    expect(data.data).toHaveProperty('taskId')
  })
})
