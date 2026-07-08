import { PROMPT_MODULE_TYPES, getDefaultPromptTemplate } from './promptModules'
import { loadPromptTemplate } from './promptTemplateStorage'
import type { PromptTemplateCreateInput } from '../types/promptTemplate'

const MIGRATION_KEY = 'pgTemplatesMigrated'

type CreateTemplateFn = (
  data: PromptTemplateCreateInput,
) => Promise<{ id: string } | null>

export async function importLegacyPromptTemplates(
  createTemplate: CreateTemplateFn,
  existingCount: number,
): Promise<void> {
  if (existingCount > 0) return
  if (localStorage.getItem(MIGRATION_KEY)) return

  let imported = false
  for (const type of PROMPT_MODULE_TYPES) {
    const defaultTemplate = getDefaultPromptTemplate(type.id)
    const body = loadPromptTemplate(type.id, defaultTemplate)
    if (body === defaultTemplate) continue

    const created = await createTemplate({
      name: `Imported (${type.label})`,
      body,
    })
    if (created) imported = true
  }

  if (imported) {
    localStorage.setItem(MIGRATION_KEY, '1')
  }
}
