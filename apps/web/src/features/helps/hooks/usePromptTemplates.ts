import { useCallback, useEffect, useState } from 'react'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import type {
  PromptTemplate,
  PromptTemplateCreateInput,
  PromptTemplateUpdateInput,
} from '../types/promptTemplate'

export function usePromptTemplates() {
  const { studyService } = useStudyData()
  const { showToast } = useNotification()
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTemplates(await studyService.getPromptTemplates())
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'dashboard:errors.loadPromptTemplates',
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [studyService])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createTemplate = useCallback(
    async (data: PromptTemplateCreateInput) => {
      try {
        const template = await studyService.createPromptTemplate(data)
        setTemplates((prev) => [template, ...prev])
        return template
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.createPromptTemplate',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const updateTemplate = useCallback(
    async (templateId: string, data: PromptTemplateUpdateInput) => {
      try {
        const updated = await studyService.updatePromptTemplate(
          templateId,
          data,
        )
        setTemplates((prev) =>
          prev.map((item) => (item.id === templateId ? updated : item)),
        )
        return updated
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.updatePromptTemplate',
          }),
          'error',
        )
        return null
      }
    },
    [studyService, showToast],
  )

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        await studyService.deletePromptTemplate(templateId)
        setTemplates((prev) => prev.filter((item) => item.id !== templateId))
        return true
      } catch (err) {
        showToast(
          getUserFacingErrorMessage(err, {
            fallbackKey: 'dashboard:errors.deletePromptTemplate',
          }),
          'error',
        )
        return false
      }
    },
    [studyService, showToast],
  )

  return {
    templates,
    loading,
    error,
    refresh,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
