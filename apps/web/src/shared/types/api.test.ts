import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('shared type model', () => {
  it('does not export stale Deck or Card types from shared/types/api', () => {
    const source = readFileSync(resolve(__dirname, '../types/api.ts'), 'utf8')

    expect(source).not.toMatch(/export interface Deck\b/)
    expect(source).not.toMatch(/export interface Card\b/)
  })
})
