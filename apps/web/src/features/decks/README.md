# Decks Feature

## Responsibility

Manages deck creation, editing, deletion, and listing. Decks are collections of flashcards.

## Components

- `DeckItem` - Single deck card display with actions (study, edit, delete, add cards)
- `DeckSkeleton` - Loading skeleton for deck items
- `EditDeckModal` - Modal dialog for editing deck name and description

## Pages

- `CreateDeck` - Form to create new deck with name, description, and tags

## Types

- `deck.ts` - Deck interface with metadata (name, description, tags, counts)

## Services

(To be implemented - deck API service)

## Hooks

(To be implemented - deck-specific hooks if needed)

## Dependencies

- Cards feature (decks contain cards)
- Study feature (decks can be studied)
- Dashboard (shows deck list)

## Usage Example

```tsx
import { DeckItem } from '@/features/decks/components/DeckItem'
import type { Deck } from '@/features/decks/types/deck'

function DeckList({ decks }: { decks: Deck[] }) {
  return decks.map(deck => <DeckItem key={deck._id} {...deck} />)
}
```
