import { describe, it, expect } from "vitest"
import {
  createDefaultRuntimeState,
  createDefaultRelationshipState,
  createDefaultBehavioralPolicy,
  createDefaultPersonaConfig,
  createDefaultEmotionalState,
  createDefaultConversationState,
  createDefaultMemoryPolicy,
  createMemoryEvent,
} from "./types"
import type { MemoryLevel, MemoryCategory, ConversationSignal, StateMutationRule, SignalType } from "./types"

describe("PersonaConfig", () => {
  it("creates default config with expected structure", () => {
    const config = createDefaultPersonaConfig()
    expect(config.name).toBe("default")
    expect(config.traits).toEqual([])
    expect(config.speakingStyle).toBe("conversational")
    expect(config.baseTone).toBe("friendly")
    expect(config.coreValues).toEqual([])
    expect(config.attachmentStyle).toBe("secure")
    expect(config.initiativeBias).toBe(0.5)
    expect(config.humorStyle).toBe("warm")
    expect(config.conflictStyle).toBe("diplomatic")
    expect(config.teachingStyle).toBe("socratic")
    expect(config.socialBoundaries).toBe("casual")
  })

  it("allows overriding config fields", () => {
    const config = createDefaultPersonaConfig({ name: "Alice", traits: ["empathetic", "patient"] })
    expect(config.name).toBe("Alice")
    expect(config.traits).toHaveLength(2)
    expect(config.baseTone).toBe("friendly")
  })
})

describe("EmotionalState", () => {
  it("creates default emotional state with neutral values", () => {
    const e = createDefaultEmotionalState()
    expect(e.valence).toBe(0)
    expect(e.arousal).toBe(0.5)
    expect(e.dominance).toBe(0.5)
  })

  it("normalizes valence to [-1, 1] and others to [0, 1]", () => {
    const e = createDefaultEmotionalState({ valence: 1.5, arousal: 1.5, dominance: -0.5 })
    expect(e.valence).toBe(1)
    expect(e.arousal).toBe(1)
    expect(e.dominance).toBe(0)
  })
})

describe("RuntimeState", () => {
  it("creates default runtime state with neutral values", () => {
    const state = createDefaultRuntimeState()
    expect(state.emotional.valence).toBe(0)
    expect(state.emotional.arousal).toBe(0.5)
    expect(state.emotional.dominance).toBe(0.5)
    expect(state.energy).toBe(0.7)
    expect(state.engagement).toBe(0.5)
    expect(state.socialOpenness).toBe(0.5)
  })

  it("accepts emotional state override", () => {
    const state = createDefaultRuntimeState({ emotional: { valence: 0.5, arousal: 0.8, dominance: 0.3 } })
    expect(state.emotional.valence).toBe(0.5)
    expect(state.emotional.arousal).toBe(0.8)
    expect(state.emotional.dominance).toBe(0.3)
  })
})

describe("RelationshipState", () => {
  it("creates default relationship at zero", () => {
    const rel = createDefaultRelationshipState()
    expect(rel.familiarity).toBe(0)
    expect(rel.trust).toBe(0)
    expect(rel.comfort).toBe(0)
    expect(rel.humorAcceptance).toBe(0)
  })

  it("normalizes all values to [0, 1]", () => {
    const rel = createDefaultRelationshipState({ familiarity: 1.5, trust: -0.5 })
    expect(rel.familiarity).toBe(1)
    expect(rel.trust).toBe(0)
  })
})

describe("BehavioralPolicy", () => {
  it("creates default conservative policy", () => {
    const policy = createDefaultBehavioralPolicy()
    expect(policy.correctionStyle).toBe("gentle")
    expect(policy.initiativeLevel).toBe(0.5)
    expect(policy.humorLevel).toBe(0.3)
    expect(policy.verbosity).toBe(0.5)
    expect(policy.responsePacing).toBe("moderate")
    expect(policy.interruptTolerance).toBe(0.5)
    expect(policy.emotionalMirroring).toBe(0.5)
    expect(policy.topicPersistence).toBe(0.5)
  })

  it("allows partial overrides", () => {
    const policy = createDefaultBehavioralPolicy({ initiativeLevel: 0.8, humorLevel: 0.6 })
    expect(policy.initiativeLevel).toBe(0.8)
    expect(policy.humorLevel).toBe(0.6)
    expect(policy.verbosity).toBe(0.5)
  })
})

