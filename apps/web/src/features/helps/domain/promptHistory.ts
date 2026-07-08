const MAX_HISTORY = 6

export function loadPromptHistory(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export function savePromptHistory(storageKey: string, term: string): void {
  const trimmed = term.trim()
  if (!trimmed) return
  const next = [
    trimmed,
    ...loadPromptHistory(storageKey).filter((item) => item !== trimmed),
  ].slice(0, MAX_HISTORY)
  localStorage.setItem(storageKey, JSON.stringify(next))
}
