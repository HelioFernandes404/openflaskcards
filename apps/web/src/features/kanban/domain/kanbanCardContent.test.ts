import { describe, expect, it } from 'vitest'
import {
  kanbanDescriptionPreview,
  splitKanbanDescription,
} from './kanbanCardContent'

describe('splitKanbanDescription', () => {
  it.each([
    {
      name: 'plain Done condition: line',
      input: `Context about the bug in handler.go

Done condition: cd apps/api && make test passes`,
      body: 'Context about the bug in handler.go',
      doneCondition: 'cd apps/api && make test passes',
    },
    {
      name: 'markdown ## Done condition header',
      input: `## Context
Files: \`apps/api/internal/kanban\`

## Done condition
\`\`\`bash
cd apps/api && make test
\`\`\`
Expected: TestX passes.`,
      body: `## Context
Files: \`apps/api/internal/kanban\``,
      doneCondition: `\`\`\`bash
cd apps/api && make test
\`\`\`
Expected: TestX passes.`,
    },
    {
      name: 'case-insensitive Done condition header',
      input: `Some context

DONE CONDITION:
npm run test:unit`,
      body: 'Some context',
      doneCondition: 'npm run test:unit',
    },
    {
      name: 'no done condition keeps full text in body',
      input: 'Just a plain description without criteria.',
      body: 'Just a plain description without criteria.',
      doneCondition: null,
    },
    {
      name: 'empty description',
      input: '',
      body: '',
      doneCondition: null,
    },
    {
      name: 'done condition only',
      input: 'Done condition: make check passes',
      body: '',
      doneCondition: 'make check passes',
    },
  ])('$name', ({ input, body, doneCondition }) => {
    expect(splitKanbanDescription(input)).toEqual({ body, doneCondition })
  })
})

describe('kanbanDescriptionPreview', () => {
  it('returns first non-empty line of body stripped of markdown markers', () => {
    const description = `## Context
Fix the **login** bug

Done condition: make test`
    expect(kanbanDescriptionPreview(description)).toBe('Fix the login bug')
  })

  it('falls back to plain text when body is empty', () => {
    expect(kanbanDescriptionPreview('Done condition: only criteria')).toBe(
      'only criteria',
    )
  })

  it('returns empty string for blank description', () => {
    expect(kanbanDescriptionPreview('')).toBe('')
  })
})
