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
const getLetterMock = vi.fn()
const getDueCardsSummaryMock = vi.fn()
const showToastMock = vi.fn()
const studyServiceMock = { getLetter: getLetterMock }

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ letterId: 'letter-1' }),
  useRouter: () => ({ navigate: navigateMock }),
}))

vi.mock('@/features/study/providers/StudyDataProvider', () => ({
  useStudyData: () => ({
    decks: [{ id: 'deck-1', name: 'Vocab Deck' }],
    studyService: studyServiceMock,
    getDueCardsSummary: getDueCardsSummaryMock,
  }),
}))

vi.mock('@/shared/providers/NotificationProvider', () => ({
  useNotification: () => ({ showToast: showToastMock }),
}))

const sampleLetter = {
  id: 'letter-1',
  userId: 'user-1',
  title: 'Breaking The Habit',
  artist: 'Linkin Park',
  originalLyrics: 'Memories consume\nLike opening the wound',
  translation: 'Memórias consomem\nComo se abrissem a ferida',
  deckId: 'deck-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
}

describe('LetterView', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    getLetterMock.mockReset()
    getDueCardsSummaryMock.mockReset()
    showToastMock.mockClear()
    getLetterMock.mockResolvedValue(sampleLetter)
  })

  afterEach(() => {
    cleanup()
  })

  it('loads lyrics in both columns by default', async () => {
    const { LetterView } = await import('./LetterView')
    render(<LetterView />)

    await waitFor(() =>
      expect(screen.getByTestId('letter-view-page')).toBeInTheDocument(),
    )
    expect(
      screen.getByRole('heading', { name: 'Breaking The Habit' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Memories consume')).toBeInTheDocument()
    expect(screen.getByText('Memórias consomem')).toBeInTheDocument()
  })

  it('shows only english lines in english mode', async () => {
    const { LetterView } = await import('./LetterView')
    render(<LetterView />)

    await waitFor(() =>
      expect(screen.getByText('Memories consume')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByTestId('letter-view-mode-english'))

    expect(screen.getByText('Memories consume')).toBeInTheDocument()
    expect(screen.queryByText('Memórias consomem')).not.toBeInTheDocument()
  })

  it('reveals a translation line on demand in reveal mode', async () => {
    const { LetterView } = await import('./LetterView')
    render(<LetterView />)

    await waitFor(() =>
      expect(screen.getByText('Memories consume')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByTestId('letter-view-mode-reveal'))

    expect(screen.queryByText('Memórias consomem')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('letter-line-reveal-0'))

    expect(screen.getByText('Memórias consomem')).toBeInTheDocument()
  })

  it('reveals every translation from the toolbar', async () => {
    const { LetterView } = await import('./LetterView')
    render(<LetterView />)

    await waitFor(() =>
      expect(screen.getByText('Memories consume')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByTestId('letter-view-mode-reveal'))
    fireEvent.click(screen.getByTestId('letter-reveal-all'))

    expect(screen.getByText('Memórias consomem')).toBeInTheDocument()
    expect(screen.getByText('Como se abrissem a ferida')).toBeInTheDocument()
  })

  it('navigates to edit route when Edit is clicked', async () => {
    const { LetterView } = await import('./LetterView')
    render(<LetterView />)

    await waitFor(() =>
      expect(screen.getByTestId('letter-view-edit-button')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByTestId('letter-view-edit-button'))

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/letters/$letterId/edit',
      params: { letterId: 'letter-1' },
    })
  })
})
