import type { MomentumState, IntentResult } from "./types"

const SHORT_INPUT_WORD_COUNT = 5

const MOMENTUM_DELTAS: Record<string, { momentum: number; depth: number; responsiveness: number }> = {
  continue_conversation: { momentum: 0.05, depth: 0.05, responsiveness: 0.03 },
  ask_definition: { momentum: 0.1, depth: 0.15, responsiveness: 0.1 },
  ask_correction: { momentum: 0.08, depth: 0.12, responsiveness: 0.08 },
  small_talk: { momentum: 0.05, depth: -0.08, responsiveness: 0.05 },
  hesitation: { momentum: -0.08, depth: -0.1, responsiveness: -0.05 },
  confirmation: { momentum: 0.03, depth: -0.05, responsiveness: 0.03 },
  emotional_expression: { momentum: 0.08, depth: 0.03, responsiveness: 0.1 },
}

export function createDefaultMomentumState(): MomentumState {
  return { momentum: 0.5, depth: 0, responsiveness: 0.5 }
}

export function updateMomentumFromIntent(
  current: MomentumState,
  intent: IntentResult,
  input: string,
): MomentumState {
  const deltas = MOMENTUM_DELTAS[intent.intent] ?? MOMENTUM_DELTAS.continue_conversation

  let momentum = current.momentum + deltas.momentum
  let depth = current.depth + deltas.depth
  let responsiveness = current.responsiveness + deltas.responsiveness

  const wordCount = input?.trim().split(/\s+/).filter(Boolean).length ?? 0
  const isShort = wordCount < SHORT_INPUT_WORD_COUNT
  if (isShort && intent.intent !== "confirmation" && intent.intent !== "hesitation") {
    momentum -= 0.05
    responsiveness -= 0.05
  }

  if (intent.confidence < 0.3) {
    momentum -= 0.05
    responsiveness -= 0.05
  }

  momentum = Math.max(0, Math.min(1, momentum))
  depth = Math.max(0, Math.min(1, depth))
  responsiveness = Math.max(0, Math.min(1, responsiveness))

  return { momentum, depth, responsiveness }
}

export function momentumToBudgetMultiplier(state: MomentumState): number {
  const avg = (state.momentum + state.responsiveness) / 2
  if (avg > 0.7) return 1.5
  if (avg > 0.4) return 1.0
  return 0.7
}

export function momentumToPrompt(state: MomentumState): string {
  const parts: string[] = []

  if (state.momentum > 0.7) {
    parts.push("The conversation has good momentum — keep the flow going naturally.")
  } else if (state.momentum < 0.3) {
    parts.push("The conversation flow is weak — try to re-engage the user gently.")
  }

  if (state.depth > 0.6) {
    parts.push("The discussion has depth — you can explore the topic in detail.")
  } else if (state.depth < 0.2 && state.momentum > 0.4) {
    parts.push("The topic is still shallow — consider probing deeper.")
  }

  if (state.responsiveness > 0.7) {
    parts.push("The user is highly responsive — maintain the current approach.")
  } else if (state.responsiveness < 0.3) {
    parts.push("The user seems less responsive — try asking engaging questions.")
  }

  if (parts.length === 0) return ""
  return `Conversation momentum: ${parts.join(" ")}`
}
