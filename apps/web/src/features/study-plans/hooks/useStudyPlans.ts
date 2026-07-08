import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useNotification } from '@/shared/providers/NotificationProvider'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { studyPlanQueryKeys } from '../application/studyPlanQueryKeys'
import type {
  StudyPlan,
  StudyPlanCreateInput,
  StudyPlanUpdateInput,
} from '../domain/studyPlan'
import { useStudyPlanApplication } from '../providers/StudyPlanProvider'

export function syncSessionProgressAcrossQueryCache(
  queryClient: ReturnType<typeof useQueryClient>,
  planId: string,
  progress: StudyPlan['progress'],
) {
  queryClient.setQueryData<StudyPlan>(
    studyPlanQueryKeys.planDetail(planId),
    (current) => (current ? { ...current, progress } : current),
  )
  queryClient.setQueryData<StudyPlan[]>(
    studyPlanQueryKeys.planList(),
    (current) =>
      current?.map((plan) =>
        plan.id === planId ? { ...plan, progress } : plan,
      ),
  )
}

export function useStudyPlans() {
  const application = useStudyPlanApplication()
  const queryClient = useQueryClient()
  const { showToast } = useNotification()

  const listQuery = useQuery({
    queryKey: studyPlanQueryKeys.planList(),
    queryFn: () => application.catalog.listPlans(),
  })

  const createMutation = useMutation({
    mutationFn: (data: StudyPlanCreateInput) =>
      application.catalog.createPlan(data),
    onSuccess: (plan) => {
      queryClient.setQueryData<StudyPlan[]>(
        studyPlanQueryKeys.planList(),
        (current) => (current ? [plan, ...current] : [plan]),
      )
      queryClient.setQueryData(studyPlanQueryKeys.planDetail(plan.id), plan)
      queryClient.setQueryData(
        studyPlanQueryKeys.sessionProgress(plan.id),
        plan.progress,
      )
    },
    onError: (err) => {
      showToast(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'dashboard:errors.createStudyPlan',
        }),
        'error',
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      planId,
      data,
    }: {
      planId: string
      data: StudyPlanUpdateInput
    }) => application.catalog.updatePlan(planId, data),
    onSuccess: (plan) => {
      queryClient.setQueryData(studyPlanQueryKeys.planDetail(plan.id), plan)
      queryClient.setQueryData<StudyPlan[]>(
        studyPlanQueryKeys.planList(),
        (current) =>
          current?.map((item) => (item.id === plan.id ? plan : item)),
      )
    },
    onError: (err) => {
      showToast(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'dashboard:errors.updateStudyPlan',
        }),
        'error',
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => application.catalog.deletePlan(planId),
    onSuccess: (_, planId) => {
      queryClient.setQueryData<StudyPlan[]>(
        studyPlanQueryKeys.planList(),
        (current) => current?.filter((plan) => plan.id !== planId),
      )
      queryClient.removeQueries({
        queryKey: studyPlanQueryKeys.planDetail(planId),
      })
      queryClient.removeQueries({
        queryKey: studyPlanQueryKeys.sessionProgress(planId),
      })
    },
    onError: (err) => {
      showToast(
        getUserFacingErrorMessage(err, {
          fallbackKey: 'dashboard:errors.deleteStudyPlan',
        }),
        'error',
      )
    },
  })

  const refresh = useCallback(async () => {
    await listQuery.refetch()
  }, [listQuery])

  const createStudyPlan = useCallback(
    async (data: StudyPlanCreateInput) => {
      try {
        return await createMutation.mutateAsync(data)
      } catch {
        return null
      }
    },
    [createMutation],
  )

  const updateStudyPlan = useCallback(
    async (planId: string, data: StudyPlanUpdateInput) => {
      try {
        return await updateMutation.mutateAsync({ planId, data })
      } catch {
        return null
      }
    },
    [updateMutation],
  )

  const deleteStudyPlan = useCallback(
    async (planId: string) => {
      await deleteMutation.mutateAsync(planId)
    },
    [deleteMutation],
  )

  return {
    plans: listQuery.data ?? [],
    loading: listQuery.isLoading,
    error: listQuery.error
      ? getUserFacingErrorMessage(listQuery.error, {
          fallbackKey: 'dashboard:errors.loadStudyPlans',
        })
      : null,
    refresh,
    createStudyPlan,
    updateStudyPlan,
    deleteStudyPlan,
  }
}
