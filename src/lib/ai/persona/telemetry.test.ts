import { describe, it, expect, beforeEach } from "vitest"
import {
  snapshotState,
  recordPipelineLatency,
  recordMutationRuleFired,
  recordMemoryVolume,
  recordStateChange,
  getTelemetrySummary,
  getPipelineLatency,
  getMutationRuleFires,
  getMemoryVolumes,
  getStateChanges,
  resetTelemetry,
} from "./telemetry"
import { PersonaAgent } from "./persona"
import { createDefaultRuntimeState, createDefaultRelationshipState, createDefaultConversationState, createDefaultPersonaConfig } from "./types"

function baseRuntime() {
  return createDefaultRuntimeState({ emotional: { valence: 0.5, arousal: 0.6, dominance: 0.4 } })
}

function baseRelationship() {
  return createDefaultRelationshipState({ familiarity: 0.3, trust: 0.2 })
}

function baseConversation(turnCount = 5) {
  return createDefaultConversationState({ turnCount, consecutiveShortReplies: 1, userTopicChanges: 2, sessionDurationMinutes: 3 })
}

beforeEach(() => {
  resetTelemetry()
})

describe("snapshotState", () => {
  it("captures runtime, relationship, conversation, and memory count", () => {
    const rt = baseRuntime()
    const rel = baseRelationship()
    const conv = baseConversation()
    const snap = snapshotState(rt, rel, conv, 5)

    expect(snap.runtime.emotional.valence).toBe(0.5)
    expect(snap.runtime.emotional.arousal).toBe(0.6)
    expect(snap.runtime.engagement).toBe(0.5)
    expect(snap.relationship.familiarity).toBe(0.3)
    expect(snap.relationship.trust).toBe(0.2)
    expect(snap.conversation.turnCount).toBe(5)
    expect(snap.conversation.consecutiveShortReplies).toBe(1)
    expect(snap.conversation.userTopicChanges).toBe(2)
    expect(snap.memoryEventCount).toBe(5)
  })
})

describe("recordPipelineLatency", () => {
  it("records and retrieves pipeline latency", () => {
    recordPipelineLatency("s1", 1, 12.5)
    recordPipelineLatency("s1", 2, 8.3)

    const all = getPipelineLatency()
    expect(all).toHaveLength(2)
    expect(all[0].durationMs).toBe(12.5)
    expect(all[1].durationMs).toBe(8.3)
  })

  it("filters by sessionId", () => {
    recordPipelineLatency("s1", 1, 10)
    recordPipelineLatency("s2", 1, 20)

    const s1 = getPipelineLatency("s1")
    expect(s1).toHaveLength(1)
    expect(s1[0].durationMs).toBe(10)
  })

  it("caps at MAX_RECORDS", () => {
    for (let i = 0; i < 1010; i++) {
      recordPipelineLatency("s1", i, 1)
    }
    const all = getPipelineLatency()
    expect(all.length).toBeLessThanOrEqual(1000)
  })
})

describe("recordMutationRuleFired", () => {
  it("records and retrieves mutation rule fires", () => {
    recordMutationRuleFired("s1", "short_reply_engagement_decay", 3)
    recordMutationRuleFired("s1", "silence_energy_drain", 4)

    const all = getMutationRuleFires()
    expect(all).toHaveLength(2)
    expect(all[0].ruleId).toBe("short_reply_engagement_decay")
    expect(all[1].ruleId).toBe("silence_energy_drain")
  })
})

describe("recordMemoryVolume", () => {
  it("records memory volume snapshots", () => {
    recordMemoryVolume("s1", "user_preference", 2, 10)
    recordMemoryVolume("s1", "key_event", 1, 10)

    const all = getMemoryVolumes()
    expect(all).toHaveLength(2)
    expect(all[0].category).toBe("user_preference")
    expect(all[0].categoryCount).toBe(2)
    expect(all[0].totalEvents).toBe(10)
  })
})

describe("recordStateChange", () => {
  it("records state change diff", () => {
    const before = snapshotState(baseRuntime(), baseRelationship(), baseConversation(), 3)
    const rt = baseRuntime()
    rt.engagement = 0.8
    const after = snapshotState(rt, baseRelationship(), baseConversation(6), 4)

    recordStateChange("s1", 5, before, after)

    const changes = getStateChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0].turnNumber).toBe(5)
    expect(changes[0].before.runtime.engagement).toBe(0.5)
    expect(changes[0].after.runtime.engagement).toBe(0.8)
  })
})

describe("getTelemetrySummary", () => {
  it("returns zero summary when no data", () => {
    const summary = getTelemetrySummary()
    expect(summary.totalPipelines).toBe(0)
    expect(summary.avgLatencyMs).toBe(0)
    expect(summary.maxLatencyMs).toBe(0)
    expect(summary.sessionsTracked).toBe(0)
  })

  it("aggregates all telemetry data", () => {
    recordPipelineLatency("s1", 1, 10)
    recordPipelineLatency("s1", 2, 20)
    recordPipelineLatency("s2", 1, 30)
    recordMutationRuleFired("s1", "rule_a", 1)
    recordMutationRuleFired("s1", "rule_a", 2)
    recordMutationRuleFired("s2", "rule_b", 1)
    recordMemoryVolume("s1", "user_preference", 2, 5)
    recordMemoryVolume("s1", "key_event", 1, 5)

    const summary = getTelemetrySummary()
    expect(summary.totalPipelines).toBe(3)
    expect(summary.avgLatencyMs).toBe(20)
    expect(summary.maxLatencyMs).toBe(30)
    expect(summary.mutationFiresByRule).toEqual({ rule_a: 2, rule_b: 1 })
    expect(summary.memoryEventsByCategory).toEqual({ user_preference: 2, key_event: 1 })
    expect(summary.totalStateChanges).toBe(0)
    expect(summary.sessionsTracked).toBe(2)
  })
})

describe("PersonaAgent telemetry integration", () => {
  it("records telemetry when sessionId is passed to processTurn", () => {
    const agent = new PersonaAgent(createDefaultPersonaConfig({ name: "telemetry-test" }))
    agent.processTurn({
      signal: { type: "long_reply", intensity: 0.7 },
      userMessage: "I love learning new languages",
      sessionId: "tel-s1",
    })

    const summary = getTelemetrySummary()
    expect(summary.totalPipelines).toBe(1)
    expect(summary.totalStateChanges).toBe(1)
    expect(summary.sessionsTracked).toBe(1)

    const latencies = getPipelineLatency("tel-s1")
    expect(latencies).toHaveLength(1)
    expect(latencies[0].turnNumber).toBe(1)
  })

  it("does not record telemetry when sessionId is absent", () => {
    resetTelemetry()
    const agent = new PersonaAgent(createDefaultPersonaConfig({ name: "no-telemetry" }))
    agent.processTurn({
      signal: { type: "long_reply", intensity: 0.7 },
      userMessage: "Hello world",
    })

    const summary = getTelemetrySummary()
    expect(summary.totalPipelines).toBe(0)
  })
})
