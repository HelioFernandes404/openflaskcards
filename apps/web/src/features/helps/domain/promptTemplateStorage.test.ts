import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadPromptTemplate,
  resetPromptTemplate,
  savePromptTemplate,
  templateStorageKey,
} from './promptTemplateStorage'

describe('promptTemplateStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('builds a stable storage key per module type', () => {
    expect(templateStorageKey('idiom')).toBe('pgTemplate:idiom')
  })

  it('returns the default template when nothing is stored', () => {
    expect(loadPromptTemplate('visual-vocabulary', 'default body')).toBe(
      'default body',
    )
  })

  it('persists and reloads a custom template', () => {
    savePromptTemplate('visual-vocabulary', 'Custom {{term}}\n{{styleBlock}}')
    expect(loadPromptTemplate('visual-vocabulary', 'default body')).toBe(
      'Custom {{term}}\n{{styleBlock}}',
    )
  })

  it('stores templates independently per module type', () => {
    savePromptTemplate('idiom', 'idiom template')
    savePromptTemplate('listening', 'listening template')

    expect(loadPromptTemplate('idiom', 'default')).toBe('idiom template')
    expect(loadPromptTemplate('listening', 'default')).toBe(
      'listening template',
    )
  })

  it('ignores invalid stored values and falls back to default', () => {
    localStorage.setItem(templateStorageKey('idiom'), '123')
    expect(loadPromptTemplate('idiom', 'default')).toBe('default')
  })

  it('clears a custom template on reset', () => {
    savePromptTemplate('phrasal-verb', 'custom')
    resetPromptTemplate('phrasal-verb')
    expect(loadPromptTemplate('phrasal-verb', 'default')).toBe('default')
  })
})
