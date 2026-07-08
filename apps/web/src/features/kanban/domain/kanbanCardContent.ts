const DONE_CONDITION_PATTERN =
  /(?:^|\n)\s*(?:#{1,3}\s*)?done\s+condition\s*:?\s*\n?([\s\S]*)$/i

export function splitKanbanDescription(description: string): {
  body: string
  doneCondition: string | null
} {
  const trimmed = description.trim()
  if (!trimmed) return { body: '', doneCondition: null }

  const match = trimmed.match(DONE_CONDITION_PATTERN)
  if (!match) return { body: trimmed, doneCondition: null }

  const body = trimmed.slice(0, match.index).trim()
  const doneCondition = match[1].trim()
  return {
    body,
    doneCondition: doneCondition || null,
  }
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

export function kanbanDescriptionPreview(description: string): string {
  const { body, doneCondition } = splitKanbanDescription(description)
  const source = body || doneCondition || ''
  if (!source) return ''

  const firstLine = source.split('\n').find((rawLine) => {
    const trimmed = rawLine.trim()
    if (!trimmed) return false
    if (/^#{1,6}\s/.test(trimmed)) return false
    return stripMarkdownInline(trimmed).length > 0
  })

  return firstLine ? stripMarkdownInline(firstLine.trim()) : ''
}
