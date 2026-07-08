export interface StudyPlanProgressRecord {
  sessions: Record<string, number[]>
  totalXp: number
  longestStreak: number
}

export interface StudyPlanDailyProgress {
  todayKey: string
  completedOrders: number[]
  completedCount: number
  totalSteps: number
  progressPercent: number
  hasDailyWin: boolean
  isFullSession: boolean
  streak: number
  totalXp: number
  longestStreak: number
  nextStepOrder: number | null
  xpEarnedToday: number
  level: StudyPlanLevel
  week: StudyPlanWeekDay[]
}

export type StudyPlanDayStatus = 'none' | 'win' | 'full'

export interface StudyPlanWeekDay {
  dateKey: string
  weekdayLabel: string
  isToday: boolean
  status: StudyPlanDayStatus
}

export interface StudyPlanLevel {
  level: number
  title: string
  totalXp: number
  xpIntoLevel: number
  xpForNextLevel: number | null
  progressPercent: number
}

export const STUDY_PLAN_LEVELS = [
  { level: 1, minXp: 0, title: 'Warm-up' },
  { level: 2, minXp: 50, title: 'Building habit' },
  { level: 3, minXp: 150, title: 'Consistent input' },
  { level: 4, minXp: 300, title: 'B1+ track' },
  { level: 5, minXp: 500, title: 'B2 runway' },
  { level: 6, minXp: 800, title: 'Fluency builder' },
] as const

export const STEP_XP = 10
export const FULL_SESSION_BONUS_XP = 25

export function createEmptyProgressRecord(): StudyPlanProgressRecord {
  return { sessions: {}, totalXp: 0, longestStreak: 0 }
}

export function getTodayDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getFirstStepOrder(stepOrders: number[]): number | null {
  if (stepOrders.length === 0) return null
  return Math.min(...stepOrders)
}

function previousDateKey(dateKey: string): string {
  return shiftDateKey(dateKey, -1)
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return getTodayDateKey(date)
}

export function getDayStatus(
  completedOrders: number[] | undefined,
  firstStepOrder: number | null,
  totalSteps: number,
): StudyPlanDayStatus {
  const orders = completedOrders ?? []
  if (totalSteps > 0 && orders.length >= totalSteps) return 'full'
  if (hasDailyWin(orders, firstStepOrder)) return 'win'
  return 'none'
}

export function getStudyPlanLevel(totalXp: number): StudyPlanLevel {
  type LevelEntry = (typeof STUDY_PLAN_LEVELS)[number]
  let current: LevelEntry = STUDY_PLAN_LEVELS[0]
  for (const entry of STUDY_PLAN_LEVELS) {
    if (totalXp >= entry.minXp) current = entry
  }

  const currentIndex = STUDY_PLAN_LEVELS.findIndex(
    (entry) => entry.level === current.level,
  )
  const next = STUDY_PLAN_LEVELS[currentIndex + 1]
  const xpIntoLevel = totalXp - current.minXp
  const xpSpan = next ? next.minXp - current.minXp : null

  return {
    level: current.level,
    title: current.title,
    totalXp,
    xpIntoLevel,
    xpForNextLevel: next ? next.minXp - totalXp : null,
    progressPercent: xpSpan
      ? Math.min(100, Math.round((xpIntoLevel / xpSpan) * 100))
      : 100,
  }
}

export function getWeekSummary(
  record: StudyPlanProgressRecord,
  stepOrders: number[],
  todayKey = getTodayDateKey(),
): StudyPlanWeekDay[] {
  const firstStepOrder = getFirstStepOrder(stepOrders)
  const totalSteps = stepOrders.length
  const days: StudyPlanWeekDay[] = []

  for (let offset = -6; offset <= 0; offset++) {
    const dateKey = shiftDateKey(todayKey, offset)
    const [year, month, day] = dateKey.split('-').map(Number)
    const weekdayLabel = new Date(year, month - 1, day)
      .toLocaleDateString(undefined, { weekday: 'narrow' })
      .slice(0, 1)
      .toUpperCase()

    days.push({
      dateKey,
      weekdayLabel,
      isToday: dateKey === todayKey,
      status: getDayStatus(
        record.sessions[dateKey],
        firstStepOrder,
        totalSteps,
      ),
    })
  }

  return days
}

function hasDailyWin(
  completedOrders: number[] | undefined,
  firstStepOrder: number | null,
): boolean {
  if (firstStepOrder == null) return false
  return (completedOrders ?? []).includes(firstStepOrder)
}

function xpForSession(completedOrders: number[], totalSteps: number): number {
  const stepXp = completedOrders.length * STEP_XP
  const bonus =
    completedOrders.length >= totalSteps && totalSteps > 0
      ? FULL_SESSION_BONUS_XP
      : 0
  return stepXp + bonus
}

