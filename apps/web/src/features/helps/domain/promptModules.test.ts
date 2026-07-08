import { describe, expect, it } from 'vitest'
import {
  BUILTIN_DEFAULT_PROMPT_TEMPLATE,
  buildImagePrompt,
  buildModuleImagePrompt,
  DEFAULT_PROMPT_CONTEXT_BLOCK,
  DEFAULT_PROMPT_TEMPLATES,
  getDefaultPromptTemplate,
  getPromptModuleType,
  isPromptModuleTypeId,
  PROMPT_MODULE_TYPES,
  PROMPT_STYLE_BLOCK,
  renderPromptTemplate,
} from './promptModules'

describe('builtin prompt template', () => {
  it('defines TARGET_WORD and SENTENCE placeholders', () => {
    expect(BUILTIN_DEFAULT_PROMPT_TEMPLATE).toContain('{{TARGET_WORD}}')
    expect(BUILTIN_DEFAULT_PROMPT_TEMPLATE).toContain('{{SENTENCE}}')
    expect(BUILTIN_DEFAULT_PROMPT_TEMPLATE).toContain('{{styleBlock}}')
    expect(BUILTIN_DEFAULT_PROMPT_TEMPLATE).toContain(
      DEFAULT_PROMPT_CONTEXT_BLOCK,
    )
    expect(BUILTIN_DEFAULT_PROMPT_TEMPLATE).toContain(
      'in the context of the sentence',
    )
  })

  it('returns empty prompt for blank input', () => {
    expect(buildImagePrompt('   ')).toBe('')
  })

  it('builds prompts with the trimmed word in both placeholders', () => {
    const prompt = buildImagePrompt('  apple  ')
    expect(prompt).toContain('Target word: "apple"')
    expect(prompt).toContain('Sentence: "apple"')
    expect(prompt).toContain('English word')
    expect(prompt).toContain('No text, letters')
  })

  it('uses a custom sentence when provided', () => {
    const prompt = buildImagePrompt(
      'apple',
      undefined,
      'I ate an apple for lunch.',
    )
    expect(prompt).toContain('Target word: "apple"')
    expect(prompt).toContain('Sentence: "I ate an apple for lunch."')
  })

  it('allows a custom template override', () => {
    const custom = 'Only {{TARGET_WORD}} and {{SENTENCE}}.'
    expect(buildImagePrompt('test', custom)).toBe('Only test and test.')
  })
})

describe('promptModules', () => {
  it('exposes one entry per module type', () => {
    expect(PROMPT_MODULE_TYPES).toHaveLength(7)
    expect(
      PROMPT_MODULE_TYPES.every(
        (type) => type.id && type.label && type.historyStorageKey,
      ),
    ).toBe(true)
  })

  it('validates known module type ids', () => {
    expect(isPromptModuleTypeId('idiom')).toBe(true)
    expect(isPromptModuleTypeId('unknown')).toBe(false)
  })

  it('returns empty module prompt for blank input', () => {
    expect(buildModuleImagePrompt('visual-vocabulary', '   ')).toBe('')
  })

  it('builds vocabulary prompts with the trimmed term', () => {
    const prompt = buildModuleImagePrompt('visual-vocabulary', '  apple  ')
    expect(prompt).toContain('Target word: "apple"')
    expect(prompt).toContain('Sentence: "apple"')
    expect(prompt).toContain('English word')
    expect(prompt).toContain('No text, letters')
  })

  it('builds vocabulary prompts with a separate sentence', () => {
    const prompt = buildModuleImagePrompt(
      'visual-vocabulary',
      'ephemeral',
      undefined,
      'The beauty of cherry blossoms is ephemeral.',
    )
    expect(prompt).toContain('Target word: "ephemeral"')
    expect(prompt).toContain(
      'Sentence: "The beauty of cherry blossoms is ephemeral."',
    )
  })

  it('builds idiom prompts with figurative guidance', () => {
    const prompt = buildModuleImagePrompt('idiom', 'break the ice')
    expect(prompt).toContain('Target word: "break the ice"')
    expect(prompt).toContain('clear visual metaphor')
  })

  it('builds phrasal verb prompts with action guidance', () => {
    const prompt = buildModuleImagePrompt('phrasal-verb', 'give up')
    expect(prompt).toContain('Target word: "give up"')
    expect(prompt).toContain('phrasal verb')
  })

  it('builds context scene prompts for short phrases', () => {
    const prompt = buildModuleImagePrompt(
      'context-scene',
      'waiting for the bus',
    )
    expect(prompt).toContain('Target word: "waiting for the bus"')
    expect(prompt).toContain('educational scene illustration')
  })

  it('builds abstract concept prompts with metaphor guidance', () => {
    const prompt = buildModuleImagePrompt('abstract-concept', 'freedom')
    expect(prompt).toContain('Target word: "freedom"')
    expect(prompt).toContain('abstract concept')
  })

  it('builds listening prompts with audio context guidance', () => {
    const prompt = buildModuleImagePrompt('listening', 'could you repeat that?')
    expect(prompt).toContain('Target word: "could you repeat that?"')
    expect(prompt).toContain('listening')
  })

  it('builds grammar pattern prompts with structure guidance', () => {
    const prompt = buildModuleImagePrompt('grammar-pattern', 'used to + verb')
    expect(prompt).toContain('Target word: "used to + verb"')
    expect(prompt).toContain('grammar pattern')
  })

  it('resolves module metadata by id', () => {
    expect(getPromptModuleType('idiom').label).toBe('Idiom')
  })
})

