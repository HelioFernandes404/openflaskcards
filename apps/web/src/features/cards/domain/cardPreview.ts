import type { Card, CardBack, CardFront } from '../types/card'

/** In-progress card fields shown in EditCardModal and live study preview. */
export interface CardEditDraft {
  front: string
  back: string
  phonetic: string
  imagemUrl?: string
}

export function cardToEditDraft(card: Card): CardEditDraft {
  return {
    front: card.front,
    back: card.back,
    phonetic: card.fonetica ?? '',
    imagemUrl: card.imagemUrl,
  }
}

export function draftsEqual(a: CardEditDraft, b: CardEditDraft): boolean {
  return (
    a.front === b.front &&
    a.back === b.back &&
    a.phonetic === b.phonetic &&
    a.imagemUrl === b.imagemUrl
  )
}

/** Builds the challenge-side card shape from unsaved edit draft values. */
export function buildPreviewFront(
  card: Pick<
    Card,
    'id' | 'deckId' | 'state' | 'reps' | 'audioUrl' | 'ttsEnabled'
  >,
  draft: CardEditDraft,
): CardFront {
  return {
    id: card.id,
    deckId: card.deckId,
    front: draft.front || '…',
    imagemUrl: draft.imagemUrl,
    audioUrl: card.audioUrl,
    ttsEnabled: card.ttsEnabled,
    state: card.state,
    reps: card.reps,
  }
}

/** Builds the answer-side card shape from unsaved edit draft values. */
export function buildPreviewBack(card: Card, draft: CardEditDraft): CardBack {
  return {
    id: card.id,
    deckId: card.deckId,
    front: draft.front || '…',
    back: draft.back || '…',
    phonetic: draft.phonetic.trim() || undefined,
    imagemUrl: draft.imagemUrl,
    audioUrl: card.audioUrl,
    ttsAudio: card.ttsAudio,
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due,
    lastReview: card.lastReview,
    state: card.state,
    reps: card.reps,
    lapses: card.lapses,
  }
}
