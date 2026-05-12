import { describe, it, expect } from "vitest"
import type {
  RuntimeState,
  RelationshipState,
  ConversationState,
  BehavioralPolicy,
  PersonaConfig,
} from "./types"
import {
  runCognitivePipeline,
  type CognitivePipelineInput,
} from "./orchestrator"
import { createMemoryStore } from "./memory"
import { type RuleEvaluator } from "./mutation"

function baseConfig(overrides?: Partial<PersonaConfig>): PersonaConfig {
  return {
    name: "test-tutor",
    traits: ["patient", "encouraging"],
    speakingStyle: "conversational",
    baseTone: "friendly",
    coreValues: ["help", "learn"],
    attachmentStyle: "secure",
    initiativeBias: 0.5,
    humorStyle: "warm",
    conflictStyle: "diplomatic",
    teachingStyle: "socratic",
    socialBoundaries: "casual",
    ...overrides,
  }
}

function baseRuntime(overrides?: Partial<RuntimeState>): RuntimeState {
  return {
    emotional: { valence: 0, arousal: 0.5, dominance: 0.5 },
    energy: 0.7,
    engagement: 0.5,
    socialOpenness: 0.5,
    ...overrides,
  }
}

function baseRelationship(overrides?: Partial<RelationshipState>): RelationshipState {
  return {
    familiarity: 0.3,
    trust: 0.3,
    comfort: 0.3,
    humorAcceptance: 0.3,
    ...overrides,
  }
}

function baseConv(overrides?: Partial<ConversationState>): ConversationState {
  return {
    turnCount: 5,
    lastUserMessageLength: 15,
    consecutiveShortReplies: 0,
    userTopicChanges: 1,
    sessionDurationMinutes: 3,
    ...overrides,
  }
}

function basePolicy(overrides?: Partial<BehavioralPolicy>): BehavioralPolicy {
  return {
    correctionStyle: "gentle",
    initiativeLevel: 0.5,
    humorLevel: 0.5,
    verbosity: 0.5,
    responsePacing: "moderate",
    interruptTolerance: 0.5,
    emotionalMirroring: 0.5,
    topicPersistence: 0.5,
    tone: "warm",
    ...overrides,
  }
}

function buildInput(overrides?: Partial<CognitivePipelineInput>): CognitivePipelineInput {
  return {
    signal: { type: "long_reply", intensity: 0.7 },
    runtime: baseRuntime(),
    relationship: baseRelationship(),
    conversation: baseConv(),
    memory: createMemoryStore(),
    policy: basePolicy(),
    config: baseConfig(),
    ...overrides,
  }
}

