import { describe, it, expect } from "vitest"
import type { RuntimeState, RelationshipState, ConversationState, StateMutationRule } from "./types"
import {
  createRuleEvaluator,
  applyMutations,
  createDefaultRules,
} from "./mutation"

function baseRuntime(overrides?: Partial<RuntimeState>): RuntimeState {
  return {
    emotional: { valence: 0, arousal: 0.5, dominance: 0.5 },
    energy: 0.7,
    engagement: 0.5,
    socialOpenness: 0.5,
    ...overrides,
  }
}

function baseRel(overrides?: Partial<RelationshipState>): RelationshipState {
  return {
    familiarity: 0,
    trust: 0,
    comfort: 0,
    humorAcceptance: 0,
    ...overrides,
  }
}

function baseConv(overrides?: Partial<ConversationState>): ConversationState {
  return {
    turnCount: 0,
    lastUserMessageLength: 0,
    consecutiveShortReplies: 0,
    userTopicChanges: 0,
    sessionDurationMinutes: 0,
    ...overrides,
  }
}

describe("createRuleEvaluator", () => {
  it("creates evaluator with rule and evaluate function", () => {
    const rule: StateMutationRule = {
      id: "test_rule",
      condition: "always true",
      target: "engagement",
      delta: -0.1,
      description: "test",
    }
    const ev = createRuleEvaluator(rule, () => true)
    expect(ev.rule.id).toBe("test_rule")
    expect(ev.evaluate({ type: "short_reply", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel())).toBe(true)
  })
})

describe("applyMutations", () => {
  it("applies no rules when none match", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "never", condition: "", target: "engagement", delta: -0.1, description: "" },
        () => false,
      ),
    ]
    const result = applyMutations(evaluators, { type: "short_reply", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel())
    expect(result.appliedRules).toEqual([])
    expect(result.runtime.engagement).toBe(0.5)
  })

  it("applies delta to engagement when rule matches", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "decay", condition: "", target: "engagement", delta: -0.12, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "short_reply", intensity: 1 }, baseRuntime({ engagement: 0.6 }), baseConv(), baseRel())
    expect(result.appliedRules).toEqual(["decay"])
    expect(result.runtime.engagement).toBeCloseTo(0.48)
  })

  it("clamps engagement to 0", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "big_drop", condition: "", target: "engagement", delta: -1, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "short_reply", intensity: 1 }, baseRuntime({ engagement: 0.1 }), baseConv(), baseRel())
    expect(result.runtime.engagement).toBe(0)
  })

  it("applies delta to emotional.valence", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "mood_drop", condition: "", target: "emotional.valence", delta: -0.08, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "correction_needed", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel())
    expect(result.runtime.emotional.valence).toBeCloseTo(-0.08)
  })

  it("clamps valence to -1", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "big_mood_drop", condition: "", target: "emotional.valence", delta: -2, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "correction_needed", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel())
    expect(result.runtime.emotional.valence).toBe(-1)
  })

  it("applies delta to relationship trust", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "trust_up", condition: "", target: "trust", delta: 0.04, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "positive_sentiment", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel({ trust: 0.3 }))
    expect(result.relationship.trust).toBeCloseTo(0.34)
  })

  it("applies delta to relationship familiarity", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "fam_up", condition: "", target: "familiarity", delta: 0.05, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "openness", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel())
    expect(result.relationship.familiarity).toBeCloseTo(0.05)
  })

  it("applies delta to comfort", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "comfort_down", condition: "", target: "comfort", delta: -0.05, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "hesitation", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel({ comfort: 0.4 }))
    expect(result.relationship.comfort).toBeCloseTo(0.35)
  })

  it("applies multiple matching rules in order", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "r1", condition: "", target: "engagement", delta: -0.1, description: "" },
        () => true,
      ),
      createRuleEvaluator(
        { id: "r2", condition: "", target: "socialOpenness", delta: 0.05, description: "" },
        () => true,
      ),
    ]
    const result = applyMutations(evaluators, { type: "question", intensity: 0.5 }, baseRuntime({ engagement: 0.5, socialOpenness: 0.5 }), baseConv(), baseRel())
    expect(result.appliedRules).toEqual(["r1", "r2"])
    expect(result.runtime.engagement).toBeCloseTo(0.4)
    expect(result.runtime.socialOpenness).toBeCloseTo(0.55)
  })

  it("skips non-matching rules", () => {
    const evaluators = [
      createRuleEvaluator(
        { id: "match", condition: "", target: "engagement", delta: -0.1, description: "" },
        () => true,
      ),
      createRuleEvaluator(
        { id: "skip", condition: "", target: "energy", delta: -0.2, description: "" },
        () => false,
      ),
    ]
    const result = applyMutations(evaluators, { type: "short_reply", intensity: 0.5 }, baseRuntime({ engagement: 0.5, energy: 0.7 }), baseConv(), baseRel())
    expect(result.appliedRules).toEqual(["match"])
    expect(result.runtime.engagement).toBeCloseTo(0.4)
    expect(result.runtime.energy).toBe(0.7)
  })

  it("does not mutate original state objects", () => {
    const original = baseRuntime({ engagement: 0.6 })
    const originalRel = baseRel({ trust: 0.5 })
    const evaluators = [
      createRuleEvaluator(
        { id: "test", condition: "", target: "engagement", delta: -0.1, description: "" },
        () => true,
      ),
    ]
    applyMutations(evaluators, { type: "short_reply", intensity: 0.5 }, original, baseConv(), originalRel)
    expect(original.engagement).toBe(0.6)
    expect(originalRel.trust).toBe(0.5)
  })
})

