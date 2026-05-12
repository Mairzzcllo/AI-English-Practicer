import { describe, it, expect } from "vitest"
import type { RuntimeState, ConversationState } from "./types"
import {
  processSignal,
  applyDecay,
  needsIntervention,
  isEngaged,
  updateConversationFromSignal,
  applyConversationDecay,
  updateUserMessageLength,
} from "./state"

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

function baseState(overrides?: Partial<RuntimeState>): RuntimeState {
  return {
    emotional: { valence: 0, arousal: 0.5, dominance: 0.5 },
    energy: 0.7,
    engagement: 0.5,
    socialOpenness: 0.5,
    ...overrides,
  }
}

describe("processSignal", () => {
  it("decreases engagement on short_reply", () => {
    const result = processSignal(baseState({ engagement: 0.6 }), { type: "short_reply", intensity: 1 })
    expect(result.engagement).toBeLessThan(0.6)
  })

  it("increases engagement on question", () => {
    const result = processSignal(baseState({ engagement: 0.5 }), { type: "question", intensity: 0.8 })
    expect(result.engagement).toBeGreaterThan(0.5)
  })

  it("increases valence on positive_sentiment", () => {
    const result = processSignal(baseState(), { type: "positive_sentiment", intensity: 0.6 })
    expect(result.emotional.valence).toBeGreaterThan(0)
  })

  it("decreases valence on negative_sentiment", () => {
    const result = processSignal(baseState(), { type: "negative_sentiment", intensity: 0.5 })
    expect(result.emotional.valence).toBeLessThan(0)
  })

  it("scales effect by intensity", () => {
    const low = processSignal(baseState({ engagement: 0.5 }), { type: "short_reply", intensity: 0.1 })
    const high = processSignal(baseState({ engagement: 0.5 }), { type: "short_reply", intensity: 1 })
    expect(low.engagement).toBeGreaterThan(high.engagement)
  })

  it("does not mutate original state", () => {
    const original = baseState()
    processSignal(original, { type: "silence", intensity: 0.5 })
    expect(original.engagement).toBe(0.5)
  })

  it("handles interruption signal", () => {
    const result = processSignal(baseState({ engagement: 0.6 }), { type: "interruption", intensity: 0.7 })
    expect(result.engagement).toBeLessThan(0.6)
    expect(result.emotional.valence).toBeLessThan(0)
  })

  it("increases socialOpenness on positive_sentiment", () => {
    const result = processSignal(baseState({ socialOpenness: 0.5 }), { type: "positive_sentiment", intensity: 0.8 })
    expect(result.socialOpenness).toBeGreaterThan(0.5)
  })

  it("handles new signal types", () => {
    const result = processSignal(baseState(), { type: "curiosity", intensity: 0.8 })
    expect(result.emotional.arousal).toBeGreaterThan(0.5)
    expect(result.engagement).toBeGreaterThan(0.5)
  })
})

describe("applyDecay", () => {
  it("decays energy over time", () => {
    const result = applyDecay(baseState({ energy: 0.7 }), 10)
    expect(result.energy).toBeLessThan(0.7)
  })

  it("does not change emotional state during decay", () => {
    const result = applyDecay(baseState(), 10)
    expect(result.emotional.valence).toBe(0)
  })

  it("does not clamp energy below 0", () => {
    const result = applyDecay(baseState({ energy: 0 }), 100)
    expect(result.energy).toBe(0)
  })
})

describe("needsIntervention", () => {
  it("returns true when engagement is critically low", () => {
    expect(needsIntervention(baseState({ engagement: 0.15 }))).toBe(true)
  })

  it("returns false for healthy engagement", () => {
    expect(needsIntervention(baseState({ engagement: 0.5 }))).toBe(false)
  })

  it("returns true when energy is depleted", () => {
    expect(needsIntervention(baseState({ energy: 0.1 }))).toBe(true)
  })

  it("returns true when valence is very negative", () => {
    expect(needsIntervention(baseState({ emotional: { valence: -0.8, arousal: 0.5, dominance: 0.5 } }))).toBe(true)
  })
})

describe("isEngaged", () => {
  it("returns true when engagement is above threshold", () => {
    expect(isEngaged(baseState({ engagement: 0.4 }))).toBe(true)
  })

  it("returns false when engagement is low", () => {
    expect(isEngaged(baseState({ engagement: 0.2 }))).toBe(false)
  })
})

describe("updateConversationFromSignal", () => {
  it("increments turnCount on any signal", () => {
    const result = updateConversationFromSignal(baseConv(), { type: "short_reply", intensity: 1 })
    expect(result.turnCount).toBe(1)
  })

  it("increments consecutiveShortReplies on short_reply signal", () => {
    const r1 = updateConversationFromSignal(baseConv(), { type: "short_reply", intensity: 1 })
    expect(r1.consecutiveShortReplies).toBe(1)
    const r2 = updateConversationFromSignal(r1, { type: "short_reply", intensity: 1 })
    expect(r2.consecutiveShortReplies).toBe(2)
  })

  it("resets consecutiveShortReplies on long reply signal", () => {
    const conv = baseConv({ consecutiveShortReplies: 3 })
    const result = updateConversationFromSignal(conv, { type: "long_reply", intensity: 1 }, 20)
    expect(result.consecutiveShortReplies).toBe(0)
  })

  it("treats short word count as short reply", () => {
    const result = updateConversationFromSignal(baseConv(), { type: "long_reply", intensity: 1 }, 3)
    expect(result.consecutiveShortReplies).toBe(1)
  })

  it("increments userTopicChanges on openness signal", () => {
    const r1 = updateConversationFromSignal(baseConv(), { type: "openness", intensity: 0.5 })
    expect(r1.userTopicChanges).toBe(1)
    const r2 = updateConversationFromSignal(baseConv(), { type: "curiosity", intensity: 0.5 })
    expect(r2.userTopicChanges).toBe(1)
  })

  it("does not increment userTopicChanges on neutral signals", () => {
    const result = updateConversationFromSignal(baseConv(), { type: "silence", intensity: 0.5 })
    expect(result.userTopicChanges).toBe(0)
  })
})

describe("applyConversationDecay", () => {
  it("increases session duration over time", () => {
    const result = applyConversationDecay(baseConv(), 5)
    expect(result.sessionDurationMinutes).toBe(5)
  })

  it("accumulates duration across multiple calls", () => {
    const r1 = applyConversationDecay(baseConv(), 3)
    const r2 = applyConversationDecay(r1, 7)
    expect(r2.sessionDurationMinutes).toBe(10)
  })

  it("preserves other fields during decay", () => {
    const conv = baseConv({ turnCount: 10, consecutiveShortReplies: 2 })
    const result = applyConversationDecay(conv, 5)
    expect(result.turnCount).toBe(10)
    expect(result.consecutiveShortReplies).toBe(2)
  })
})

describe("updateUserMessageLength", () => {
  it("sets lastUserMessageLength", () => {
    const result = updateUserMessageLength(baseConv(), 42)
    expect(result.lastUserMessageLength).toBe(42)
  })

  it("preserves other fields", () => {
    const conv = baseConv({ turnCount: 5, sessionDurationMinutes: 3 })
    const result = updateUserMessageLength(conv, 10)
    expect(result.turnCount).toBe(5)
    expect(result.sessionDurationMinutes).toBe(3)
  })
})
