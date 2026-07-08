# Cards Feature

## Responsibility

Manages flashcard creation, editing, deletion, browsing, and display. Cards belong to decks.

## Components

- `CardItem` - Single card display showing front/back with edit/delete actions
- `EditCardModal` - Modal dialog for editing card front and back text

## Pages

- `AddCards` - Bulk card creation interface for a specific deck
- `BrowseCards` - Full-screen card browser with advanced filtering and editing

## Types

- `card.ts` - Card interface with FSRS metadata (stability, difficulty, state, reps)

## Services

Card data access goes through `IStudyService` (`ApiStudyService` in production, `FakeStudyService` in tests). Browse uses `getBrowseFilters` / `getBrowseCards`; import uses `bulkCreateCards`.

## Hooks

- `useBrowseCardsViewModel` — browse UI orchestration (filters, selection, editor auto-save)
- Domain logic lives in `domain/browseCatalog.ts` (pure functions, unit-tested)

## Dependencies

- Decks feature (cards belong to decks)
- Study feature (cards are studied using FSRS algorithm)

---

## Page Details

### AddCards (`/decks/:deckId/cards/add`)

**Purpose:** Bulk creation of flashcards for a specific deck

**Layout:**

- 12-column grid (4-4-4): Form | Preview | Card List
- Neobrutalism styling with shadows and bold borders
- Auto-save indicator in header
- Back button to Dashboard

**Features:**

- Target deck selection
- Card type toggle (Reading/Listening)
- Word/Phrase input with pronunciation field
- Meaning input (Portuguese) with yellow highlight
- Live preview with front/back card visualization
- Real-time card list for current deck

**Styling:**

- Uses existing neobrutalism components (Button, Card, Input, Textarea, Label)
- CSS variables from `src/index.css`
- Hard shadows, 2px borders, rounded corners
- Dark mode support

---

### BrowseCards (`/cards/browse`)

**Purpose:** Advanced card browser with filtering, search, and inline editing

**Layout:**

- Full-screen 3-panel layout: Sidebar | Table | Editor
- Left Sidebar (256px): Hierarchical filters
- Center Panel: Searchable card table
- Right Editor (450px): Inline card editor with formatting toolbar

**Features:**

**Sidebar:**

- Back to Dashboard button (top-left)
- Collapsible sections:
  - Saved Searches
  - Today (Due, Added, Edited, Studied, etc.)
  - Card State (New, Learning, Review, Suspended, Buried)
  - Decks (all user decks)
  - Note Types (Basic, Cloze)
  - Tags (Untagged)
- Sidebar filter search input

**Table:**

- Search bar with real-time filtering
- Sortable columns: Word, Type, Status, Deck
- Row selection to load card in editor
- Displays card type icons (BookOpen for reading cards)

**Editor:**

- Formatting toolbar (Bold, Italic, Underline, Superscript, Highlighter)
- Attachment tools (Paperclip, Mic, Functions)
- Front/Back field editors with collapsible headers
- Tags input field
- Fields/Cards buttons for advanced options
- Preview button

**Navigation:**

- Route: `/cards/browse`
- Access via Dashboard "Browse All Cards" button (Database icon)
- Full-screen mode (no App padding or dark mode toggle)
- Back button in sidebar returns to Dashboard

**Styling:**

- Neobrutalism design system
- Border-2, shadow-shadow, rounded-base
- Dark mode support via CSS variables
- Responsive layout (minimum 1024px width recommended)

**Data Flow:**

- Deck list and mutations via `StudyDataProvider` (`useStudyData`)
- Browse cards loaded through `IStudyService.getBrowseCards`
- Client-side search/sort via `browseCatalog` domain module

**State Management:**

- Selected card ID
- Sidebar filter selection
- Search query
- Editor field values (front, back, tags)

---

## Usage Example

```tsx
import { CardItem } from '@/features/cards/components/CardItem'
import type { Card } from '@/features/cards/types/card'

function CardList({ cards }: { cards: Card[] }) {
  return cards.map(card => (
    <CardItem
      key={card.id}
      {...card}
      onEdit={(id) => console.log('Edit', id)}
      onDelete={(id) => console.log('Delete', id)}
    />
  ))
}
```

## Navigation Flow

```
Dashboard (/)
  ├─ "Browse All Cards" button → /cards/browse (BrowseCards)
  │                                  └─ Back button → / (Dashboard)
  └─ Deck "Add Cards" action → /decks/:deckId/cards/add (AddCards)
                                   └─ Back button → / (Dashboard)
```
