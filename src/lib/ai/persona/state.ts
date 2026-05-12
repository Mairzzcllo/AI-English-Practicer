import type { RuntimeState, ConversationSignal, ConversationState, EmotionalState } from "./types"
import { normalizeStateValue } from "./types"

function getFieldRange(field: string): [number, number] {
  const ranges: Record<string, [number, number]> = {
    "emotional.valence": [-1, 1],
    "emotional.arousal": [0, 1],
    "emotional.dominance": [0, 1],
    energy: [0, 1],
    engagement: [0, 1],
    socialOpenness: [0, 1],
  }
  return ranges[field] ?? [0, 1]
}

export function applyEmotionalDelta(
  emotional: EmotionalState,
  subField: keyof EmotionalState,
  delta: number,
): EmotionalState {
  const [min, max] = getFieldRange(`emotional.${subField}`)
  return {
    ...emotional,
    [subField]: normalizeStateValue(emotional[subField] + delta, min, max),
  }
}

const SIGNAL_EFFECTS: Record<
  ConversationSignal["type"],
  Array<{ field: keyof EmotionalState | keyof Omit<RuntimeState, "emotional">; multiplier: number }>
> = {
  short_reply: [
    { field: "engagement", multiplier: -0.15 },
    { field: "energy", multiplier: -0.05 },
  ],
  long_reply: [
    { field: "engagement", multiplier: 0.1 },
    { field: "valence", multiplier: 0.05 },
  ],
  question: [
    { field: "engagement", multiplier: 0.15 },
    { field: "socialOpenness", multiplier: 0.05 },
  ],
  correction_needed: [
    { field: "valence", multiplier: -0.1 },
  ],
  positive_sentiment: [
    { field: "valence", multiplier: 0.15 },
    { field: "socialOpenness", multiplier: 0.08 },
  ],
  negative_sentiment: [
    { field: "valence", multiplier: -0.15 },
    { field: "socialOpenness", multiplier: -0.05 },
  ],
  silence: [
    { field: "engagement", multiplier: -0.1 },
    { field: "energy", multiplier: -0.05 },
  ],
  interruption: [
    { field: "engagement", multiplier: -0.2 },
    { field: "valence", multiplier: -0.05 },
  ],
  disengagement: [
    { field: "engagement", multiplier: -0.2 },
    { field: "valence", multiplier: -0.05 },
  ],
  curiosity: [
    { field: "engagement", multiplier: 0.15 },
    { field: "arousal", multiplier: 0.1 },
  ],
  hesitation: [
    { field: "dominance", multiplier: -0.1 },
    { field: "engagement", multiplier: -0.05 },
  ],
  frustration: [
    { field: "valence", multiplier: -0.2 },
    { field: "arousal", multiplier: 0.1 },
  ],
  openness: [
    { field: "socialOpenness", multiplier: 0.15 },
    { field: "valence", multiplier: 0.05 },
  ],
}

export function processSignal(
  state: RuntimeState,
  signal: ConversationSignal,
): RuntimeState {
  const effects = SIGNAL_EFFECTS[signal.type]
  if (!effects) return state

  let emotional = state.emotional
  let energy = state.energy
  let engagement = state.engagement
  let socialOpenness = state.socialOpenness

  for (const effect of effects) {
    const delta = effect.multiplier * signal.intensity
    if (effect.field === "valence" || effect.field === "arousal" || effect.field === "dominance") {
      emotional = applyEmotionalDelta(emotional, effect.field, delta)
    } else if (effect.field === "energy") {
      const [min, max] = getFieldRange("energy")
      energy = normalizeStateValue(energy + delta, min, max)
    } else if (effect.field === "engagement") {
      const [min, max] = getFieldRange("engagement")
      engagement = normalizeStateValue(engagement + delta, min, max)
    } else if (effect.field === "socialOpenness") {
      const [min, max] = getFieldRange("socialOpenness")
      socialOpenness = normalizeStateValue(socialOpenness + delta, min, max)
    }
  }

  return { emotional, energy, engagement, socialOpenness }
}

const DECAY_RATE = { energy: 0.01 }

export function applyDecay(state: RuntimeState, timeDeltaMinutes: number): RuntimeState {
  const [min, max] = getFieldRange("energy")
  return {
    ...state,
    energy: normalizeStateValue(state.energy - DECAY_RATE.energy * timeDeltaMinutes, min, max),
  }
}

const ENGAGEMENT_THRESHOLD = 0.2
const ENERGY_THRESHOLD = 0.15
const VALENCE_THRESHOLD = -0.7

export function needsIntervention(state: RuntimeState): boolean {
  return (
    state.engagement < ENGAGEMENT_THRESHOLD ||
    state.energy < ENERGY_THRESHOLD ||
    state.emotional.valence < VALENCE_THRESHOLD
  )
}

const ENGAGED_THRESHOLD = 0.3

export function isEngaged(state: RuntimeState): boolean {
  return state.engagement >= ENGAGED_THRESHOLD
}

const SHORT_REPLY_WORD_COUNT = 5
const TOPIC_CHANGE_SIGNALS: ConversationSignal["type"][] = ["openness", "curiosity"]

export function updateConversationFromSignal(
  conv: ConversationState,
  signal: ConversationSignal,
  messageWordCount?: number,
): ConversationState {
  const turnCount = conv.turnCount + 1

  const wordCount = messageWordCount ?? conv.lastUserMessageLength
  const isShort = signal.type === "short_reply" || wordCount < SHORT_REPLY_WORD_COUNT
  const consecutiveShortReplies = isShort ? conv.consecutiveShortReplies + 1 : 0

  const userTopicChanges =
    TOPIC_CHANGE_SIGNALS.includes(signal.type)
      ? conv.userTopicChanges + 1
      : conv.userTopicChanges

  return {
    turnCount,
    lastUserMessageLength: wordCount,
    consecutiveShortReplies,
    userTopicChanges,
    sessionDurationMinutes: conv.sessionDurationMinutes,
  }
}

export function applyConversationDecay(
  conv: ConversationState,
  timeDeltaMinutes: number,
): ConversationState {
  return {
    ...conv,
    sessionDurationMinutes: conv.sessionDurationMinutes + timeDeltaMinutes,
  }
}

export function updateUserMessageLength(
  conv: ConversationState,
  length: number,
): ConversationState {
  return { ...conv, lastUserMessageLength: length }
}
