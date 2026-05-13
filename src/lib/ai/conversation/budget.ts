import type { IntentResult, ResponseBudget, PersonaModulationInput } from "./types"

const SHORT_INPUT_THRESHOLD = 20

interface BudgetTemplate {
  baseMaxSentences: number
  baseExplanationDepth: number
}

const BUDGET_MAP: Record<string, BudgetTemplate> = {
  continue_conversation: { baseMaxSentences: 2, baseExplanationDepth: 0 },
  ask_definition: { baseMaxSentences: 4, baseExplanationDepth: 0.8 },
  ask_correction: { baseMaxSentences: 3, baseExplanationDepth: 0.6 },
  small_talk: { baseMaxSentences: 3, baseExplanationDepth: 0.1 },
  hesitation: { baseMaxSentences: 2, baseExplanationDepth: 0 },
  confirmation: { baseMaxSentences: 1, baseExplanationDepth: 0 },
  emotional_expression: { baseMaxSentences: 3, baseExplanationDepth: 0.1 },
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function deriveBudget(
  intent: IntentResult,
  input?: string,
  persona?: PersonaModulationInput,
): ResponseBudget {
  const template = BUDGET_MAP[intent.intent] ?? BUDGET_MAP.continue_conversation

  let maxSentences = template.baseMaxSentences
  let explanationDepth = template.baseExplanationDepth

  const isShortInput = input !== undefined && input.trim().length < SHORT_INPUT_THRESHOLD

  if (intent.confidence < 0.3) {
    maxSentences = Math.min(maxSentences, 2)
    explanationDepth = 0
  }

  if (persona) {
    if (persona.engagement !== undefined && persona.engagement > 0.7) {
      maxSentences += 1
    }
    if (persona.verbosity !== undefined) {
      if (persona.verbosity > 0.7) {
        maxSentences += 1
      } else if (persona.verbosity < 0.3) {
        maxSentences = Math.min(maxSentences, 2)
      }
    }
    if (persona.familiarity !== undefined && persona.familiarity > 0.7) {
      maxSentences += 1
    }
  }

  if (intent.confidence < 0.3) {
    explanationDepth = 0
  }

  if (isShortInput) {
    maxSentences = Math.min(maxSentences, 2)
    explanationDepth = 0
  }

  explanationDepth = clamp(explanationDepth, 0, 1)
  maxSentences = clamp(maxSentences, 1, 10)

  return { maxSentences, explanationDepth }
}

export function budgetToPrompt(budget: ResponseBudget): string {
  const sentenceRule = `Respond in at most ${budget.maxSentences} sentence${budget.maxSentences > 1 ? "s" : ""}.`

  let depthRule: string
  if (budget.explanationDepth === 0) {
    depthRule = "Do not explain or teach. Just respond naturally."
  } else if (budget.explanationDepth <= 0.3) {
    depthRule = "Provide only a brief explanation if absolutely needed."
  } else if (budget.explanationDepth <= 0.6) {
    depthRule = "Provide a moderate explanation."
  } else {
    depthRule = "Provide a full in-depth explanation."
  }

  return `${sentenceRule} ${depthRule}`
}
