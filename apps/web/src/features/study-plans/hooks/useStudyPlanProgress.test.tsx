import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { InMemoryStudyPlanCatalogAdapter } from '../adapters/in-memory/InMemoryStudyPlanCatalogAdapter'
import { InMemoryStudyPlanDatabase } from '../adapters/in-memory/InMemoryStudyPlanDatabase'
import { InMemoryStudyPlanSessionProgressAdapter } from '../adapters/in-memory/InMemoryStudyPlanSessionProgressAdapter'
import { createStudyPlanApplication } from '../application/studyPlanApplication'
import { createEmptyProgressRecord } from '../domain/studyPlanProgress'
import { StudyPlanProvider } from '../providers/StudyPlanProvider'
import { useStudyPlanProgress } from './useStudyPlanProgress'

function createTestWrapper() {
  const database = new InMemoryStudyPlanDatabase({
    plans: [
      {
        id: 'plan-1',
        userId: 'user-1',
        title: 'Daily English',
        level: 'B1',
        goal: 'work',
        goldenRule: '',
        flexibility: '',
        noFixedDeadline: true,
        steps: [
          { order: 1, activity: 'Flashcards', duration: '10m', notes: '' },
          { order: 2, activity: 'Writing', duration: '20m', notes: '' },
        ],
        progress: createEmptyProgressRecord(),
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-01T00:00:00Z',
      },
    ],
  })

  const application = createStudyPlanApplication({
    catalog: new InMemoryStudyPlanCatalogAdapter(database),
    sessionProgress: new InMemoryStudyPlanSessionProgressAdapter(database),
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <StudyPlanProvider application={application}>
        {children}
      </StudyPlanProvider>
    </QueryClientProvider>
  )
}

describe('useStudyPlanProgress', () => {
  it('loads session progress from the application layer', async () => {
    const wrapper = createTestWrapper()
    const { result } = renderHook(
      () => useStudyPlanProgress('plan-1', [1, 2]),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.daily.completedCount).toBe(0)
    expect(result.current.daily.totalXp).toBe(0)
  })

  it('persists toggled daily step through session progress use cases', async () => {
    const wrapper = createTestWrapper()
    const { result } = renderHook(
      () => useStudyPlanProgress('plan-1', [1, 2]),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    result.current.toggleStep(1)

    await waitFor(() => {
      expect(result.current.daily.completedCount).toBe(1)
    })
    expect(result.current.daily.totalXp).toBe(10)
  })
})