describe('renderPromptTemplate', () => {
  it('returns empty string for blank target word', () => {
    expect(
      renderPromptTemplate('Hello {{TARGET_WORD}}', { targetWord: '   ' }),
    ).toBe('')
  })

  it('substitutes TARGET_WORD, SENTENCE, and styleBlock placeholders', () => {
    const result = renderPromptTemplate(
      'Word: `{{TARGET_WORD}}` in `{{SENTENCE}}`\n{{styleBlock}}',
      { targetWord: '  apple  ', sentence: 'I ate an apple' },
      'STYLE',
    )
    expect(result).toBe('Word: `apple` in `I ate an apple`\nSTYLE')
  })

  it('defaults sentence to targetWord when sentence is omitted', () => {
    const result = renderPromptTemplate('{{TARGET_WORD}} / {{SENTENCE}}', {
      targetWord: 'apple',
    })
    expect(result).toBe('apple / apple')
  })

  it('uses the shared style block by default', () => {
    const result = renderPromptTemplate('{{TARGET_WORD}}\n{{styleBlock}}', {
      targetWord: 'test',
    })
    expect(result).toContain('test')
    expect(result).toContain(PROMPT_STYLE_BLOCK)
  })

  it('keeps {{term}} as an alias for TARGET_WORD', () => {
    expect(
      renderPromptTemplate('{{term}} {{extra}}', { targetWord: 'x' }),
    ).toBe('x {{extra}}')
  })

  it('leaves unknown placeholders intact', () => {
    expect(
      renderPromptTemplate('{{TARGET_WORD}} {{extra}}', { targetWord: 'x' }),
    ).toBe('x {{extra}}')
  })
})

describe('default prompt templates', () => {
  it('defines a default template for every module type', () => {
    for (const type of PROMPT_MODULE_TYPES) {
      const template = getDefaultPromptTemplate(type.id)
      expect(template).toContain('{{TARGET_WORD}}')
      expect(template).toContain('{{SENTENCE}}')
      expect(template).toContain('{{styleBlock}}')
      expect(template).toContain(DEFAULT_PROMPT_CONTEXT_BLOCK)
      expect(DEFAULT_PROMPT_TEMPLATES[type.id]).toBe(template)
    }
  })

  it('allows buildModuleImagePrompt to use a custom template override', () => {
    const custom = 'Only {{term}} here.'
    expect(buildModuleImagePrompt('idiom', 'test', custom)).toBe(
      'Only test here.',
    )
  })
})
