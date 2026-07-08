import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const getNoteMock = vi.fn()
const showToastMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ noteId: 'note-1' }),
  useRouter: () => ({ navigate: navigateMock }),
}))

vi.mock('@/features/study/providers/StudyDataProvider', () => ({
  useStudyData: () => ({
    studyService: { getNote: getNoteMock },
  }),
}))

vi.mock('@/shared/providers/NotificationProvider', () => ({
  useNotification: () => ({ showToast: showToastMock }),
}))

describe('NoteView', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    getNoteMock.mockReset()
    showToastMock.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads and displays note title and rendered markdown content', async () => {
    getNoteMock.mockResolvedValue({
      id: 'note-1',
      userId: 'user-1',
      title: 'My Note',
      content: 'Hello **world**',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })

    const { NoteView } = await import('./NoteView')
    render(<NoteView />)

    await waitFor(() =>
      expect(screen.getByTestId('note-view-page')).toBeInTheDocument(),
    )
    expect(screen.getByRole('heading', { name: 'My Note' })).toBeInTheDocument()
    expect(screen.getByText('world').tagName).toBe('STRONG')
  })

  it('navigates to edit route when Edit is clicked', async () => {
    getNoteMock.mockResolvedValue({
      id: 'note-1',
      userId: 'user-1',
      title: 'My Note',
      content: 'content',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })

    const { NoteView } = await import('./NoteView')
    render(<NoteView />)

    await waitFor(() =>
      expect(screen.getByTestId('note-view-edit-button')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByTestId('note-view-edit-button'))

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/notes/$noteId/edit',
      params: { noteId: 'note-1' },
    })
  })

  it('redirects to notes list when loading fails', async () => {
    getNoteMock.mockRejectedValue(new Error('not found'))

    const { NoteView } = await import('./NoteView')
    render(<NoteView />)

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({ to: '/notes' }),
    )
    expect(showToastMock).toHaveBeenCalled()
  })
})
