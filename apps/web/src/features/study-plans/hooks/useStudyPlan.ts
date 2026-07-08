import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { studyPlanQueryKeys } from '../application/studyPlanQueryKeys'
import { useStudyPlanApplication } from '../providers/StudyPlanProvider'

export function useStudyPlan(planId: string | undefined) {
  const application = useStudyPlanApplication()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showToast } = useNotification()

  const query = useQuery({
    queryKey: studyPlanQueryKeys.planDetail(planId ?? ''),
    queryFn: () => application.catalog.getPlanById(planId!),
    enabled: Boolean(planId),
  })

  useEffect(() => {
    if (!query.error) return
    showToast(
      getUserFacingErrorMessage(query.error, {
        fallbackKey: 'dashboard:errors.loadStudyPlan',
      }),
      'error',
    )
    navigate({ to: '/study-plans' })
  }, [query.error, showToast, navigate])

  useEffect(() => {
    if (!query.data || !planId) return
    queryClient.setQueryData(
      studyPlanQueryKeys.sessionProgress(planId),
      query.data.progress,
    )
  }, [query.data, planId, queryClient])

  return {
    plan: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
  }
}
