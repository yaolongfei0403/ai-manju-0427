import { test, expect, Page } from '@playwright/test'

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
}

const TEST_PROJECT = {
  id: 'test-project-123',
  name: '测试项目',
}

const TEST_FILE = {
  id: 'test-file-456',
  name: 'test-novel.txt',
}

const TEST_SPLIT_RESULT = {
  episodes: [1, 2, 3],
}

// Helper to login via API (for test setup)
async function loginViaApi(page: Page, email: string, password: string): Promise<void> {
  // In a real test, you would call the login API
  // For now, we assume the user is already logged in or use UI login
  await page.goto('/login')
  await page.getByLabel('邮箱').fill(email)
  await page.getByLabel('密码').fill(password)
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForURL('**/projects')
}

// Helper to create auth token and set in localStorage
async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken)
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'test-user-123',
      email: 'test@example.com',
      name: '测试用户',
    }))
  }, token)
}

test.describe('资产提取流程 (Asset Extraction Flow)', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIn0.mock'
    await setAuthToken(page, mockToken)
  })

  test('should navigate to asset extraction page from upload flow', async ({ page }) => {
    // Navigate to upload page
    await page.goto('/upload/generate')

    // Should show the asset extraction interface
    await expect(page.getByRole('heading', { name: /资产提取|提取资产/ })).toBeVisible({ timeout: 10000 })
  })

  test('should display validation errors when required fields are missing', async ({ page }) => {
    await page.goto('/upload/generate')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Try to trigger extraction without selecting episodes
    const extractButton = page.getByRole('button', { name: /提取|开始提取/ })
    if (await extractButton.isVisible()) {
      await extractButton.click()

      // Should show validation error
      await expect(page.getByText(/请选择|缺少|必填/)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should trigger asset extraction and show progress', async ({ page }) => {
    // Navigate to upload page with pre-filled data
    await page.goto(`/upload/generate?projectId=${TEST_PROJECT.id}&fileId=${TEST_FILE.id}`)

    await page.waitForLoadState('networkidle')

    // Select episodes if there are episode selection checkboxes
    const episodeCheckboxes = page.locator('input[type="checkbox"][name*="episode"]')
    const checkboxCount = await episodeCheckboxes.count()

    if (checkboxCount > 0) {
      // Select first few episodes
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        await episodeCheckboxes.nth(i).check()
      }
    }

    // Find and click the extract button
    const extractButton = page.getByRole('button', { name: /提取|开始提取|确认提取/ })
    await expect(extractButton).toBeVisible({ timeout: 5000 })
    await extractButton.click()

    // Should show loading/progress state
    await expect(page.getByRole('status', { name: /提取中|处理中|加载/ })).toBeVisible({ timeout: 5000 })
  })

  test('should display extracted assets after successful extraction', async ({ page }) => {
    // Navigate to upload page
    await page.goto(`/upload/generate?projectId=${TEST_PROJECT.id}&fileId=${TEST_FILE.id}`)

    await page.waitForLoadState('networkidle')

    // Mock the API responses
    await page.route('**/api/v1/assets/extract', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            taskId: `task-${Date.now()}`,
            status: 'processing',
          },
        }),
      })
    })

    await page.route('**/api/v1/assets/extract/*', async (route) => {
      const taskId = route.request().url().split('/').pop()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            taskId,
            status: 'completed',
            progress: 100,
            result: {
              assets: {
                characters: [
                  { id: 'char-1', name: '角色A', type: 'character', prompt: 'a beautiful girl' },
                  { id: 'char-2', name: '角色B', type: 'character', prompt: 'a handsome boy' },
                ],
                scenes: [
                  { id: 'scene-1', name: '场景A', type: 'scene', prompt: 'a beautiful garden' },
                ],
                props: [
                  { id: 'prop-1', name: '道具A', type: 'prop', prompt: 'a magical sword' },
                ],
              },
            },
          },
        }),
      })
    })

    // Trigger extraction
    const extractButton = page.getByRole('button', { name: /提取|开始提取|确认提取/ })
    await extractButton.click()

    // Wait for completion and verify assets are displayed
    await expect(page.getByText(/角色A|角色B/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/场景A/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/道具A/)).toBeVisible({ timeout: 5000 })
  })

  test('should handle extraction error gracefully', async ({ page }) => {
    await page.goto(`/upload/generate?projectId=${TEST_PROJECT.id}&fileId=${TEST_FILE.id}`)

    await page.waitForLoadState('networkidle')

    // Mock API to return error
    await page.route('**/api/v1/assets/extract', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'LLM_ERROR',
            message: 'LLM服务错误',
          },
        }),
      })
    })

    // Trigger extraction
    const extractButton = page.getByRole('button', { name: /提取|开始提取|确认提取/ })
    await extractButton.click()

    // Should show error message
    await expect(page.getByText(/错误|失败|重试/)).toBeVisible({ timeout: 10000 })
  })

  test('should handle backend unavailable error', async ({ page }) => {
    await page.goto(`/upload/generate?projectId=${TEST_PROJECT.id}&fileId=${TEST_FILE.id}`)

    await page.waitForLoadState('networkidle')

    // Mock API to return service unavailable
    await page.route('**/api/v1/assets/extract', async (route) => {
      await route.abort('connectionrefused')
    })

    // Trigger extraction
    const extractButton = page.getByRole('button', { name: /提取|开始提取|确认提取/ })
    await extractButton.click()

    // Should show service unavailable error
    await expect(page.getByText(/服务未启动|后端服务/)).toBeVisible({ timeout: 10000 })
  })

  test('should poll for extraction progress updates', async ({ page }) => {
    await page.goto(`/upload/generate?projectId=${TEST_PROJECT.id}&fileId=${TEST_FILE.id}`)

    await page.waitForLoadState('networkidle')

    let pollCount = 0

    // Mock API - first call returns processing, second returns completed
    await page.route('**/api/v1/assets/extract', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            taskId: 'polling-task-123',
            status: 'processing',
          },
        }),
      })
    })

    await page.route('**/api/v1/assets/extract/polling-task-123', async (route) => {
      pollCount++
      if (pollCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              taskId: 'polling-task-123',
              status: 'processing',
              progress: 50,
            },
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              taskId: 'polling-task-123',
              status: 'completed',
              progress: 100,
              result: {
                assets: {
                  characters: [{ id: 'c1', name: 'Test', type: 'character', prompt: '' }],
                  scenes: [],
                  props: [],
                },
              },
            },
          }),
        })
      }
    })

    // Trigger extraction
    const extractButton = page.getByRole('button', { name: /提取|开始提取|确认提取/ })
    await extractButton.click()

    // Should show progress updates
    await expect(page.getByText(/50%|进行中/)).toBeVisible({ timeout: 10000 })

    // Should eventually show completion
    await expect(page.getByText(/完成|提取完成/)).toBeVisible({ timeout: 15000 })
  })
})

test.describe('资产库页面 (Asset Library Page)', () => {
  test.beforeEach(async ({ page }) => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIn0.mock'
    await setAuthToken(page, mockToken)
  })

  test('should navigate to asset library and view assets', async ({ page }) => {
    // Navigate to asset library
    await page.goto('/assets')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Should show asset categories
    await expect(page.getByRole('heading', { name: /资产库|资产/ })).toBeVisible({ timeout: 10000 })
  })

  test('should filter assets by type', async ({ page }) => {
    await page.goto('/assets')

    await page.waitForLoadState('networkidle')

    // Mock assets API
    await page.route('**/api/v1/assets*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: '1', name: '角色A', type: 'character', prompt: '' },
            { id: '2', name: '场景A', type: 'scene', prompt: '' },
            { id: '3', name: '道具A', type: 'prop', prompt: '' },
          ],
        }),
      })
    })

    // Wait for assets to load
    await page.waitForLoadState('networkidle')

    // Click on character filter if available
    const characterTab = page.getByRole('tab', { name: /角色|人物/ })
    if (await characterTab.isVisible()) {
      await characterTab.click()
      await expect(page.getByText('角色A')).toBeVisible({ timeout: 5000 })
    }
  })
})
