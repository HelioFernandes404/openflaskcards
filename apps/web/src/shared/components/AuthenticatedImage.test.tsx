import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthenticatedImage } from './AuthenticatedImage'
import { apiClient } from '@/shared/services/apiClient'

vi.mock('@/shared/services/apiClient', () => ({
  apiClient: {
    getBlob: vi.fn(),
  },
}))

describe('AuthenticatedImage', () => {
  const createObjectURLMock = vi.fn(() => 'blob:mock-object-url')
  const revokeObjectURLMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })
    createObjectURLMock.mockClear()
    revokeObjectURLMock.mockClear()
    vi.mocked(apiClient.getBlob).mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when src is empty', () => {
    const { container } = render(<AuthenticatedImage src="" alt="empty" />)
    expect(container.firstChild).toBeNull()
  })

  it('fetches internal media URLs via the authenticated api client as a blob', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
    vi.mocked(apiClient.getBlob).mockResolvedValue({
      data: blob,
      status: 200,
      headers: new Headers(),
    })

    render(<AuthenticatedImage src="/api/v1/media/abc123" alt="card image" />)

    await waitFor(() => {
      expect(apiClient.getBlob).toHaveBeenCalledWith('/media/abc123')
    })

    const img = await screen.findByRole('img', { name: 'card image' })
    expect(img).toHaveAttribute('src', 'blob:mock-object-url')
    expect(createObjectURLMock).toHaveBeenCalledWith(blob)
  })

  it('renders external URLs directly without an authenticated fetch', () => {
    render(
      <AuthenticatedImage src="https://example.com/apple.png" alt="apple" />,
    )

    const img = screen.getByRole('img', { name: 'apple' })
    expect(img).toHaveAttribute('src', 'https://example.com/apple.png')
    expect(apiClient.getBlob).not.toHaveBeenCalled()
  })

  it('renders data: URLs directly without an authenticated fetch', () => {
    const dataUrl = 'data:image/png;base64,AAAA'
    render(<AuthenticatedImage src={dataUrl} alt="inline" />)

    const img = screen.getByRole('img', { name: 'inline' })
    expect(img).toHaveAttribute('src', dataUrl)
    expect(apiClient.getBlob).not.toHaveBeenCalled()
  })

  it('renders blob: URLs directly without an authenticated fetch', () => {
    const blobUrl = 'blob:http://localhost/abc-123'
    render(<AuthenticatedImage src={blobUrl} alt="blob image" />)

    const img = screen.getByRole('img', { name: 'blob image' })
    expect(img).toHaveAttribute('src', blobUrl)
    expect(apiClient.getBlob).not.toHaveBeenCalled()
  })

  it('revokes the object URL on unmount', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
    vi.mocked(apiClient.getBlob).mockResolvedValue({
      data: blob,
      status: 200,
      headers: new Headers(),
    })

    const { unmount } = render(
      <AuthenticatedImage src="/api/v1/media/abc123" alt="card image" />,
    )

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalled()
    })

    unmount()

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-object-url')
  })

  it('revokes the previous object URL when src changes', async () => {
    const blobA = new Blob(['a'], { type: 'image/png' })
    const blobB = new Blob(['b'], { type: 'image/png' })
    vi.mocked(apiClient.getBlob)
      .mockResolvedValueOnce({
        data: blobA,
        status: 200,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        data: blobB,
        status: 200,
        headers: new Headers(),
      })

    const { rerender } = render(
      <AuthenticatedImage src="/api/v1/media/aaa" alt="image" />,
    )

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    })

    rerender(<AuthenticatedImage src="/api/v1/media/bbb" alt="image" />)

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalledTimes(2)
    })

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-object-url')
  })

  it('does not refetch when only the onError callback identity changes', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
    vi.mocked(apiClient.getBlob).mockResolvedValue({
      data: blob,
      status: 200,
      headers: new Headers(),
    })

    const onErrorA = vi.fn()
    const onErrorB = vi.fn()
    const { container, rerender } = render(
      <AuthenticatedImage
        src="/api/v1/media/stable"
        alt="image"
        onError={onErrorA}
      />,
    )

    await waitFor(() => {
      expect(apiClient.getBlob).toHaveBeenCalledTimes(1)
    })

    rerender(
      <AuthenticatedImage
        src="/api/v1/media/stable"
        alt="image"
        onError={onErrorB}
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeInTheDocument()
    })

    expect(apiClient.getBlob).toHaveBeenCalledTimes(1)
    expect(onErrorA).not.toHaveBeenCalled()
    expect(onErrorB).not.toHaveBeenCalled()
  })
})
