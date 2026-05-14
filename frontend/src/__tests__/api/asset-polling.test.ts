import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const TEST_JWT_SECRET = 'ai-manhua-dev-secret-key-2026'
const TEST_USER_ID = 'test-user-123'

function generateTestToken(userId: string): string {
  const jwt = require('jsonwebtoken')
  return jwt.sign({ sub: userId }, TEST_JWT_SECRET, { expiresIn: '1h' })
}

describe('GET /api/v1/assets/extract/[taskId] - Asset Extraction Polling', () => {
  const validToken = generateTestToken(TEST_USER_ID)

  beforeEach(() => {
    vi.resetModules()
  })

  it('should normalize FastAPI result.result.assets to top-level assets field', async () => {
    // Mock the axios module that the route uses
    vi.doMock('axios', () => ({
      default: {
        get: vi.fn().mockResolvedValue({
          data: {
            taskId: 'test-task-456',
            status: 'completed',
            progress: 100,
            result: {
              projectId: 'project-1',
              fileId: 'file-1',
              episodes: [1, 2],
              assets: {
                characters: [
                  { id: 'char-1', name: '李云', type: 'character', prompt: '年轻剑客', description: '主角' },
                ],
                scenes: [
                  { id: 'scene-1', name: '悬崖', type: 'scene', prompt: '悬崖远眺', description: '开场场景' },
                ],
                props: [
                  { id: 'prop-1', name: '青冥剑', type: 'prop', prompt: '古旧铁剑', description: '神兵利器' },
                ],
              },
              stats: { totalCharacters: 1, totalScenes: 1, totalProps: 1 },
              extractedAt: new Date().toISOString(),
            },
          },
        }),
      },
    }))

    // Dynamically import the route module to use the mocked axios
    const { GET } = await import('@/app/api/v1/assets/extract/[taskId]/route')

    // Create a mock NextRequest
    const request = new NextRequest('http://localhost:3000/api/v1/assets/extract/test-task-456', {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    })

    const response = await GET(request, { params: Promise.resolve({ taskId: 'test-task-456' }) })

    expect(response.status).toBe(200)
    const data = await response.json()

    // THE KEY FIX: assets should be extracted from result.result.assets to data.assets
    expect(data.data.taskId).toBe('test-task-456')
    expect(data.data.status).toBe('completed')
    expect(data.data.progress).toBe(100)

    expect(data.data.assets).toBeDefined()
    expect(data.data.assets.characters).toBeDefined()
    expect(data.data.assets.characters).toHaveLength(1)
    expect(data.data.assets.characters[0].name).toBe('李云')
    expect(data.data.assets.scenes).toHaveLength(1)
    expect(data.data.assets.scenes[0].name).toBe('悬崖')
    expect(data.data.assets.props).toHaveLength(1)
    expect(data.data.assets.props[0].name).toBe('青冥剑')

    expect(data.data.stats).toBeDefined()
    expect(data.data.stats.totalCharacters).toBe(1)
  })

  it('should return 401 when no authorization header is provided', async () => {
    const { GET } = await import('@/app/api/v1/assets/extract/[taskId]/route')

    const request = new NextRequest('http://localhost:3000/api/v1/assets/extract/test-task-456', {})
    const response = await GET(request, { params: Promise.resolve({ taskId: 'test-task-456' }) })

    expect(response.status).toBe(401)
  })

  it('should return 404 when task does not exist in FastAPI', async () => {
    // Mock error with the shape that axios.isAxiosError checks
    const mockError = Object.assign(new Error('Not found'), {
      response: { status: 404 },
      code: 'ERR_BAD_REQUEST',
      isAxiosError: true,
    })
    vi.doMock('axios', () => ({
      __esModule: true,
      default: {
        get: vi.fn().mockRejectedValue(mockError),
        isAxiosError: vi.fn((e: unknown) => !!(e && typeof e === 'object' && (e as any).isAxiosError)),
      },
      isAxiosError: vi.fn((e: unknown) => !!(e && typeof e === 'object' && (e as any).isAxiosError)),
    }))

    const { GET } = await import('@/app/api/v1/assets/extract/[taskId]/route')

    const request = new NextRequest('http://localhost:3000/api/v1/assets/extract/nonexistent-task', {
      headers: { authorization: `Bearer ${validToken}` },
    })
    const response = await GET(request, { params: Promise.resolve({ taskId: 'nonexistent-task' }) })

    expect(response.status).toBe(404)
  })
})
