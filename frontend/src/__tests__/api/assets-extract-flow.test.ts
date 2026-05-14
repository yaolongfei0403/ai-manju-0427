import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const TEST_JWT_SECRET = 'ai-manhua-dev-secret-key-2026'
const TEST_USER_ID = 'test-user-123'

function generateTestToken(userId: string): string {
  const jwt = require('jsonwebtoken')
  return jwt.sign({ sub: userId }, TEST_JWT_SECRET, { expiresIn: '1h' })
}

// In-memory task storage (shared between mock axios and route)
const mockTasks: Record<string, any> = {}

describe('Asset Extraction Flow - Full Data Output', () => {
  const validToken = generateTestToken(TEST_USER_ID)

  beforeEach(() => {
    // Clear tasks before each test
    Object.keys(mockTasks).forEach(key => delete mockTasks[key])

    // Mock axios to simulate FastAPI responses
    vi.doMock('axios', () => ({
      default: {
        get: vi.fn().mockImplementation(async (url: string) => {
          const taskId = url.split('/').pop()
          console.log('\n========== [Axios GET /assets/extract/' + taskId + '] ==========')
          console.log('📥 Task ID:', taskId)

          const task = mockTasks[taskId]
          if (!task) {
            console.log('❌ Task not found')
            console.log('==========================================\n')
            throw Object.assign(new Error('Task not found'), {
              response: { status: 404 },
              code: 'ERR_BAD_REQUEST',
              isAxiosError: true
            })
          }

          // Simulate progress: 0 -> 5 -> 10 -> 90 -> 100
          if (task.progress < 5) {
            task.progress = 5
            task.current_step = 'reading_file'
          } else if (task.progress < 10) {
            task.progress = 10
            task.current_step = 'extracting'
          } else if (task.progress < 90) {
            task.progress = 90
            task.current_step = 'formatting'
          } else {
            task.progress = 100
            task.status = 'completed'
            task.result = {
              projectId: task.result?.projectId || 'project-1',
              fileId: task.result?.fileId || 'file-1',
              episodes: task.result?.episodes || [1, 2],
              assets: {
                characters: [
                  { id: 'char-1', name: '李云', type: 'character', prompt: '年轻剑客，白衣胜雪', description: '主角' },
                  { id: 'char-2', name: '苏雪', type: 'character', prompt: '神秘女子，白裙飘逸', description: '女主角' },
                ],
                scenes: [
                  { id: 'scene-1', name: '悬崖', type: 'scene', prompt: '悬崖远眺，云海翻涌', description: '开场场景' },
                  { id: 'scene-2', name: '藏书阁', type: 'scene', prompt: '古老藏书阁，卷卷泛黄', description: '发现秘密' },
                ],
                props: [
                  { id: 'prop-1', name: '青冥剑', type: 'prop', prompt: '古旧铁剑，蓝光隐隐', description: '神兵利器' },
                ],
              },
              stats: { totalCharacters: 2, totalScenes: 2, totalProps: 1 },
              extractedAt: new Date().toISOString(),
            }
          }

          console.log('📊 Status:', task.status, '| Progress:', task.progress + '%')
          if (task.status === 'completed') {
            console.log('📦 Assets extracted:')
            console.log('   Characters:', task.result.assets.characters.map((c: any) => c.name).join(', '))
            console.log('   Scenes:', task.result.assets.scenes.map((s: any) => s.name).join(', '))
            console.log('   Props:', task.result.assets.props.map((p: any) => p.name).join(', '))
          }
          if (task.error) {
            console.log('❌ Error:', task.error.message)
          }
          console.log('📤 Response:', JSON.stringify(task, null, 2))
          console.log('==========================================\n')

          return { data: task }
        }),
        post: vi.fn().mockImplementation(async (url: string, body: any) => {
          console.log('\n========== [Axios POST /assets/extract] ==========')
          console.log('📥 Request body:', JSON.stringify(body, null, 2))

          if (!body.projectId || !body.fileId || !body.episodes) {
            console.log('❌ Validation failed: missing required fields')
            return { data: { detail: 'Missing required fields' }, status: 400 }
          }

          const taskId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          mockTasks[taskId] = {
            taskId,
            status: 'processing',
            progress: 0,
            result: {
              projectId: body.projectId,
              fileId: body.fileId,
              episodes: body.episodes,
            },
            error: null,
            created_at: new Date().toISOString(),
          }

          console.log('✅ Task created:', taskId)
          console.log('📤 Response:', JSON.stringify({ taskId, status: 'processing' }, null, 2))
          console.log('==========================================\n')

          return { data: { taskId, status: 'processing' } }
        }),
        isAxiosError: vi.fn((e: unknown) => !!(e && typeof e === 'object' && (e as any).isAxiosError)),
      },
      __esModule: true,
      isAxiosError: vi.fn((e: unknown) => !!(e && typeof e === 'object' && (e as any).isAxiosError)),
    }))
  })

  it('should log full POST trigger data and response', async () => {
    console.log('\n' + '='.repeat(60))
    console.log('TEST: POST /api/v1/assets/extract - Full Data Output')
    console.log('='.repeat(60))

    const { POST } = await import('@/app/api/v1/assets/extract/route')
    const request = new NextRequest('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-1', fileId: 'file-1', episodes: [1, 2] }),
    })

    const response = await POST(request)
    const data = await response.json()

    console.log('\n📍 Frontend API Response status:', response.status)
    console.log('📍 Frontend API Response body:', JSON.stringify(data, null, 2))

    expect(response.status).toBe(202)
    expect(data.data).toHaveProperty('taskId')
    expect(data.data.status).toBe('processing')

    // Store taskId for next test
    ;(global as any).lastTaskId = data.data.taskId

    console.log('\n✅ POST test completed successfully\n')
  })

  it('should log full GET polling flow with data normalization', async () => {
    // First trigger to create a task - use route directly so mockTasks is shared
    const { POST } = await import('@/app/api/v1/assets/extract/route')
    const triggerRequest = new NextRequest('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-1', fileId: 'file-1', episodes: [1, 2] }),
    })
    const triggerResponse = await POST(triggerRequest)
    const triggerData = await triggerResponse.json()
    const taskId = triggerData.data.taskId

    console.log('\n' + '='.repeat(60))
    console.log('TEST: GET /api/v1/assets/extract/{taskId} - Full Polling Flow')
    console.log('='.repeat(60))
    console.log('\n📍 Task ID from trigger:', taskId)

    const { GET } = await import('@/app/api/v1/assets/extract/[taskId]/route')

    // Poll multiple times to see progress
    let lastResponse: any = null
    let lastData: any = null
    for (let i = 0; i < 5; i++) {
      const request = new NextRequest(`http://localhost:3000/api/v1/assets/extract/${taskId}`, {
        headers: { 'Authorization': `Bearer ${validToken}` },
      })

      lastResponse = await GET(request, { params: Promise.resolve({ taskId }) })
      lastData = await lastResponse.json()

      console.log(`\n📍 Poll #${i + 1} - Status: ${lastResponse.status}`)
      console.log('📍 Poll response:', JSON.stringify(lastData, null, 2))

      if (lastData.data?.status === 'completed') {
        console.log('\n✅ Extraction completed! Final normalized assets:')
        console.log('   Characters:', lastData.data.assets?.characters?.length || 0)
        console.log('   Scenes:', lastData.data.assets?.scenes?.length || 0)
        console.log('   Props:', lastData.data.assets?.props?.length || 0)
        break
      }

      if (lastData.data?.status === 'failed') {
        console.log('\n❌ Extraction failed:', lastData.data.error?.message)
        break
      }
    }

    expect(lastResponse.status).toBe(200)
    expect(lastData.data.status).toBe('completed')
    expect(lastData.data.assets).toBeDefined()
    expect(lastData.data.assets.characters).toHaveLength(2)
    expect(lastData.data.assets.scenes).toHaveLength(2)
    expect(lastData.data.assets.props).toHaveLength(1)
    console.log('\n✅ GET test completed successfully\n')
  })

  it('should return 401 when no authorization header is provided', async () => {
    console.log('\n' + '='.repeat(60))
    console.log('TEST: POST without auth - Should return 401')
    console.log('='.repeat(60))

    const { POST } = await import('@/app/api/v1/assets/extract/route')
    const request = new NextRequest('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'project-1', fileId: 'file-1', episodes: [1, 2] }),
    })

    const response = await POST(request)
    const data = await response.json()

    console.log('\n📍 Response status:', response.status)
    console.log('📍 Response body:', JSON.stringify(data, null, 2))
    expect(response.status).toBe(401)
    console.log('\n✅ 401 test completed\n')
  })

  it('should return 400 when required fields are missing', async () => {
    console.log('\n' + '='.repeat(60))
    console.log('TEST: POST with missing fields - Should return 400')
    console.log('='.repeat(60))

    const { POST } = await import('@/app/api/v1/assets/extract/route')
    const request = new NextRequest('http://localhost:3000/api/v1/assets/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ projectId: 'project-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    console.log('\n📍 Response status:', response.status)
    console.log('📍 Response body:', JSON.stringify(data, null, 2))
    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    console.log('\n✅ Validation test completed\n')
  })
})
