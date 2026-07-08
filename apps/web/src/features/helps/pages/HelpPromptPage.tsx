import { useSearch } from '@tanstack/react-router'
import { PageHeader } from '@/shared/layout/PageHeader'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { PromptGeneratorPanel } from '../components/PromptGeneratorPanel'
import {
  DEFAULT_PROMPT_MODULE_TYPE_ID,
  isPromptModuleTypeId,
} from '../domain/promptModules'

export function HelpPromptPage() {
  const search = useSearch({ strict: false })
  const { modules } = useStudyData()
  const moduleIdFromUrl = search.module ?? null

  const linkedModule = moduleIdFromUrl
    ? (modules.find((module) => module.id === moduleIdFromUrl) ?? null)
    : null

  const initialModuleTypeId =
    linkedModule?.promptModuleTypeId ??
    (search.type && isPromptModuleTypeId(search.type)
      ? search.type
      : DEFAULT_PROMPT_MODULE_TYPE_ID)

  return (
    <div className="max-w-lg">
      <PageHeader
        className="mb-8"
        title="Prompt de imagem"
        subtitle="Gera o texto para criar a imagem do flashcard no ChatGPT"
      />

      {linkedModule && (
        <p className="mb-6 text-sm text-on-surface-variant">
          Module:{' '}
          <span className="font-medium text-on-surface">
            {linkedModule.name}
          </span>
        </p>
      )}

      <PromptGeneratorPanel
        key={`${moduleIdFromUrl ?? 'standalone'}-${initialModuleTypeId}`}
        initialModuleTypeId={initialModuleTypeId}
      />
    </div>
  )
}
