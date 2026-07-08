import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { studyPlanQueryKeys } from '../application/studyPlanQueryKeys'
import type { StudyPlan } from '../domain/studyPlan'
import {
  createEmptyProgressRecord,
  getDailyProgress,
  toggleStepCompletion,
  type StudyPlanDailyProgress,
  type StudyPlanProgressRecord,
} from '../domain/studyPlanProgress'
import { useStudyPlanApplication } from '../providers/StudyPlanProvider'
import { syncSessionProgressAcrossQueryCache } from './useStudyPlans'

interface UseStudyPlanProgressResult {
  daily: StudyPlanDailyProgress
  loading: boolean
  toggleStep: (stepOrder: number) => ToggleStepOutcome
}

export interface ToggleStepOutcome {
  gainedXp: number
  reachedDailyWin: boolean
  reachedFullSession: boolean
  completed: boolean
}

function readCachedSessionProgress(
  queryClient: ReturnType<typeof useQueryClient>,
  planId: string,
): StudyPlanProgressRecord | undefined {
  const cachedProgress = queryClient.getQueryData<StudyPlanProgressRecord>(
    studyPlanQueryKeys.sessionProgress(planId),
  )
  if (cachedProgress) return cachedProgress

  const cachedPlan = queryClient.getQueryData<StudyPlan>(
    studyPlanQueryKeys.planDetail(planId),
  )
  return cachedPlan?.progress
}

export function useStudyPlanProgress(
  planId: string | undefined,
  stepOrders: number[],
): UseStudyPlanProgressResult {
  const application = useStudyPlanApplication()
  const queryClient = useQueryClient()

  const progressQuery = useQuery({
    queryKey: studyPlanQueryKeys.sessionProgress(planId ?? ''),
    queryFn: () => application.sessionProgress.loadSessionProgress(planId!),
    enabled: Boolean(planId),
    initialData: () =>
      planId ? readCachedSessionProgress(queryClient, planId) : undefined,
  })

  const toggleMutation = useMutation({
    mutationFn: (stepOrder: number) =>
      application.sessionProgress.toggleDailyStep(
        planId!,
        stepOrder,
        stepOrders,
      ),
    onMutate: async (stepOrder) => {
      if (!planId) return { previous: createEmptyProgressRecord() }

      await queryClient.cancelQueries({
        queryKey: studyPlanQueryKeys.sessionProgress(planId),
      })

      const previous =
        queryClient.getQueryData<StudyPlanProgressRecord>(
          studyPlanQueryKeys.sessionProgress(planId),
        ) ?? createEmptyProgressRecord()

      const optimistic = toggleStepCompletion(previous, stepOrder, stepOrders)
      queryClient.setQueryData(
        studyPlanQueryKeys.sessionProgress(planId),
        optimistic.record,
      )
      syncSessionProgressAcrossQueryCache(
        queryClient,
        planId,
        optimistic.record,
      )

      return { previous, optimistic }
    },
    onError: (_error, _stepOrder, context) => {
      if (!planId || !context?.previous) return
      queryClient.setQueryData(
        studyPlanQueryKeys.sessionProgress(planId),
        context.previous,
      )
      syncSessionProgressAcrossQueryCache(queryClient, planId, context.previous)
    },
    onSuccess: (result) => {
      if (!planId) return
      queryClient.setQueryData(
        studyPlanQueryKeys.sessionProgress(planId),
        result.record,
      )
      syncSessionProgressAcrossQueryCache(queryClient, planId, result.record)
    },
  })

  const record = progressQuery.data ?? createEmptyProgressRecord()

  const daily = useMemo(
    () => getDailyProgress(record, stepOrders),
    [record, stepOrders],
  )

  const toggleStep = useCallback(
    (stepOrder: number): ToggleStepOutcome => {
      if (!planId) {
        return {
          gainedXp: 0,
          reachedDailyWin: false,
          reachedFullSession: false,
          completed: false,
        }
      }

      const optimistic = toggleStepCompletion(record, stepOrder, stepOrders)
      toggleMutation.mutate(stepOrder)

      return {
        gainedXp: optimistic.gainedXp,
        reachedDailyWin: optimistic.reachedDailyWin,
        reachedFullSession: optimistic.reachedFullSession,
        completed: optimistic.completed,
      }
    },
    [planId, record, stepOrders, toggleMutation],
  )

  return {
    daily,
    loading: progressQuery.isLoading,
    toggleStep,
  }
}