describe("runCognitivePipeline", () => {
  it("returns a complete CognitivePipelineResult", () => {
    const result = runCognitivePipeline(buildInput())
    expect(result).toHaveProperty("runtime")
    expect(result).toHaveProperty("relationship")
    expect(result).toHaveProperty("conversation")
    expect(result).toHaveProperty("memory")
    expect(result).toHaveProperty("modulation")
    expect(result).toHaveProperty("appliedRules")
    expect(result).toHaveProperty("needsIntervention")
    expect(result).toHaveProperty("isEstablished")
    expect(result).toHaveProperty("memoryEvent")
  })

  it("increments turnCount in conversation", () => {
    const input = buildInput({ conversation: baseConv({ turnCount: 5 }) })
    const result = runCognitivePipeline(input)
    expect(result.conversation.turnCount).toBe(6)
  })

  it("processes emotional effects from signal", () => {
    const result = runCognitivePipeline(buildInput({ signal: { type: "positive_sentiment", intensity: 0.8 } }))
    expect(result.runtime.emotional.valence).toBeGreaterThan(0)
    expect(result.runtime.socialOpenness).toBeGreaterThan(0.5)
  })

  it("processes relationship effects from signal", () => {
    const result = runCognitivePipeline(buildInput({ signal: { type: "positive_sentiment", intensity: 0.8 } }))
    expect(result.relationship.familiarity).toBeGreaterThan(0.3)
    expect(result.relationship.trust).toBeGreaterThan(0.3)
  })

  it("applies mutation rules and returns them", () => {
    const conv = baseConv({ consecutiveShortReplies: 5 })
    const result = runCognitivePipeline(buildInput({
      signal: { type: "short_reply", intensity: 1 },
      conversation: conv,
    }))
    expect(result.appliedRules.length).toBeGreaterThanOrEqual(1)
    expect(result.appliedRules).toContain("short_reply_engagement_decay")
  })

  it("extracts memory event from user message", () => {
    const result = runCognitivePipeline(buildInput({
      userMessage: "I really love learning new languages",
    }))
    expect(result.memoryEvent).not.toBeNull()
    expect(result.memoryEvent?.category).toBe("user_preference")
  })

  it("stores extracted memory in memory store", () => {
    const result = runCognitivePipeline(buildInput({
      userMessage: "I really love learning new languages",
    }))
    expect(result.memory.events.length).toBeGreaterThanOrEqual(1)
  })

  it("produces valid ModulationOutput", () => {
    const result = runCognitivePipeline(buildInput())
    expect(result.modulation.verbosity).toBeGreaterThanOrEqual(0)
    expect(result.modulation.verbosity).toBeLessThanOrEqual(1)
    expect(typeof result.modulation.shouldInterrupt).toBe("boolean")
  })

  it("sets needsIntervention when engagement is critically low", () => {
    const result = runCognitivePipeline(buildInput({
      runtime: baseRuntime({ engagement: 0.1 }),
    }))
    expect(result.needsIntervention).toBe(true)
  })

  it("sets isEstablished when relationship quality is sufficient", () => {
    const rel = baseRelationship({ familiarity: 0.5, trust: 0.5, comfort: 0.5, humorAcceptance: 0.5 })
    const result = runCognitivePipeline(buildInput({ relationship: rel }))
    expect(result.isEstablished).toBe(true)
  })

  it("does not mutate input state", () => {
    const runtime = baseRuntime()
    const rel = baseRelationship()
    const conv = baseConv()
    const input = buildInput({ runtime, relationship: rel, conversation: conv })
    runCognitivePipeline(input)
    expect(runtime.engagement).toBe(0.5)
    expect(rel.familiarity).toBe(0.3)
    expect(conv.turnCount).toBe(5)
  })

  it("accepts custom evaluators", () => {
    const customRule = {
      id: "custom_test_rule",
      condition: "always true",
      target: "engagement",
      delta: 0.5,
      description: "Custom test rule",
    }
    const customEvaluators: RuleEvaluator[] = [{
      rule: customRule,
      evaluate: () => true,
    }]
    const result = runCognitivePipeline(buildInput({ evaluators: customEvaluators }))
    expect(result.appliedRules).toContain("custom_test_rule")
    expect(result.runtime.engagement).toBeGreaterThan(0.5)
  })

  it("applies decay to runtime state", () => {
    const result = runCognitivePipeline(buildInput({
      conversation: baseConv({ sessionDurationMinutes: 10 }),
      signal: { type: "silence", intensity: 0.5 },
    }))
    expect(result.conversation.sessionDurationMinutes).toBeGreaterThan(10)
  })

  it("handles negative_sentiment signal correctly", () => {
    const result = runCognitivePipeline(buildInput({ signal: { type: "negative_sentiment", intensity: 0.6 } }))
    expect(result.runtime.emotional.valence).toBeLessThan(0)
    expect(result.relationship.trust).toBeLessThan(0.3)
    expect(result.relationship.comfort).toBeLessThan(0.3)
  })

  it("triggers initiative on silence signal with session history", () => {
    const result = runCognitivePipeline(buildInput({
      signal: { type: "silence", intensity: 0.5 },
      conversation: baseConv({ sessionDurationMinutes: 2 }),
    }))
    expect(result.modulation.initiative).toBeGreaterThan(0)
  })
})
