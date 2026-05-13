import type { IntentResult, ResponseBudget } from "./types"

const TEACHING_INTENTS = new Set(["ask_definition", "ask_correction"])
const SHORT_INPUT_THRESHOLD = 20
const LOW_CONFIDENCE_THRESHOLD = 0.4

function isTeachingIntent(intent: string): boolean {
  return TEACHING_INTENTS.has(intent)
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function enforceMinimalism(
  intent: IntentResult,
  budget: ResponseBudget,
  input?: string,
): ResponseBudget {
  let maxSentences = budget.maxSentences
  let explanationDepth = budget.explanationDepth

  const isShortInput = input !== undefined && input.trim().length < SHORT_INPUT_THRESHOLD
  const isTeaching = isTeachingIntent(intent.intent)

  if (!isTeaching) {
    explanationDepth = 0

    if (intent.confidence < LOW_CONFIDENCE_THRESHOLD || isShortInput) {
      maxSentences = Math.min(maxSentences, 2)
    }
  }

  maxSentences = clamp(maxSentences, 1, 10)

  return { maxSentences, explanationDepth }
}
