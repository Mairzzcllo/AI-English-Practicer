import type { IntentResult, AmbiguityAssessment } from "./types"

const VERY_SHORT_THRESHOLD = 5
const SHORT_INPUT_THRESHOLD = 20
const LOW_CONFIDENCE_THRESHOLD = 0.4

export function assessAmbiguity(intent: IntentResult, input?: string): AmbiguityAssessment {
  const trimmed = input?.trim() ?? ""

  if (!trimmed) {
    return { level: "high", shouldCarryOn: true }
  }

  if (trimmed.length < VERY_SHORT_THRESHOLD) {
    return { level: "high", shouldCarryOn: true }
  }

  const isLowConfidence = intent.confidence < LOW_CONFIDENCE_THRESHOLD
  const isShortInput = trimmed.length < SHORT_INPUT_THRESHOLD

  if (isLowConfidence && isShortInput) {
    return { level: "low", shouldCarryOn: true }
  }

  return { level: "none", shouldCarryOn: false }
}

export function getCarryOnHint(assessment: AmbiguityAssessment): string | undefined {
  if (!assessment.shouldCarryOn) return undefined

  if (assessment.level === "high") {
    return "The user's input is very brief or ambiguous. Do not analyze or interpret it. Just respond with a natural carry-on to keep the conversation flowing."
  }

  return "The user's input is brief. Respond with a short, natural follow-up to keep the conversation moving. Do not explain or teach."
}
