import type { StudyPlanStep } from '../types/studyPlan'

export type StudyPlanStepActionType =
  | 'flashcards'
  | 'letters'
  | 'input'
  | 'writing'
  | 'error_notebook'
  | 'speaking'
  | 'generic'

export interface StudyPlanStepAction {
  type: StudyPlanStepActionType
  label: string
  usesTimer: boolean
}

const KEYWORD_RULES: Array<{
  type: StudyPlanStepActionType
  patterns: RegExp[]
  label: string
  usesTimer: boolean
}> = [
  {
    type: 'flashcards',
    patterns: [/flashcard/i, /revis[aã]o espa/i, /anki/i, /spaced repetition/i],
    label: 'Open flashcards',
    usesTimer: false,
  },
  {
    type: 'letters',
    patterns: [/letra/i, /lyrics/i, /m[uú]sica/i, /song/i],
    label: 'Open letter',
    usesTimer: false,
  },
  {
    type: 'writing',
    patterns: [/escrita/i, /writing/i, /prompt/i, /redig/i],
    label: 'Open writing note',
    usesTimer: false,
  },
  {
    type: 'error_notebook',
    patterns: [
      /caderno de erros/i,
      /error notebook/i,
      /erros recorrentes/i,
      /mistake log/i,
    ],
    label: 'Open error notebook',
    usesTimer: false,
  },
  {
    type: 'speaking',
    patterns: [
      /falar/i,
      /speaking/i,
      /shadowing/i,
      /pronunciation/i,
      /gravar falando/i,
    ],
    label: 'Start speaking timer',
    usesTimer: true,
  },
  {
    type: 'input',
    patterns: [
      /input/i,
      /v[ií]deo/i,
      /podcast/i,
      /artigo/i,
      /listening/i,
      /reading/i,
    ],
    label: 'Start input timer',
    usesTimer: true,
  },
]

export function parseDurationMinutes(duration: string): number | null {
  const match = duration.match(/(\d+)/)
  if (!match) return null
  const minutes = Number.parseInt(match[1], 10)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null
}

function matchText(step: StudyPlanStep): string {
  return `${step.activity} ${step.notes}`.trim()
}

export function inferStepAction(step: StudyPlanStep): StudyPlanStepAction {
  const text = matchText(step)

  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return {
        type: rule.type,
        label: rule.label,
        usesTimer: rule.usesTimer,
      }
    }
  }

  const fallbackMinutes = parseDurationMinutes(step.duration)
  return {
    type: 'generic',
    label: fallbackMinutes ? 'Start step timer' : 'Mark when done',
    usesTimer: fallbackMinutes != null,
  }
}

export function getStepTimerMinutes(step: StudyPlanStep): number {
  return parseDurationMinutes(step.duration) ?? 10
}
