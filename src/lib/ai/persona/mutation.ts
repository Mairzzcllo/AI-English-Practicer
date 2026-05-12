import type { StateMutationRule, RuntimeState, RelationshipState, ConversationState, ConversationSignal, EmotionalState } from "./types"
import { normalizeStateValue } from "./types"

export interface RuleEvaluator {
  rule: StateMutationRule
  evaluate: (
    signal: ConversationSignal,
    runtime: RuntimeState,
    conv: ConversationState,
    rel: RelationshipState,
  ) => boolean
}

export interface MutationResult {
  runtime: RuntimeState
  relationship: RelationshipState
  appliedRules: string[]
}

export function createRuleEvaluator(
  rule: StateMutationRule,
  evaluate: RuleEvaluator["evaluate"],
): RuleEvaluator {
  return { rule, evaluate }
}

function applyDeltaToTarget(
  target: string,
  delta: number,
  runtime: RuntimeState,
  rel: RelationshipState,
): { runtime: RuntimeState; relationship: RelationshipState } {
  let newRuntime = { ...runtime }
  let newRel = { ...rel }

  if (target.startsWith("emotional.")) {
    const key = target.split(".")[1] as keyof EmotionalState
    const ranges: Record<keyof EmotionalState, [number, number]> = {
      valence: [-1, 1],
      arousal: [0, 1],
      dominance: [0, 1],
    }
    const [min, max] = ranges[key]
    newRuntime = {
      ...newRuntime,
      emotional: {
        ...newRuntime.emotional,
        [key]: normalizeStateValue(newRuntime.emotional[key] + delta, min, max),
      },
    }
  } else if (target === "engagement") {
    newRuntime = { ...newRuntime, engagement: normalizeStateValue(newRuntime.engagement + delta, 0, 1) }
  } else if (target === "energy") {
    newRuntime = { ...newRuntime, energy: normalizeStateValue(newRuntime.energy + delta, 0, 1) }
  } else if (target === "socialOpenness") {
    newRuntime = { ...newRuntime, socialOpenness: normalizeStateValue(newRuntime.socialOpenness + delta, 0, 1) }
  } else if (target === "familiarity") {
    newRel = { ...newRel, familiarity: normalizeStateValue(newRel.familiarity + delta, 0, 1) }
  } else if (target === "trust") {
    newRel = { ...newRel, trust: normalizeStateValue(newRel.trust + delta, 0, 1) }
  } else if (target === "comfort") {
    newRel = { ...newRel, comfort: normalizeStateValue(newRel.comfort + delta, 0, 1) }
  } else if (target === "humorAcceptance") {
    newRel = { ...newRel, humorAcceptance: normalizeStateValue(newRel.humorAcceptance + delta, 0, 1) }
  }

  return { runtime: newRuntime, relationship: newRel }
}

export function applyMutations(
  evaluators: RuleEvaluator[],
  signal: ConversationSignal,
  runtime: RuntimeState,
  conv: ConversationState,
  rel: RelationshipState,
): MutationResult {
  let currentRuntime = runtime
  let currentRel = rel
  const appliedRules: string[] = []

  for (const ev of evaluators) {
    if (ev.evaluate(signal, currentRuntime, conv, currentRel)) {
      const result = applyDeltaToTarget(ev.rule.target, ev.rule.delta, currentRuntime, currentRel)
      currentRuntime = result.runtime
      currentRel = result.relationship
      appliedRules.push(ev.rule.id)
    }
  }

  return { runtime: currentRuntime, relationship: currentRel, appliedRules }
}

export function createDefaultRules(): RuleEvaluator[] {
  return [
    createRuleEvaluator(
      {
        id: "short_reply_engagement_decay",
        condition: "user sends 3 consecutive short replies",
        target: "engagement",
        delta: -0.12,
        description: "Decrease engagement when user gives consistently short answers",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void rel
        return conv.consecutiveShortReplies >= 3
      },
    ),
    createRuleEvaluator(
      {
        id: "silence_energy_drain",
        condition: "prolonged silence detected",
        target: "energy",
        delta: -0.05,
        description: "Drain energy during extended silence",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "silence" && signal.intensity >= 0.5
      },
    ),
    createRuleEvaluator(
      {
        id: "positive_sentiment_relationship_boost",
        condition: "user expresses positive sentiment",
        target: "trust",
        delta: 0.04,
        description: "Build trust on positive sentiment",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "positive_sentiment" && signal.intensity >= 0.3
      },
    ),
    createRuleEvaluator(
      {
        id: "frustration_trust_damage",
        condition: "user shows frustration",
        target: "trust",
        delta: -0.08,
        description: "Decrease trust when user is frustrated",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "frustration" && signal.intensity >= 0.4
      },
    ),
    createRuleEvaluator(
      {
        id: "curiosity_engagement_boost",
        condition: "user shows curiosity",
        target: "engagement",
        delta: 0.1,
        description: "Boost engagement when user is curious",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "curiosity"
      },
    ),
    createRuleEvaluator(
      {
        id: "disengagement_social_openness_drop",
        condition: "user disengages",
        target: "socialOpenness",
        delta: -0.06,
        description: "Reduce social openness when user disengages",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "disengagement"
      },
    ),
    createRuleEvaluator(
      {
        id: "correction_needed_valence_drop",
        condition: "correction was needed",
        target: "emotional.valence",
        delta: -0.08,
        description: "Slight mood dip when correction is needed",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "correction_needed"
      },
    ),
    createRuleEvaluator(
      {
        id: "openness_familiarity_boost",
        condition: "user shows openness to new topics",
        target: "familiarity",
        delta: 0.05,
        description: "Increase familiarity when user is open",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "openness"
      },
    ),
    createRuleEvaluator(
      {
        id: "hesitation_comfort_drop",
        condition: "user hesitates",
        target: "comfort",
        delta: -0.05,
        description: "Decrease comfort when user hesitates",
      },
      (signal, runtime, conv, rel) => {
        void runtime; void conv; void rel
        return signal.type === "hesitation"
      },
    ),
    createRuleEvaluator(
      {
        id: "long_conversation_social_openness_rise",
        condition: "conversation has been going for a while",
        target: "socialOpenness",
        delta: 0.03,
        description: "Gradual social openness increase over time",
      },
      (signal, runtime, conv, rel) => {
        void signal; void runtime; void rel
        return conv.turnCount >= 10
      },
    ),
    createRuleEvaluator(
      {
        id: "low_energy_valence_drag",
        condition: "energy is critically low",
        target: "emotional.valence",
        delta: -0.05,
        description: "Low energy drags mood down",
      },
      (signal, runtime, conv, rel) => {
        void signal; void conv; void rel
        return runtime.energy < 0.2
      },
    ),
  ]
}
