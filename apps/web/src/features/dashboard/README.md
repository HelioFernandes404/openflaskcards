# Dashboard Feature

## Responsibility

Main dashboard showing overview of all decks, global statistics, and study progress visualization.

## Components

- `StatCard` - Displays a single statistic with icon and value (total cards, new, learning, review)
- `ProgressChart` - Pie chart showing card distribution by state

## Pages

- `Dashboard` - Main dashboard with deck list, stats, and search

## Hooks

- `useStudyData` — global deck/card state via `StudyDataProvider` (wraps app in `main.tsx`)
- `useNotification` — global toast host via `NotificationProvider`

Legacy alias: `useStudyDashboard` re-exports `useStudyData`.

## Dependencies

- Decks feature (displays and manages decks)
- Cards feature (shows card statistics)
- Auth feature (requires authentication)

## Features

- Deck search functionality
- Global statistics (total cards, new, learning, mastered)
- Quick actions (create deck, add cards, settings, profile)

## Usage Example

```tsx
// Route: /
import { Dashboard } from '@/features/dashboard/pages/Dashboard'
```
