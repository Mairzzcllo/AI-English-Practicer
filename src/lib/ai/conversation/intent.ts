import type { UserIntent, IntentResult } from "./types"

interface PatternEntry {
  regex: RegExp
  intent: UserIntent
  weight: number
}

const LOW_CONFIDENCE = 0.35
const MEDIUM_CONFIDENCE = 0.6
const HIGH_CONFIDENCE = 0.85

const PATTERNS: PatternEntry[] = [
  { regex: /\bplease\b/i, intent: "continue_conversation", weight: MEDIUM_CONFIDENCE },
  { regex: /\bgo on\b/i, intent: "continue_conversation", weight: MEDIUM_CONFIDENCE },
  { regex: /\btell me more\b/i, intent: "continue_conversation", weight: HIGH_CONFIDENCE },
  { regex: /\bcontinue\b/i, intent: "continue_conversation", weight: MEDIUM_CONFIDENCE },
  { regex: /\band\s*then\b/i, intent: "continue_conversation", weight: LOW_CONFIDENCE },
  { regex: /\bwhat does\b.*\bmean\b/i, intent: "ask_definition", weight: HIGH_CONFIDENCE },
  { regex: /\bwhat (is|are|was|were)\b/i, intent: "ask_definition", weight: HIGH_CONFIDENCE },
  { regex: /\bwhat's\b/i, intent: "ask_definition", weight: HIGH_CONFIDENCE },
  { regex: /\bdefine\b/i, intent: "ask_definition", weight: HIGH_CONFIDENCE },
  { regex: /\bexplain\b/i, intent: "ask_definition", weight: MEDIUM_CONFIDENCE },
  { regex: /\bhow does\b.*\bwork\b/i, intent: "ask_definition", weight: MEDIUM_CONFIDENCE },
  { regex: /\bis that (correct|right)\b/i, intent: "ask_correction", weight: HIGH_CONFIDENCE },
  { regex: /\bdid I say that right\b/i, intent: "ask_correction", weight: HIGH_CONFIDENCE },
  { regex: /\bcorrect me\b/i, intent: "ask_correction", weight: MEDIUM_CONFIDENCE },
  { regex: /\bis this (correct|right)\b/i, intent: "ask_correction", weight: HIGH_CONFIDENCE },
  { regex: /\bhow (are|'re) you\b/i, intent: "small_talk", weight: MEDIUM_CONFIDENCE },
  { regex: /\bwhat'?s up\b/i, intent: "small_talk", weight: MEDIUM_CONFIDENCE },
  { regex: /\bnice to meet you\b/i, intent: "small_talk", weight: HIGH_CONFIDENCE },
  { regex: /\bhow'?s it going\b/i, intent: "small_talk", weight: MEDIUM_CONFIDENCE },
  { regex: /\bhow are things\b/i, intent: "small_talk", weight: MEDIUM_CONFIDENCE },
  { regex: /^um\b/i, intent: "hesitation", weight: LOW_CONFIDENCE },
  { regex: /^uh\b/i, intent: "hesitation", weight: LOW_CONFIDENCE },
  { regex: /\bwell\b/i, intent: "hesitation", weight: LOW_CONFIDENCE },
  { regex: /\bi mean\b/i, intent: "hesitation", weight: LOW_CONFIDENCE },
  { regex: /\.{3,}\s*$/, intent: "hesitation", weight: LOW_CONFIDENCE },
  { regex: /\bok(ay)?\b/i, intent: "confirmation", weight: MEDIUM_CONFIDENCE },
  { regex: /\byeah\b/i, intent: "confirmation", weight: MEDIUM_CONFIDENCE },
  { regex: /\byes\b/i, intent: "confirmation", weight: MEDIUM_CONFIDENCE },
  { regex: /\bright\b/i, intent: "confirmation", weight: LOW_CONFIDENCE },
  { regex: /\bgot it\b/i, intent: "confirmation", weight: MEDIUM_CONFIDENCE },
  { regex: /\bI see\b/i, intent: "confirmation", weight: MEDIUM_CONFIDENCE },
  { regex: /\bsure\b/i, intent: "confirmation", weight: LOW_CONFIDENCE },
  { regex: /\bI feel\b/i, intent: "emotional_expression", weight: HIGH_CONFIDENCE },
  { regex: /\b(that'?s|this is) (awesome|amazing|great|wonderful|fantastic)\b/i, intent: "emotional_expression", weight: MEDIUM_CONFIDENCE },
  { regex: /\bwow\b/i, intent: "emotional_expression", weight: LOW_CONFIDENCE },
  { regex: /\b(I'?m|I am) (so|very|really)\b.*(happy|sad|excited|nervous|glad|grateful|worried|sorry)\b/i, intent: "emotional_expression", weight: HIGH_CONFIDENCE },
  { regex: /\b(I'?m|I am) (happy|sad|excited|nervous|glad|worried|sorry|tired)\b/i, intent: "emotional_expression", weight: MEDIUM_CONFIDENCE },
]

export function classifyIntent(input: string): IntentResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return { intent: "continue_conversation", confidence: LOW_CONFIDENCE }
  }

  const matches: { intent: UserIntent; weight: number }[] = []

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      matches.push({ intent: pattern.intent, weight: pattern.weight })
    }
  }

  if (matches.length === 0) {
    if (trimmed.length < 3) {
      return { intent: "continue_conversation", confidence: 0.2 }
    }
    return { intent: "continue_conversation", confidence: LOW_CONFIDENCE }
  }

  const scores = new Map<UserIntent, number>()
  for (const match of matches) {
    scores.set(match.intent, (scores.get(match.intent) ?? 0) + match.weight)
  }

  let bestIntent: UserIntent = "continue_conversation"
  let bestScore = 0

  for (const [intent, score] of scores) {
    if (score > bestScore) {
      bestScore = score
      bestIntent = intent
    }
  }

  const confidence = Math.min(bestScore, 1)

  return { intent: bestIntent, confidence }
}
