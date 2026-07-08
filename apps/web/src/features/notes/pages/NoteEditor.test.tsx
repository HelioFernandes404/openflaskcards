import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

const navigateMock = vi.fn()
const createNoteMock = vi.fn()
const updateNoteMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({}),
  useRouter: () => ({ navigate: navigateMock }),
}))

vi.mock('../hooks/useNotes', () => ({
  useNotes: () => ({
    createNote: createNoteMock,
    updateNote: updateNoteMock,
  }),
}))

vi.mock('@/features/study/providers/StudyDataProvider', () => ({
  useStudyData: () => ({
    studyService: { getNote: vi.fn() },
  }),
}))

vi.mock('@/shared/providers/NotificationProvider', () => ({
  useNotification: () => ({ showToast: vi.fn() }),
}))

describe('NoteEditor', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    createNoteMock.mockReset()
    updateNoteMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('does not navigate away when saving fails (createNote returns null)', async () => {
    createNoteMock.mockResolvedValue(null)
    const { NoteEditor } = await import('./NoteEditor')

    render(<NoteEditor />)

    fireEvent.change(screen.getByTestId('note-title-input'), {
      target: { value: 'My note' },
    })
    fireEvent.click(screen.getByTestId('note-editor-submit-button'))

    await waitFor(() => expect(createNoteMock).toHaveBeenCalled())
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('navigates to note view when saving succeeds', async () => {
    createNoteMock.mockResolvedValue({
      id: 'note-1',
      title: 'My note',
      content: '',
    })
    const { NoteEditor } = await import('./NoteEditor')

    render(<NoteEditor />)

    fireEvent.change(screen.getByTestId('note-title-input'), {
      target: { value: 'My note' },
    })
    fireEvent.click(screen.getByTestId('note-editor-submit-button'))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/notes/$noteId',
        params: { noteId: 'note-1' },
      }),
    )
  })
})
