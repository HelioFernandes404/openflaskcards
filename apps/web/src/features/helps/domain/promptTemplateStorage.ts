import type { PromptModuleTypeId } from './promptModules'

const TEMPLATE_KEY_PREFIX = 'pgTemplate:'

export function templateStorageKey(typeId: PromptModuleTypeId): string {
  return `${TEMPLATE_KEY_PREFIX}${typeId}`
}

export function loadPromptTemplate(
  typeId: PromptModuleTypeId,
  defaultTemplate: string,
): string {
  try {
    const raw = localStorage.getItem(templateStorageKey(typeId))
    if (!raw) return defaultTemplate
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' && parsed.trim()
      ? parsed
      : defaultTemplate
  } catch {
    return defaultTemplate
  }
}

export function savePromptTemplate(
  typeId: PromptModuleTypeId,
  template: string,
): void {
  localStorage.setItem(templateStorageKey(typeId), JSON.stringify(template))
}

export function resetPromptTemplate(typeId: PromptModuleTypeId): void {
  localStorage.removeItem(templateStorageKey(typeId))
}