export function computeStreak(
  sessions: Record<string, number[]>,
  firstStepOrder: number | null,
  todayKey: string,
): number {
  if (firstStepOrder == null) return 0

  let streak = 0
  let cursor = hasDailyWin(sessions[todayKey], firstStepOrder)
    ? todayKey
    : previousDateKey(todayKey)

  while (hasDailyWin(sessions[cursor], firstStepOrder)) {
    streak++
    cursor = previousDateKey(cursor)
  }

  return streak
}

export function computeLongestStreak(
  sessions: Record<string, number[]>,
  firstStepOrder: number | null,
): number {
  if (firstStepOrder == null) return 0

  const winningDates = Object.entries(sessions)
    .filter(([, orders]) => hasDailyWin(orders, firstStepOrder))
    .map(([dateKey]) => dateKey)
    .sort()

  if (winningDates.length === 0) return 0

  let longest = 1
  let current = 1

  for (let index = 1; index < winningDates.length; index++) {
    const expected = previousDateKey(winningDates[index])
    if (winningDates[index - 1] === expected) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }

  return longest
}

export function getDailyProgress(
  record: StudyPlanProgressRecord,
  stepOrders: number[],
  todayKey = getTodayDateKey(),
): StudyPlanDailyProgress {
  const totalSteps = stepOrders.length
  const firstStepOrder = getFirstStepOrder(stepOrders)
  const completedOrders = [...(record.sessions[todayKey] ?? [])].sort(
    (a, b) => a - b,
  )
  const completedCount = completedOrders.length
  const progressPercent =
    totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100)
  const hasWin = hasDailyWin(completedOrders, firstStepOrder)
  const isFullSession = totalSteps > 0 && completedCount >= totalSteps
  const nextStepOrder =
    stepOrders.find((order) => !completedOrders.includes(order)) ?? null

  return {
    todayKey,
    completedOrders,
    completedCount,
    totalSteps,
    progressPercent,
    hasDailyWin: hasWin,
    isFullSession,
    streak: computeStreak(record.sessions, firstStepOrder, todayKey),
    totalXp: record.totalXp,
    longestStreak: Math.max(
      record.longestStreak,
      computeLongestStreak(record.sessions, firstStepOrder),
    ),
    nextStepOrder,
    xpEarnedToday: xpForSession(completedOrders, totalSteps),
    level: getStudyPlanLevel(record.totalXp),
    week: getWeekSummary(record, stepOrders, todayKey),
  }
}

export interface ToggleStepResult {
  record: StudyPlanProgressRecord
  completed: boolean
  gainedXp: number
  reachedFullSession: boolean
  reachedDailyWin: boolean
}

export function toggleStepCompletion(
  record: StudyPlanProgressRecord,
  stepOrder: number,
  stepOrders: number[],
  todayKey = getTodayDateKey(),
): ToggleStepResult {
  const totalSteps = stepOrders.length
  const firstStepOrder = getFirstStepOrder(stepOrders)
  const beforeOrders = record.sessions[todayKey] ?? []
  const beforeXpToday = xpForSession(beforeOrders, totalSteps)
  const hadDailyWin = hasDailyWin(beforeOrders, firstStepOrder)
  const wasFullSession = totalSteps > 0 && beforeOrders.length >= totalSteps

  const isCompleted = beforeOrders.includes(stepOrder)
  const nextOrders = isCompleted
    ? beforeOrders.filter((order) => order !== stepOrder)
    : [...beforeOrders, stepOrder].sort((a, b) => a - b)

  const sessions =
    nextOrders.length === 0
      ? Object.fromEntries(
          Object.entries(record.sessions).filter(([key]) => key !== todayKey),
        )
      : { ...record.sessions, [todayKey]: nextOrders }

  const afterXpToday = xpForSession(nextOrders, totalSteps)
  const gainedXp = afterXpToday - beforeXpToday
  const nextRecord: StudyPlanProgressRecord = {
    sessions,
    totalXp: Math.max(0, record.totalXp + gainedXp),
    longestStreak: 0,
  }
  nextRecord.longestStreak = Math.max(
    record.longestStreak,
    computeLongestStreak(nextRecord.sessions, firstStepOrder),
  )

  const hasWin = hasDailyWin(nextOrders, firstStepOrder)
  const isFull = totalSteps > 0 && nextOrders.length >= totalSteps

  return {
    record: nextRecord,
    completed: !isCompleted,
    gainedXp,
    reachedDailyWin: !hadDailyWin && hasWin,
    reachedFullSession: !wasFullSession && isFull,
  }
}