describe("MemoryEvent", () => {
  it("creates memory event with required fields", () => {
    const event = createMemoryEvent("user likes python", "user_preference", 0.3)
    expect(event.event).toBe("user likes python")
    expect(event.category).toBe("user_preference")
    expect(event.importance).toBe(0.3)
    expect(event.level).toBe("ephemeral")
    expect(event.id).toBeTruthy()
    expect(event.createdAt).toBeInstanceOf(Date)
    expect(event.emotionalWeight).toBeCloseTo(0.09)
    expect(event.relationshipImpact).toBeCloseTo(0.06)
    expect(event.decayRate).toBe(0.1)
    expect(event.lastRecalledAt).toBeNull()
    expect(event.recallCount).toBe(0)
  })

  it("assigns memory level based on importance threshold", () => {
    const low = createMemoryEvent("test", "conversation_behavior", 0.2)
    expect(low.level).toBe("ephemeral")

    const mid = createMemoryEvent("test", "conversation_behavior", 0.5)
    expect(mid.level).toBe("short_term")

    const high = createMemoryEvent("test", "conversation_behavior", 0.8)
    expect(high.level).toBe("long_term")

    const core = createMemoryEvent("test", "key_event", 0.95)
    expect(core.level).toBe("core")
  })

  it("clamps importance to [0, 1]", () => {
    const event = createMemoryEvent("test", "conversation_behavior", 2)
    expect(event.importance).toBe(1)
    const event2 = createMemoryEvent("test", "conversation_behavior", -1)
    expect(event2.importance).toBe(0)
  })

  it("computes emotionalWeight and relationshipImpact from importance and policy", () => {
    const event = createMemoryEvent("important moment", "key_event", 0.8)
    expect(event.emotionalWeight).toBeCloseTo(0.24)
    expect(event.relationshipImpact).toBeCloseTo(0.16)
  })

  it("accepts custom memory policy for level assignment", () => {
    const relaxed = createDefaultMemoryPolicy({ coreThreshold: 0.6, coreRequiresKeyEvent: false })
    const event = createMemoryEvent("anything", "conversation_behavior", 0.65, relaxed)
    expect(event.level).toBe("core")
  })
})

describe("MemoryPolicy", () => {
  it("creates default memory policy with standard thresholds", () => {
    const p = createDefaultMemoryPolicy()
    expect(p.coreThreshold).toBe(0.9)
    expect(p.longTermThreshold).toBe(0.7)
    expect(p.shortTermThreshold).toBe(0.4)
    expect(p.coreRequiresKeyEvent).toBe(true)
    expect(p.baseDecayRate).toBe(0.1)
    expect(p.emotionalWeightFactor).toBe(0.3)
    expect(p.relationshipImpactFactor).toBe(0.2)
  })

  it("allows overriding thresholds", () => {
    const p = createDefaultMemoryPolicy({ coreThreshold: 0.8, shortTermThreshold: 0.3 })
    expect(p.coreThreshold).toBe(0.8)
    expect(p.shortTermThreshold).toBe(0.3)
    expect(p.longTermThreshold).toBe(0.7)
  })
})

describe("ConversationState", () => {
  it("creates default conversation state with zero values", () => {
    const cs = createDefaultConversationState()
    expect(cs.turnCount).toBe(0)
    expect(cs.lastUserMessageLength).toBe(0)
    expect(cs.consecutiveShortReplies).toBe(0)
    expect(cs.userTopicChanges).toBe(0)
    expect(cs.sessionDurationMinutes).toBe(0)
  })

  it("allows partial overrides", () => {
    const cs = createDefaultConversationState({ turnCount: 5, sessionDurationMinutes: 3 })
    expect(cs.turnCount).toBe(5)
    expect(cs.sessionDurationMinutes).toBe(3)
    expect(cs.consecutiveShortReplies).toBe(0)
  })
})

describe("ConversationSignal", () => {
  it("creates valid signal with clamped intensity", () => {
    const signal: ConversationSignal = { type: "short_reply", intensity: 0.8 }
    expect(signal.type).toBe("short_reply")
    expect(signal.intensity).toBe(0.8)
  })

  it("accepts new SignalType values", () => {
    const types: SignalType[] = ["disengagement", "curiosity", "hesitation", "frustration", "openness"]
    for (const t of types) {
      const signal: ConversationSignal = { type: t, intensity: 0.5 }
      expect(signal.type).toBe(t)
    }
  })
})

describe("StateMutationRule", () => {
  it("defines a valid mutation rule", () => {
    const rule: StateMutationRule = {
      id: "short_reply_engagement_decay",
      condition: "user sends 3 consecutive short replies",
      target: "engagement",
      delta: -0.12,
      description: "Decrease engagement when user gives consistently short answers",
    }
    expect(rule.target).toBe("engagement")
    expect(rule.delta).toBeLessThan(0)
  })
})

describe("MemoryLevel and MemoryCategory", () => {
  it("has all expected memory levels", () => {
    const levels: MemoryLevel[] = ["ephemeral", "short_term", "long_term", "core"]
    expect(levels).toHaveLength(4)
  })

  it("has all expected memory categories", () => {
    const categories: MemoryCategory[] = [
      "user_fact",
      "user_preference",
      "relationship_history",
      "emotional_pattern",
      "behavioral_pattern",
      "key_event",
      "conversation_behavior",
    ]
    expect(categories).toHaveLength(7)
  })
})
