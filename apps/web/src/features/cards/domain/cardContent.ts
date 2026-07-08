import type { Card, CardFront } from '../types/card'

/** Maps a full card to the challenge-side shape used during study. */
export function buildCardFrontFromCard(card: Card): CardFront {
  const front: CardFront = {
    id: card.id,
    deckId: card.deckId,
    front: card.front,
    ttsEnabled: card.ttsEnabled,
    state: card.state,
    reps: card.reps,
  }

  if (card.audioUrl) front.audioUrl = card.audioUrl
  if (card.imagemUrl) front.imagemUrl = card.imagemUrl
  return front
}
