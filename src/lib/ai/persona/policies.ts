import type { BehavioralPolicy, ConversationSignal, RuntimeState, RelationshipState, ConversationState, Tone } from "./types"

export interface ModulationOutput {
  verbosity: number
  initiative: number
  humor: number
  shouldInterrupt: boolean
  correctionUrgency: number
  emotionalMirroring: number
  topicPersistence: number
  tone: Tone
}

const PACING_DELAY_MS: Record<string, number> = {
  slow: 3000,
  moderate: 1500,
  fast: 500,
}

const CORRECTION_URGENCY: Record<string, number> = {
  gentle: 0.3,
  direct: 0.8,
  none: 0,
}

function getCognitiveBoost(runtime: RuntimeState): number {
  return (runtime.emotional.arousal + runtime.engagement) / 2
}

export function getEffectiveVerbosity(policy: BehavioralPolicy, runtime: RuntimeState, relationship: RelationshipState): number {
  const boost = getCognitiveBoost(runtime)
  const relFactor = (relationship.trust + relationship.comfort) / 2
  const combinedBoost = boost * 0.7 + relFactor * 0.3
  return Math.min(1, policy.verbosity * (0.5 + combinedBoost * 0.5))
}

export function shouldTakeInitiative(
  policy: BehavioralPolicy,
  conv: ConversationState,
  signal?: ConversationSignal,
  runtime?: RuntimeState,
  relationship?: RelationshipState,
): boolean {
  if (policy.initiativeLevel <= 0) return false
  if (signal?.type === "silence" && conv.sessionDurationMinutes > 0) return true

  let adjusted = policy.initiativeLevel + conv.consecutiveShortReplies * 0.1
  if (runtime) adjusted += runtime.engagement * 0.15
  if (relationship) adjusted += relationship.trust * 0.15
  const threshold = conv.turnCount > 5 ? 0.5 : 0.7
  return adjusted >= threshold
}

export function getHumorLevel(policy: BehavioralPolicy, runtime: RuntimeState, relationship: RelationshipState): number {
  const moodFactor = (runtime.emotional.valence + 1) / 2
  return policy.humorLevel * moodFactor * (0.5 + relationship.humorAcceptance * 0.5)
}

export function getEffectiveResponsePacing(policy: BehavioralPolicy, runtime: RuntimeState, relationship: RelationshipState): string {
  if (runtime.engagement > 0.7 && runtime.emotional.arousal > 0.7) return "fast"
  if (runtime.energy < 0.3 || relationship.familiarity < 0.2) return "slow"
  return policy.responsePacing
}

export function shouldInterruptSilence(
  policy: BehavioralPolicy,
  runtime: RuntimeState,
  silenceDurationMs: number,
  relationship: RelationshipState,
): boolean {
  const effectivePacing = getEffectiveResponsePacing(policy, runtime, relationship)
  const delay = PACING_DELAY_MS[effectivePacing]
  const tolerance = 1 - policy.interruptTolerance
  const effectiveDelay = delay * (1 + tolerance * 2)
  return silenceDurationMs >= effectiveDelay
}

export function getCorrectionUrgency(
  policy: BehavioralPolicy,
  signal?: ConversationSignal,
): number {
  const base = CORRECTION_URGENCY[policy.correctionStyle]
  if (signal?.type === "correction_needed") return base + 0.3
  return base
}

export function getMirrorIntensity(policy: BehavioralPolicy): number {
  return policy.emotionalMirroring
}

export function shouldPersistTopic(
  policy: BehavioralPolicy,
  conv: ConversationState,
): boolean {
  if (policy.topicPersistence >= 0.8) return true
  if (conv.userTopicChanges >= 3) return false
  if (policy.topicPersistence >= 0.5) return conv.consecutiveShortReplies < 2
  return false
}

export function computeTone(
  policy: BehavioralPolicy,
  runtime: RuntimeState,
  relationship: RelationshipState,
): Tone {
  const { valence, arousal } = runtime.emotional

  if (valence > 0.3 && arousal > 0.5) return "playful"
  if (valence < -0.2) return "supportive"
  if (relationship.comfort < 0.3 || relationship.trust < 0.3) return "neutral"
  if (relationship.familiarity < 0.2) return "formal"
  if (relationship.familiarity > 0.6 && relationship.comfort > 0.6) return "warm"

  return policy.tone
}

export function modulateResponse(
  policy: BehavioralPolicy,
  signal: ConversationSignal,
  runtime: RuntimeState,
  conv: ConversationState,
  relationship: RelationshipState,
): ModulationOutput {
  return {
    verbosity: getEffectiveVerbosity(policy, runtime, relationship),
    initiative: shouldTakeInitiative(policy, conv, signal, runtime, relationship) ? policy.initiativeLevel : 0,
    humor: getHumorLevel(policy, runtime, relationship),
    shouldInterrupt: signal.type === "silence" && shouldTakeInitiative(policy, conv, signal, runtime, relationship),
    correctionUrgency: getCorrectionUrgency(policy, signal),
    emotionalMirroring: getMirrorIntensity(policy),
    topicPersistence: shouldPersistTopic(policy, conv) ? policy.topicPersistence : 0,
    tone: computeTone(policy, runtime, relationship),
  }
}
