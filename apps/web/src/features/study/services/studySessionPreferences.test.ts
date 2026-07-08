import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStorageStub } from '../../../../tests/support/createStorageStub'
import {
  getLastSessionSnapshot,
  getStudySessionPreferences,
  saveLastSessionSnapshot,
  saveStudySessionPreferences,
} from './studySessionPreferences'

describe('studySessionPreferences', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageStub())
  })

  it('returns defaults when nothing is stored', () => {
    expect(getStudySessionPreferences()).toEqual({
      soundEnabled: false,
      autoFlipEnabled: false,
      autoFlipSeconds: 8,
    })
  })

  it('persists and reloads preferences', () => {
    saveStudySessionPreferences({
      soundEnabled: true,
      autoFlipEnabled: true,
      autoFlipSeconds: 12,
    })

    expect(getStudySessionPreferences()).toEqual({
      soundEnabled: true,
      autoFlipEnabled: true,
      autoFlipSeconds: 12,
    })
  })

  it('stores the last session snapshot per deck', () => {
    saveLastSessionSnapshot({
      deckId: 'deck-1',
      totalCards: 10,
      timerSeconds: 120,
      successRate: 80,
      maxCombo: 4,
      finishedAt: '2024-01-01T00:00:00Z',
    })

    expect(getLastSessionSnapshot('deck-1')).toMatchObject({
      totalCards: 10,
      successRate: 80,
    })
    expect(getLastSessionSnapshot('deck-2')).toBeNull()
  })
})
