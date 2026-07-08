import type { Deck } from '@/features/decks/types/deck'

/** Subset of the Deck type that holds FSRS/quota stats (all optional since they come from stats merge). */
interface DeckWithStats {
  newCount?: number
  learnCount?: number
  reviewCount?: number
  newCardsStudiedToday?: number
  newCardsDailyLimit?: number
}

export interface DeckTodayCounts {
  newCount: number
  learnCount: number
  reviewCount: number
  /** New cards available today, capped by the daily quota. */
  availableNewToday: number
  remainingQuota: number
}

/**
 * Computes today's quota-aware card counts for a deck.
 * Single source of truth — reused by DeckTableRow and StudyTodayPanel.
 */
export function getDeckTodayCounts(deck: DeckWithStats): DeckTodayCounts {
  const newCount = deck.newCount ?? 0
  const learnCount = deck.learnCount ?? 0
  const reviewCount = deck.reviewCount ?? 0
  const newCardsStudiedToday = deck.newCardsStudiedToday ?? 0
  const newCardsDailyLimit = deck.newCardsDailyLimit ?? 10
  const remainingQuota = Math.max(0, newCardsDailyLimit - newCardsStudiedToday)
  const availableNewToday = Math.min(newCount, remainingQuota)
  return {
    newCount,
    learnCount,
    reviewCount,
    availableNewToday,
    remainingQuota,
  }
}

/** Cards ready to study now: quota-capped new + due learning + due review. */
export function getDeckDueToday(deck: DeckWithStats): number {
  const { availableNewToday, learnCount, reviewCount } =
    getDeckTodayCounts(deck)
  return availableNewToday + learnCount + reviewCount
}

/** Cards due today across a list of decks. */
export function getSectionDueCount(decks: Deck[]): number {
  return decks.reduce((sum, deck) => sum + getDeckDueToday(deck), 0)
}
