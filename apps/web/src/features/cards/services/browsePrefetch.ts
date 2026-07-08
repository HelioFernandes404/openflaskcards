import type { Card } from '@/features/cards/types/card'
import type { BrowseFiltersResponse } from '@/features/cards/types/browse'
import type { IStudyService } from '@/services'

interface BrowsePrefetchSnapshot {
  filters: BrowseFiltersResponse
  cards: Card[]
  fetchedAt: number
}

const TTL_MS = 30_000

let snapshot: BrowsePrefetchSnapshot | null = null
let inflight: Promise<BrowsePrefetchSnapshot> | null = null

export function prefetchBrowseData(studyService: IStudyService): void {
  if (snapshot && Date.now() - snapshot.fetchedAt < TTL_MS) return
  if (inflight) return

  inflight = Promise.all([
    studyService.getBrowseFilters(),
    studyService.getBrowseCards(),
  ])
    .then(([filters, cards]) => {
      snapshot = { filters, cards, fetchedAt: Date.now() }
      return snapshot
    })
    .finally(() => {
      inflight = null
    })
}

export function takeBrowsePrefetch(): {
  filters: BrowseFiltersResponse
  cards: Card[]
} | null {
  if (!snapshot || Date.now() - snapshot.fetchedAt > TTL_MS) {
    snapshot = null
    return null
  }

  const data = { filters: snapshot.filters, cards: snapshot.cards }
  snapshot = null
  return data
}

export function invalidateBrowsePrefetch(): void {
  snapshot = null
}
