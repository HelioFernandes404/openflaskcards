import { describe, expect, it, vi, beforeEach } from 'vitest'

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('@/shared/services/apiClient', () => ({
  httpClient: {
    post,
  },
}))

import { ApiStudyService } from './ApiStudyService'

describe('ApiStudyService.submitReview', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: { id: 'card-1' } })
  })

  it('sends reviewDurationMs in the review payload', async () => {
    const service = new ApiStudyService()

    await service.submitReview('card-1', 3, 12_500)

    expect(post).toHaveBeenCalledWith('/cards/card-1/review', {
      rating: 3,
      reviewDurationMs: 12_500,
    })
  })
})
