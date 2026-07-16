import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(__dirname, '../..')

function read(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

function expectTestIds(relativePath: string, testIds: string[]) {
  const source = read(relativePath)

  // Guardrail: the identifier string must exist in the committed source so
  // Playwright selectors stay valid. We accept any form the id may take —
  // `data-testid="x"`, a `testid: 'x'` config entry, or a `pageTestId="x"` prop —
  // since the testid still renders at runtime regardless of how it's passed.
  for (const testId of testIds) {
    expect(source).toContain(testId)
  }
}

describe('data-testid presence for main Playwright flows', () => {
  it('covers dashboard and deck flows', () => {
    expectTestIds('src/features/dashboard/pages/Dashboard.tsx', [
      'dashboard-page',
      'dashboard-search-input',
      'dashboard-create-deck-button',
    ])

    expectTestIds('src/features/decks/pages/CreateDeck.tsx', [
      'create-deck-page',
      'create-deck-form',
      'create-deck-name-input',
      'create-deck-submit-button',
    ])

    expectTestIds('src/features/decks/components/DeckTableRow.tsx', [
      'deck-item-',
      'deck-item-add-cards-button-',
      'deck-item-study-button-',
      'deck-item-copy-cli-button-',
    ])
  })

  it('covers card and study flows', () => {
    expectTestIds('src/features/cards/pages/BrowseCards.tsx', [
      'browse-cards-page',
    ])

    expectTestIds('src/features/cards/components/browse/BrowseSidebar.tsx', [
      'browse-sidebar',
      'browse-filter-all',
      'browse-filter-deck-',
    ])

    expectTestIds('src/features/cards/components/browse/CardTable.tsx', [
      'browse-card-table',
      'browse-filters-toggle',
    ])

    expectTestIds('src/features/cards/components/browse/CardTableRow.tsx', [
      'browse-card-row-',
    ])

    expectTestIds('src/features/cards/pages/AddCards.tsx', [
      'add-cards-page',
      'add-cards-deck-select',
      'add-cards-word-input',
      'add-cards-meaning-input',
      'add-cards-submit-button',
      'add-cards-list',
    ])

    expectTestIds('src/features/cards/components/CardItem.tsx', [
      'card-item-',
      'card-item-show-answer-button-',
      'card-item-edit-button-',
      'card-item-delete-button-',
    ])

    expectTestIds('src/features/study/components/CopyCardCliButton.tsx', [
      'study-session-copy-cli-button',
    ])

    expectTestIds('src/features/study/pages/StudySession.tsx', [
      'study-session-page',
      'study-session-edit-button',
      'study-session-show-answer-button',
    ])

    expectTestIds('src/features/study/components/ReviewRatingBar.tsx', [
      'study-session-review-again-button',
      'study-session-review-good-button',
    ])
  })

  it('covers profile flow', () => {
    expectTestIds('src/features/profile/pages/ProfilePage.tsx', [
      'profile-page',
      'profile-timezone-select',
    ])
  })

  it('covers algorithm settings optimization', () => {
    expectTestIds(
      'src/features/algorithm-settings/components/OptimizationPanel.tsx',
      [
        'fsrs-optimize-button',
        'fsrs-optimization-status',
        'fsrs-last-optimization',
      ],
    )
  })
})