describe("createDefaultRules", () => {
  it("returns 11 built-in rules", () => {
    const rules = createDefaultRules()
    expect(rules).toHaveLength(11)
  })

  it("has expected rule IDs", () => {
    const rules = createDefaultRules()
    const ids = rules.map((r) => r.rule.id)
    expect(ids).toContain("short_reply_engagement_decay")
    expect(ids).toContain("silence_energy_drain")
    expect(ids).toContain("positive_sentiment_relationship_boost")
    expect(ids).toContain("frustration_trust_damage")
    expect(ids).toContain("curiosity_engagement_boost")
    expect(ids).toContain("disengagement_social_openness_drop")
    expect(ids).toContain("correction_needed_valence_drop")
    expect(ids).toContain("openness_familiarity_boost")
    expect(ids).toContain("hesitation_comfort_drop")
    expect(ids).toContain("long_conversation_social_openness_rise")
    expect(ids).toContain("low_energy_valence_drag")
  })
})

describe("default rules behavior", () => {
  it("short_reply_engagement_decay triggers on 3+ consecutive short replies", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "short_reply", intensity: 1 }, baseRuntime({ engagement: 0.6 }), baseConv({ consecutiveShortReplies: 3 }), baseRel())
    expect(result.appliedRules).toContain("short_reply_engagement_decay")
    expect(result.runtime.engagement).toBeLessThan(0.6)
  })

  it("short_reply_engagement_decay does not trigger on 1 short reply", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "short_reply", intensity: 1 }, baseRuntime({ engagement: 0.6 }), baseConv({ consecutiveShortReplies: 1 }), baseRel())
    expect(result.appliedRules).not.toContain("short_reply_engagement_decay")
    expect(result.runtime.engagement).toBe(0.6)
  })

  it("silence_energy_drain triggers on high intensity silence", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "silence", intensity: 0.8 }, baseRuntime({ energy: 0.7 }), baseConv(), baseRel())
    expect(result.appliedRules).toContain("silence_energy_drain")
    expect(result.runtime.energy).toBeLessThan(0.7)
  })

  it("positive_sentiment_relationship_boost triggers on positive sentiment", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "positive_sentiment", intensity: 0.5 }, baseRuntime(), baseConv(), baseRel({ trust: 0.3 }))
    expect(result.appliedRules).toContain("positive_sentiment_relationship_boost")
    expect(result.relationship.trust).toBeGreaterThan(0.3)
  })

  it("frustration_trust_damage triggers on frustration", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "frustration", intensity: 0.6 }, baseRuntime(), baseConv(), baseRel({ trust: 0.5 }))
    expect(result.appliedRules).toContain("frustration_trust_damage")
    expect(result.relationship.trust).toBeLessThan(0.5)
  })

  it("curiosity_engagement_boost triggers on curiosity", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "curiosity", intensity: 0.5 }, baseRuntime({ engagement: 0.5 }), baseConv(), baseRel())
    expect(result.appliedRules).toContain("curiosity_engagement_boost")
    expect(result.runtime.engagement).toBeGreaterThan(0.5)
  })

  it("long_conversation_social_openness_rise triggers after 10 turns", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "question", intensity: 0.5 }, baseRuntime({ socialOpenness: 0.5 }), baseConv({ turnCount: 12 }), baseRel())
    expect(result.appliedRules).toContain("long_conversation_social_openness_rise")
    expect(result.runtime.socialOpenness).toBeGreaterThan(0.5)
  })

  it("low_energy_valence_drag triggers when energy is low", () => {
    const rules = createDefaultRules()
    const result = applyMutations(rules, { type: "question", intensity: 0.5 }, baseRuntime({ emotional: { valence: 0, arousal: 0.3, dominance: 0.3 }, energy: 0.1 }), baseConv(), baseRel())
    expect(result.appliedRules).toContain("low_energy_valence_drag")
    expect(result.runtime.emotional.valence).toBeLessThan(0)
  })
})
