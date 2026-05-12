import type { RelationshipState, ConversationSignal } from "./types"
import { normalizeStateValue } from "./types"

const REL_FIELDS: (keyof RelationshipState)[] = [
  "familiarity",
  "trust",
  "comfort",
  "humorAcceptance",
]

const SIGNAL_EFFECTS: Record<
  ConversationSignal["type"],
  Array<{ field: keyof RelationshipState; multiplier: number }>
> = {
  positive_sentiment: [
    { field: "familiarity", multiplier: 0.1 },
    { field: "trust", multiplier: 0.05 },
    { field: "comfort", multiplier: 0.08 },
  ],
  negative_sentiment: [
    { field: "trust", multiplier: -0.08 },
    { field: "comfort", multiplier: -0.1 },
  ],
  long_reply: [
    { field: "familiarity", multiplier: 0.05 },
    { field: "comfort", multiplier: 0.03 },
  ],
  question: [
    { field: "familiarity", multiplier: 0.06 },
    { field: "trust", multiplier: 0.04 },
  ],
  short_reply: [
    { field: "familiarity", multiplier: -0.02 },
  ],
  interruption: [
    { field: "trust", multiplier: -0.05 },
    { field: "comfort", multiplier: -0.08 },
  ],
  silence: [
    { field: "familiarity", multiplier: -0.02 },
    { field: "comfort", multiplier: -0.03 },
  ],
  correction_needed: [
    { field: "trust", multiplier: -0.03 },
    { field: "humorAcceptance", multiplier: -0.02 },
  ],
  disengagement: [
    { field: "familiarity", multiplier: -0.03 },
    { field: "trust", multiplier: -0.02 },
  ],
  curiosity: [
    { field: "familiarity", multiplier: 0.08 },
    { field: "trust", multiplier: 0.04 },
  ],
  hesitation: [
    { field: "comfort", multiplier: -0.05 },
    { field: "trust", multiplier: -0.02 },
  ],
  frustration: [
    { field: "trust", multiplier: -0.1 },
    { field: "comfort", multiplier: -0.08 },
  ],
  openness: [
    { field: "familiarity", multiplier: 0.06 },
    { field: "comfort", multiplier: 0.05 },
  ],
}

export function applyRelationshipDelta(
  state: RelationshipState,
  field: keyof RelationshipState,
  delta: number,
): RelationshipState {
  return {
    ...state,
    [field]: normalizeStateValue(state[field] + delta, 0, 1),
  }
}

export function processRelationshipSignal(
  state: RelationshipState,
  signal: ConversationSignal,
): RelationshipState {
  const effects = SIGNAL_EFFECTS[signal.type]
  if (!effects) return state

  let current = state
  for (const effect of effects) {
    current = applyRelationshipDelta(current, effect.field, effect.multiplier * signal.intensity)
  }
  return current
}

const DECAY_RATE = 0.002

export function applyRelationshipDecay(
  state: RelationshipState,
  timeDeltaMinutes: number,
): RelationshipState {
  const decay = DECAY_RATE * timeDeltaMinutes
  let current = state
  for (const field of REL_FIELDS) {
    current = applyRelationshipDelta(current, field, -decay)
  }
  return current
}

const QUALITY_WEIGHTS = {
  familiarity: 0.2,
  trust: 0.35,
  comfort: 0.3,
  humorAcceptance: 0.15,
}

export function getRelationshipQuality(state: RelationshipState): number {
  return (
    state.familiarity * QUALITY_WEIGHTS.familiarity +
    state.trust * QUALITY_WEIGHTS.trust +
    state.comfort * QUALITY_WEIGHTS.comfort +
    state.humorAcceptance * QUALITY_WEIGHTS.humorAcceptance
  )
}

const ESTABLISHED_THRESHOLD = 0.25

export function isEstablished(state: RelationshipState): boolean {
  return getRelationshipQuality(state) >= ESTABLISHED_THRESHOLD
}
