export const DEFAULT_PROMPT_CONTEXT_BLOCK = `Target word: "{{TARGET_WORD}}"
Sentence: "{{SENTENCE}}"`

export const BUILTIN_DEFAULT_PROMPT_TEMPLATE = `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational illustration for the English word \`{{TARGET_WORD}}\` in the context of the sentence \`{{SENTENCE}}\`.
{{styleBlock}}
The image should represent the meaning of the sentence and visually highlight the context of the target word in the scene.`

export const PROMPT_STYLE_BLOCK = `Visual Style:
- Educational illustration, clean, simple and friendly
- Clear strokes and readable shapes; avoid heavy photorealism
- Soft palette with good contrast; minimalist and neutral background

Composition:
- One main concept in focus; few elements, no visual clutter
- Centered framing, readable at small size (flashcard)
- Avoid complex scenes, multiple simultaneous actions or confusing cuts

Restrictions:
- No text, letters, numbers, captions or words in the image
- No logos, watermarks or elements unrelated to the concept`

export type PromptModuleTypeId =
  | 'visual-vocabulary'
  | 'idiom'
  | 'phrasal-verb'
  | 'context-scene'
  | 'abstract-concept'
  | 'listening'
  | 'grammar-pattern'

export interface PromptModuleType {
  id: PromptModuleTypeId
  label: string
  description: string
  inputLabel: string
  placeholder: string
  sentenceLabel: string
  sentencePlaceholder: string
  steps: readonly [string, string, string]
  historyStorageKey: string
}

export const PROMPT_MODULE_TYPES: PromptModuleType[] = [
  {
    id: 'visual-vocabulary',
    label: 'Visual Vocabulary',
    description: 'Single English word illustrated as a clear object or concept',
    inputLabel: 'Target word',
    placeholder: 'e.g. ephemeral',
    sentenceLabel: 'Sentence',
    sentencePlaceholder: 'e.g. The beauty of cherry blossoms is ephemeral.',
    steps: [
      'Type an English word',
      'Adjust template if needed',
      'Copy the prompt',
    ],
    historyStorageKey: 'pgHistory:visual-vocabulary',
  },
  {
    id: 'idiom',
    label: 'Idiom',
    description: 'Figurative expression shown through situation or metaphor',
    inputLabel: 'Target word',
    placeholder: 'e.g. break the ice',
    sentenceLabel: 'Sentence',
    sentencePlaceholder: 'e.g. He told a joke to break the ice at the meeting.',
    steps: ['Type an idiom', 'Adjust template if needed', 'Copy the prompt'],
    historyStorageKey: 'pgHistory:idiom',
  },
  {
    id: 'phrasal-verb',
    label: 'Phrasal Verb',
    description: 'Verb + particle pair shown as a readable action scene',
    inputLabel: 'Target word',
    placeholder: 'e.g. give up',
    sentenceLabel: 'Sentence',
    sentencePlaceholder: 'e.g. She refused to give up on her dream.',
    steps: [
      'Type a phrasal verb',
      'Adjust template if needed',
      'Copy the prompt',
    ],
    historyStorageKey: 'pgHistory:phrasal-verb',
  },
  {
    id: 'context-scene',
    label: 'Context Scene',
    description:
      'Short phrase or sentence turned into a situational illustration',
    inputLabel: 'Target word',
    placeholder: 'e.g. waiting for the bus',
    sentenceLabel: 'Sentence',
    sentencePlaceholder: 'e.g. We were waiting for the bus in the rain.',
    steps: [
      'Type a short phrase',
      'Adjust template if needed',
      'Copy the prompt',
    ],
    historyStorageKey: 'pgHistory:context-scene',
  },
  {
    id: 'abstract-concept',
    label: 'Abstract Concept',
    description:
      'Abstract word made concrete through symbol or visual metaphor',
    inputLabel: 'Target word',
    placeholder: 'e.g. freedom',
    sentenceLabel: 'Sentence',
    sentencePlaceholder:
      'e.g. Freedom means being able to choose your own path.',
    steps: [
      'Type an abstract word',
      'Adjust template if needed',
      'Copy the prompt',
    ],
    historyStorageKey: 'pgHistory:abstract-concept',
  },
  {
    id: 'listening',
    label: 'Listening',
    description:
      'Phrase or sentence illustrated as a scene that supports audio recall',
    inputLabel: 'Target word',
    placeholder: 'e.g. could you repeat that?',
    sentenceLabel: 'Sentence',
    sentencePlaceholder: 'e.g. Sorry, could you repeat that more slowly?',
    steps: [
      'Type a listening phrase',
      'Adjust template if needed',
      'Copy the prompt',
    ],
    historyStorageKey: 'pgHistory:listening',
  },
  {
    id: 'grammar-pattern',
    label: 'Grammar Pattern',
    description: 'Grammar structure shown in a natural, easy-to-read scene',
    inputLabel: 'Target word',
    placeholder: 'e.g. used to + verb',
    sentenceLabel: 'Sentence',
    sentencePlaceholder: 'e.g. I used to play soccer every weekend.',
    steps: [
      'Type a grammar pattern',
      'Adjust template if needed',
      'Copy the prompt',
    ],
    historyStorageKey: 'pgHistory:grammar-pattern',
  },
]

