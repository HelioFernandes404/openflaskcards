import { HttpResponse, http } from 'msw'

const mockTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 900,
}

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  nickname: 'user',
  name: 'Mock User',
  isEmailVerified: true,
  provider: null,
  providers: [],
  fsrsParameters: [],
  desiredRetention: 0.9,
  optimizationStatus: 'idle',
  lastOptimization: null,
  timezone: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// Add per-endpoint handlers here as needed. Tests can also override
// with server.use(...) for one-off scenarios.
const mockPromptTemplates: Array<{
  id: string
  userId: string
  name: string
  body: string
  createdAt: string
  updatedAt: string
}> = []

export const handlers = [
  http.get('*/api/v1/health', () => HttpResponse.json({ status: 'ok' })),
  http.post('*/api/v1/auth/register', () =>
    HttpResponse.json(mockTokens, { status: 201 }),
  ),
  http.post('*/api/v1/auth/login', () => HttpResponse.json(mockTokens)),
  http.post('*/api/v1/auth/refresh', () => HttpResponse.json(mockTokens)),
  http.post('*/api/v1/auth/forgot-password', () =>
    HttpResponse.json({ message: 'ok' }),
  ),
  http.post(
    '*/api/v1/auth/reset-password',
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.get('*/api/v1/auth/me', () => HttpResponse.json(mockUser)),
  http.get('*/api/v1/users/me', () => HttpResponse.json(mockUser)),
  http.patch('*/api/v1/users/me', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...mockUser, ...body })
  }),
  http.get('*/api/v1/prompt-templates', () =>
    HttpResponse.json([...mockPromptTemplates]),
  ),
  http.get('*/api/v1/prompt-templates/:id', ({ params }) => {
    const template = mockPromptTemplates.find((item) => item.id === params.id)
    if (!template) {
      return HttpResponse.json(
        {
          code: 'PROMPT_TEMPLATE_NOT_FOUND',
          message: 'prompt template not found',
        },
        { status: 404 },
      )
    }
    return HttpResponse.json(template)
  }),
  http.post('*/api/v1/prompt-templates', async ({ request }) => {
    const body = (await request.json()) as { name: string; body: string }
    const template = {
      id: `prompt-template-${mockPromptTemplates.length + 1}`,
      userId: mockUser.id,
      name: body.name,
      body: body.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockPromptTemplates.unshift(template)
    return HttpResponse.json(template, { status: 201 })
  }),
  http.put('*/api/v1/prompt-templates/:id', async ({ params, request }) => {
    const index = mockPromptTemplates.findIndex((item) => item.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        {
          code: 'PROMPT_TEMPLATE_NOT_FOUND',
          message: 'prompt template not found',
        },
        { status: 404 },
      )
    }
    const body = (await request.json()) as { name?: string; body?: string }
    mockPromptTemplates[index] = {
      ...mockPromptTemplates[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(mockPromptTemplates[index])
  }),
  http.delete('*/api/v1/prompt-templates/:id', ({ params }) => {
    const index = mockPromptTemplates.findIndex((item) => item.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        {
          code: 'PROMPT_TEMPLATE_NOT_FOUND',
          message: 'prompt template not found',
        },
        { status: 404 },
      )
    }
    mockPromptTemplates.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
