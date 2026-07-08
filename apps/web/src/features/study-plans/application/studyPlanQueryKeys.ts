export const studyPlanQueryKeys = {
  all: ['study-plans'] as const,
  planLists: () => [...studyPlanQueryKeys.all, 'list'] as const,
  planList: () => studyPlanQueryKeys.planLists(),
  planDetails: () => [...studyPlanQueryKeys.all, 'detail'] as const,
  planDetail: (planId: string) =>
    [...studyPlanQueryKeys.planDetails(), planId] as const,
  sessionProgress: (planId: string) =>
    [...studyPlanQueryKeys.all, 'session-progress', planId] as const,
}