export const DEFAULT_PROMPT_TEMPLATES: Record<PromptModuleTypeId, string> = {
  'visual-vocabulary': `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational illustration that visually represents the English word \`{{TARGET_WORD}}\` in the context of the sentence \`{{SENTENCE}}\`.
{{styleBlock}}
Focus on the main meaning of the word, not decorative details.`,

  idiom: `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational illustration that visually represents the English idiom/expression \`{{TARGET_WORD}}\` in the context of the sentence \`{{SENTENCE}}\`.
{{styleBlock}}
Use clear visual metaphor — do not illustrate the words literally if the meaning is figurative.
Show the situation, emotion, or result that the idiom expresses.`,

  'phrasal-verb': `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational illustration that visually represents the English phrasal verb \`{{TARGET_WORD}}\` in the context of the sentence \`{{SENTENCE}}\`.
{{styleBlock}}
Show the action or situation that the verb describes immediately.
Make clear the movement or state caused by the verb and the particle.`,

  'context-scene': `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational scene illustration that shows the context of the English sentence \`{{SENTENCE}}\`.
{{styleBlock}}
The image should suggest the situation and meaning.
Use people, objects, and environment to convey the described moment.`,

  'abstract-concept': `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational illustration that makes concrete the abstract concept of the English word \`{{TARGET_WORD}}\` in the context of the sentence \`{{SENTENCE}}\`.
{{styleBlock}}
Use visual metaphor, contrast, or simple universal symbol.
Avoid overly literal scenes; prioritize a memorable mental image.`,

  listening: `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational scene illustration that supports a listening card with the English sentence \`{{SENTENCE}}\`.
{{styleBlock}}
The image should suggest the meaning and sonic context.
Use people, gestures, and environment to help remember what you hear in the sentence.`,

  'grammar-pattern': `${DEFAULT_PROMPT_CONTEXT_BLOCK}

Create an educational illustration that demonstrates the English grammar pattern \`{{TARGET_WORD}}\` in the context of the sentence \`{{SENTENCE}}\`.
{{styleBlock}}
Show the structure in use within a natural and easy-to-read scene.
Visually highlight the grammar idea without using text in the image.`,
}

export const DEFAULT_PROMPT_MODULE_TYPE_ID: PromptModuleTypeId =
  'visual-vocabulary'

export const PROMPT_MODULE_TYPE_IDS = PROMPT_MODULE_TYPES.map((type) => type.id)

export function isPromptModuleTypeId(
  value: string,
): value is PromptModuleTypeId {
  return (PROMPT_MODULE_TYPE_IDS as string[]).includes(value)
}

export function getPromptModuleType(id: PromptModuleTypeId): PromptModuleType {
  const type = PROMPT_MODULE_TYPES.find((item) => item.id === id)
  if (!type) {
    throw new Error(`Unknown prompt module type: ${id}`)
  }
  return type
}

export function getDefaultPromptTemplate(typeId: PromptModuleTypeId): string {
  return DEFAULT_PROMPT_TEMPLATES[typeId]
}

export interface PromptTemplateVars {
  targetWord: string
  sentence?: string
}

export function renderPromptTemplate(
  template: string,
  vars: PromptTemplateVars,
  styleBlock: string = PROMPT_STYLE_BLOCK,
): string {
  const trimmed = vars.targetWord.trim()
  if (!trimmed) return ''
  const sentence = (vars.sentence ?? trimmed).trim()
  return template
    .replaceAll('{{TARGET_WORD}}', trimmed)
    .replaceAll('{{SENTENCE}}', sentence)
    .replaceAll('{{term}}', trimmed)
    .replaceAll('{{styleBlock}}', styleBlock)
}

export function buildImagePrompt(
  word: string,
  template?: string,
  sentence?: string,
): string {
  const resolvedTemplate = template ?? BUILTIN_DEFAULT_PROMPT_TEMPLATE
  return renderPromptTemplate(resolvedTemplate, { targetWord: word, sentence })
}

export function buildModuleImagePrompt(
  typeId: PromptModuleTypeId,
  term: string,
  template?: string,
  sentence?: string,
): string {
  const resolvedTemplate = template ?? DEFAULT_PROMPT_TEMPLATES[typeId]
  return renderPromptTemplate(resolvedTemplate, {
    targetWord: term,
    sentence,
  })
}
