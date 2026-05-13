export type UserIntent =
  | "continue_conversation"
  | "ask_definition"
  | "ask_correction"
  | "small_talk"
  | "hesitation"
  | "confirmation"
  | "emotional_expression"

export interface IntentResult {
  intent: UserIntent
  confidence: number
}

export interface IntentClassifier {
  classify(input: string): IntentResult
}

export interface ResponseBudget {
  maxSentences: number
  explanationDepth: number
}

export interface PersonaModulationInput {
  engagement?: number
  verbosity?: number
  familiarity?: number
}

export interface MomentumState {
  momentum: number
  depth: number
  responsiveness: number
}

export type AmbiguityLevel = "none" | "low" | "high"

export interface AmbiguityAssessment {
  level: AmbiguityLevel
  shouldCarryOn: boolean
}
