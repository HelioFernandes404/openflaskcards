# Study Feature

## Responsibility

Manages spaced repetition study sessions using FSRS v6 algorithm. Handles card review, rating, and scheduling.

## Components

- `ForgettingCurveChart` - Visualization of forgetting curve based on card stability

## Pages

- `StudySession` - Interactive study interface for reviewing cards with rating buttons

## Services

- `StudyService` - Abstract study service interface
- `ApiStudyService` - API implementation for fetching review previews and submitting reviews

## Types

- `review.ts` - ReviewPreview and ReviewPreviewOption interfaces for FSRS algorithm output

## Hooks

(To be implemented - study session state management)

## Dependencies

- Cards feature (reviews cards)
- Decks feature (studies cards from a specific deck)
- Algorithm Settings (uses FSRS parameters)

## FSRS Algorithm

Uses Free Spaced Repetition Scheduler v6 with configurable parameters:

- Stability, Difficulty, Retrievability
- 4 rating options: Again (1), Hard (2), Good (3), Easy (4)

## Usage Example

```tsx
import { StudySession } from '@/features/study/pages/StudySession'

// Route: /decks/:deckId/study
```
